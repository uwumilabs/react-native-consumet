#import "Consumet.h"
#import "RCConsumetSynchronyCache.h"
#import <JavaScriptCore/JavaScriptCore.h>
#import <WebKit/WebKit.h>

// Without a User-Agent header a WebView keeps WKWebView's own user agent, with
// the tokens Mobile Safari adds for this iOS version, so it matches the engine:
// Cloudflare fails a challenge whose user agent claims another browser version
// (as on Android, where the WebView keeps its own).
static NSString *RCConsumetSafariApplicationName(void) {
  NSArray<NSString *> *parts =
      [UIDevice.currentDevice.systemVersion componentsSeparatedByString:@"."];
  NSString *version =
      parts.count > 1
          ? [NSString stringWithFormat:@"%@.%@", parts[0], parts[1]]
          : parts.firstObject;
  return [NSString
      stringWithFormat:@"Version/%@ Mobile/15E148 Safari/604.1", version];
}

// Rejection codes shared with Android (see the contract in src/NativeConsumet.ts).
static NSString *const kWebViewErrorCode = @"WEBVIEW_ERROR";
static NSString *const kTimeoutCode = @"TIMEOUT";

// Timings shared with Android (WebViewTask.TIMEOUT_MS, HttpRequestModule's
// CAPTURE_DELAY_MS and POLL_MS), in seconds: a WebView request times out 30 s
// after it starts, a loaded page gets 1.5 s for its scripts to settle, and a
// page that isn't ready yet is checked again every second.
static const NSTimeInterval kWebViewTimeout = 30;
static const NSTimeInterval kCaptureDelay = 1.5;
static const NSTimeInterval kPollInterval = 1;

// The messages of the WEBVIEW_ERROR rejections that come once the page has
// loaded: it can't be read (the same message as on Android), or its web
// content process died.
static NSString *const kCaptureFailedMessage =
    @"Could not read the loaded page";
static NSString *const kContentProcessDiedMessage =
    @"WebView content process terminated";

// Synchrony walks the syntax tree recursively, and JavaScriptCore's recursion
// limit follows the stack of the thread it runs on: a GCD worker's 512 KB
// stack overflows on scripts Android handles. Same as Android's
// Synchrony.THREAD_STACK_BYTES.
static const NSUInteger kSynchronyThreadStackBytes = 8 * 1024 * 1024;

static dispatch_time_t RCConsumetAfter(NSTimeInterval seconds) {
  return dispatch_time(DISPATCH_TIME_NOW, (int64_t)(seconds * NSEC_PER_SEC));
}

/**
 * One in-memory website data store for every request this module makes.
 * Cookies (such as a passed Cloudflare challenge) carry over between calls,
 * as they do with Android's CookieManager, but nothing is written to disk and
 * the host app's own WKWebView data (defaultDataStore) is never read or
 * changed. Main thread only.
 */
static WKWebsiteDataStore *RCConsumetDataStore(void) {
  static WKWebsiteDataStore *store;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    store = [WKWebsiteDataStore nonPersistentDataStore];
  });
  return store;
}

/**
 * The cookies a browser would send to `url`: RFC 6265 domain, path, secure
 * and expiry matching, the same filter Android's CookieManager.getCookie(url)
 * applies.
 */
static NSArray<NSHTTPCookie *> *
RCConsumetCookiesForURL(NSArray<NSHTTPCookie *> *cookies, NSURL *url) {
  NSString *host = url.host.lowercaseString;
  if (!host.length)
    return @[];
  NSString *path = url.path.length ? url.path : @"/";
  BOOL isHTTPS = [url.scheme caseInsensitiveCompare:@"https"] == NSOrderedSame;
  NSDate *now = [NSDate date];

  NSMutableArray<NSHTTPCookie *> *matched = [NSMutableArray array];
  for (NSHTTPCookie *c in cookies) {
    if (c.expiresDate && [c.expiresDate compare:now] != NSOrderedDescending)
      continue;
    if (c.isSecure && !isHTTPS)
      continue;

    // A leading dot marks a domain cookie (host and subdomains); without it
    // the cookie is host-only.
    NSString *domain = c.domain.lowercaseString;
    BOOL isDomainCookie = [domain hasPrefix:@"."];
    NSString *bare = isDomainCookie ? [domain substringFromIndex:1] : domain;
    BOOL domainMatches =
        [host isEqualToString:bare] ||
        (isDomainCookie &&
         [host hasSuffix:[@"." stringByAppendingString:bare]]);
    if (!domainMatches)
      continue;

    NSString *cookiePath = c.path.length ? c.path : @"/";
    BOOL pathMatches =
        [path isEqualToString:cookiePath] ||
        ([path hasPrefix:cookiePath] &&
         ([cookiePath hasSuffix:@"/"] ||
          [path characterAtIndex:cookiePath.length] == '/'));
    if (!pathMatches)
      continue;

    [matched addObject:c];
  }
  return matched;
}

static NSString *RCConsumetCookieHeader(NSArray<NSHTTPCookie *> *cookies) {
  NSMutableArray<NSString *> *parts =
      [NSMutableArray arrayWithCapacity:cookies.count];
  for (NSHTTPCookie *c in cookies) {
    [parts addObject:[NSString stringWithFormat:@"%@=%@", c.name, c.value]];
  }
  return [parts componentsJoinedByString:@"; "];
}

/**
 * Reads the cookies in `webView`'s data store that apply to `urlStr` and
 * passes them on with their Cookie header string, as Android does with
 * CookieManager.getCookie(url).
 */
static void RCConsumetReadCookies(
    WKWebView *webView, NSString *urlStr,
    void (^completion)(NSArray<NSHTTPCookie *> *cookies, NSString *header)) {
  NSURL *url = [NSURL URLWithString:urlStr];
  [[webView.configuration.websiteDataStore httpCookieStore]
      getAllCookies:^(NSArray<NSHTTPCookie *> *all) {
        NSArray<NSHTTPCookie *> *matched = RCConsumetCookiesForURL(all, url);
        completion(matched, RCConsumetCookieHeader(matched));
      }];
}

#pragma mark - RCConsumetWebTask

@class RCConsumetWebTask;

/// Called once, when the main document first finishes loading. Settles the
/// task with -resolve: or -rejectWithCode:message:, at once or after polling
/// the page.
typedef void (^RCConsumetWebTaskFinish)(RCConsumetWebTask *task,
                                        WKWebView *webView);

/**
 * One hidden WKWebView load for a promise-returning request: the iOS
 * counterpart of Android's WebViewTask, following the contract in
 * src/NativeConsumet.ts. Main thread only.
 *
 * The promise settles exactly once:
 * - onFinish runs once, when the main document first finishes loading. Load
 *   errors after that are ignored.
 * - A main-frame load error rejects with WEBVIEW_ERROR. Failed sub-resources
 *   never reach the navigation delegate.
 * - A web content process that terminates rejects with WEBVIEW_ERROR,
 *   whenever it happens.
 * - No settled promise within kWebViewTimeout of loading rejects with TIMEOUT,
 *   whatever onFinish is still waiting for (a page script that never returns,
 *   say).
 * A task keeps itself alive until it settles, then releases its WebView.
 */
@interface RCConsumetWebTask : NSObject <WKNavigationDelegate>
- (instancetype)initWithResolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject;
@property(nonatomic, copy, nullable) RCConsumetWebTaskFinish onFinish;
@property(nonatomic, readonly) BOOL isSettled;
/// The URL of the page that finished loading last: after a challenge page,
/// the page it turned into, which onFinish (called for the first page only)
/// doesn't see.
@property(nonatomic, readonly, copy, nullable) NSString *finishedURL;
/// Loads `url`. Headers are split as on Android (RequestHeaders), matching
/// names case-insensitively: User-Agent replaces the WebView's own, Cookie
/// values go into its cookie store before loading (WKWebView ignores a raw
/// Cookie header), and the rest are sent with the request.
- (void)loadURL:(NSString *)url
         method:(NSString *)method
        headers:(nullable NSDictionary<NSString *, NSString *> *)headers
           body:(nullable NSString *)body;
- (void)resolve:(id)value;
- (void)rejectWithCode:(NSString *)code message:(NSString *)message;
@end

/// Running tasks, so a task lives until it settles. Main thread only.
static NSMutableSet<RCConsumetWebTask *> *RCConsumetRunningTasks(void) {
  static NSMutableSet<RCConsumetWebTask *> *tasks;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    tasks = [NSMutableSet set];
  });
  return tasks;
}

@implementation RCConsumetWebTask {
  RCTPromiseResolveBlock _resolve;
  RCTPromiseRejectBlock _reject;
  WKWebView *_webView;
  UIWindow *_offscreenWindow;
  NSTimer *_timer;
  BOOL _pageFinished;
}

- (instancetype)initWithResolve:(RCTPromiseResolveBlock)resolve
                         reject:(RCTPromiseRejectBlock)reject {
  if ((self = [super init])) {
    _resolve = [resolve copy];
    _reject = [reject copy];
  }
  return self;
}

- (void)loadURL:(NSString *)urlStr
         method:(NSString *)method
        headers:(NSDictionary<NSString *, NSString *> *)headers
           body:(NSString *)body {
  NSAssert([NSThread isMainThread], @"loadURL must be called on main thread");
  [RCConsumetRunningTasks() addObject:self];

  NSMutableURLRequest *request = [NSMutableURLRequest
       requestWithURL:[NSURL URLWithString:urlStr]
          cachePolicy:NSURLRequestReloadIgnoringCacheData
      timeoutInterval:kWebViewTimeout];
  request.HTTPMethod = method;
  if (body)
    request.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
  __block NSString *ua = nil;
  __block NSString *cookieHeader = nil;
  [headers enumerateKeysAndObjectsUsingBlock:^(NSString *k, NSString *v,
                                               BOOL *stop) {
    if ([k caseInsensitiveCompare:@"User-Agent"] == NSOrderedSame) {
      ua = v;
    } else if ([k caseInsensitiveCompare:@"Cookie"] == NSOrderedSame) {
      cookieHeader = v;
    } else {
      [request setValue:v forHTTPHeaderField:k];
    }
  }];

  WKWebViewConfiguration *cfg = [WKWebViewConfiguration new];
  cfg.websiteDataStore = RCConsumetDataStore();
  cfg.applicationNameForUserAgent = RCConsumetSafariApplicationName();

  _webView = [[WKWebView alloc] initWithFrame:CGRectMake(0, 0, 1, 1)
                                configuration:cfg];
  if (ua.length)
    _webView.customUserAgent = ua;
  _webView.navigationDelegate = self;

  // Attach to a tiny off-screen window so WKWebView loads resources properly.
  _offscreenWindow = [[UIWindow alloc] initWithFrame:CGRectMake(-2, -2, 1, 1)];
  _offscreenWindow.windowLevel = UIWindowLevelNormal - 200;
  _offscreenWindow.hidden = NO;
  [_offscreenWindow addSubview:_webView];

  _timer = [NSTimer scheduledTimerWithTimeInterval:kWebViewTimeout
                                            target:self
                                          selector:@selector(_didTimeout)
                                          userInfo:nil
                                           repeats:NO];

  // Load once the Cookie header's cookies are in the store.
  NSArray<NSHTTPCookie *> *seedCookies = [self _cookiesFromHeader:cookieHeader
                                                           forURL:request.URL];
  if (seedCookies.count == 0) {
    [_webView loadRequest:request];
    return;
  }

  WKHTTPCookieStore *store =
      _webView.configuration.websiteDataStore.httpCookieStore;
  dispatch_group_t group = dispatch_group_create();
  for (NSHTTPCookie *cookie in seedCookies) {
    dispatch_group_enter(group);
    [store setCookie:cookie
        completionHandler:^{
          dispatch_group_leave(group);
        }];
  }
  WKWebView *webView = _webView;
  dispatch_group_notify(group, dispatch_get_main_queue(), ^{
    [webView loadRequest:request];
  });
}

- (NSArray<NSHTTPCookie *> *)_cookiesFromHeader:(NSString *)cookieHeader
                                         forURL:(NSURL *)url {
  if (!cookieHeader.length || !url.host)
    return @[];
  NSMutableArray<NSHTTPCookie *> *cookies = [NSMutableArray array];
  for (NSString *pair in [cookieHeader componentsSeparatedByString:@";"]) {
    NSString *trimmed =
        [pair stringByTrimmingCharactersInSet:[NSCharacterSet
                                                  whitespaceCharacterSet]];
    NSRange eq = [trimmed rangeOfString:@"="];
    if (eq.location == NSNotFound)
      continue;
    NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:@{
      NSHTTPCookieName : [trimmed substringToIndex:eq.location],
      NSHTTPCookieValue : [trimmed substringFromIndex:eq.location + 1],
      NSHTTPCookieDomain : url.host,
      NSHTTPCookiePath : @"/"
    }];
    if (cookie)
      [cookies addObject:cookie];
  }
  return cookies;
}

- (void)_didTimeout {
  [self rejectWithCode:kTimeoutCode message:@"WebView request timed out"];
}

// The blocks are read before -_settle, which can release the last reference
// to the task.
- (void)resolve:(id)value {
  RCTPromiseResolveBlock resolve = _resolve;
  if ([self _settle])
    resolve(value);
}

- (void)rejectWithCode:(NSString *)code message:(NSString *)message {
  RCTPromiseRejectBlock reject = _reject;
  if ([self _settle])
    reject(code, message, nil);
}

/// Marks the task settled and releases its WebView; NO if it already was.
- (BOOL)_settle {
  if (_isSettled)
    return NO;
  _isSettled = YES;
  [_timer invalidate];
  _timer = nil;
  self.onFinish = nil;
  _webView.navigationDelegate = nil;
  [_webView stopLoading];
  [_webView removeFromSuperview];
  _webView = nil;
  _offscreenWindow.hidden = YES;
  _offscreenWindow = nil;
  [RCConsumetRunningTasks() removeObject:self];
  return YES;
}

- (void)webView:(WKWebView *)webView
    didFinishNavigation:(WKNavigation *)navigation {
  if (_isSettled)
    return;
  _finishedURL = [webView.URL.absoluteString copy];
  if (_pageFinished)
    return;
  _pageFinished = YES;
  RCConsumetWebTaskFinish onFinish = self.onFinish;
  if (onFinish)
    onFinish(self, webView);
}

// The page is gone (the process crashed, or the system ended it to free
// memory) and can't be read, whether or not it had finished loading.
- (void)webViewWebContentProcessDidTerminate:(WKWebView *)webView {
  [self rejectWithCode:kWebViewErrorCode message:kContentProcessDiedMessage];
}

// WKWebView reports only main-frame navigation failures here; failed
// sub-resources (images, scripts, iframes) never reject the request.
- (void)webView:(WKWebView *)webView
    didFailNavigation:(WKNavigation *)navigation
            withError:(NSError *)error {
  [self _didFailWithError:error];
}

- (void)webView:(WKWebView *)webView
    didFailProvisionalNavigation:(WKNavigation *)navigation
                       withError:(NSError *)error {
  [self _didFailWithError:error];
}

- (void)_didFailWithError:(NSError *)error {
  // A navigation cancelled because another one replaced it (a redirect or a
  // script reload, as on challenge pages) is not a failure; the replacement
  // navigation or the timeout settles the request. Android does not report
  // these either.
  if ([error.domain isEqualToString:NSURLErrorDomain] &&
      error.code == NSURLErrorCancelled)
    return;
  if (_pageFinished)
    return;
  [self rejectWithCode:kWebViewErrorCode message:error.localizedDescription];
}

@end

#pragma mark - Consumet Module

// "challenge" on a Cloudflare challenge page ("Just a moment..."), which turns
// into the real page once its script has run; otherwise "ready" once the
// document has loaded, else "loading" (as on Android).
static NSString *const kPageStateScript =
    @"(function(){try{if(window._cf_chl_opt||"
    @"document.getElementById('challenge-form')||"
    @"document.getElementById('challenge-running')||"
    @"document.title==='Just a moment...')return 'challenge';"
    @"return document.readyState==='complete'?'ready':'loading';"
    @"}catch(e){return 'ready';}})()";

/// Checks the page every kPollInterval until a challenge has turned into a
/// loaded page, then runs capture kCaptureDelay later (or at once when there
/// was none). Polling the page, not waiting for navigation events, can't miss
/// a reload that finished while a check was running.
static void RCConsumetCaptureWhenReady(RCConsumetWebTask *task,
                                       WKWebView *webView,
                                       BOOL afterChallenge,
                                       dispatch_block_t capture) {
  __weak RCConsumetWebTask *wt = task;
  __weak WKWebView *wv = webView;
  [webView evaluateJavaScript:kPageStateScript
            completionHandler:^(id result, NSError *error) {
              RCConsumetWebTask *t = wt;
              if (!t || t.isSettled)
                return;
              BOOL challenge = [result isEqual:@"challenge"];
              if (challenge || [result isEqual:@"loading"]) {
                dispatch_after(RCConsumetAfter(kPollInterval),
                               dispatch_get_main_queue(), ^{
                                 WKWebView *view = wv;
                                 if (view && !wt.isSettled)
                                   RCConsumetCaptureWhenReady(
                                       wt, view, afterChallenge || challenge,
                                       capture);
                               });
              } else if (afterChallenge) {
                // The page the challenge turned into gets the same time to
                // settle as a first page.
                dispatch_after(RCConsumetAfter(kCaptureDelay),
                               dispatch_get_main_queue(), ^{
                                 if (wv && !wt.isSettled)
                                   capture();
                               });
              } else {
                capture();
              }
            }];
}

/// Runs `script` on the page and passes on the string it returns. A script
/// that throws or gives no string (the page has no document, say) rejects the
/// task with WEBVIEW_ERROR.
static void RCConsumetReadPage(RCConsumetWebTask *task, WKWebView *webView,
                               NSString *script, void (^use)(NSString *value)) {
  __weak RCConsumetWebTask *wt = task;
  [webView evaluateJavaScript:script
            completionHandler:^(id result, NSError *error) {
              RCConsumetWebTask *t = wt;
              if (!t || t.isSettled)
                return;
              if ([result isKindOfClass:[NSString class]]) {
                use(result);
              } else {
                [t rejectWithCode:kWebViewErrorCode
                          message:kCaptureFailedMessage];
              }
            }];
}

/// Runs capture kCaptureDelay after a navigation finished (so scripts on the
/// page can settle), unless the page is a Cloudflare challenge: then capture
/// waits for the page the challenge turns into, and the task times out as
/// usual if it never does.
static void RCConsumetCaptureUnlessChallenge(RCConsumetWebTask *task,
                                             WKWebView *webView,
                                             dispatch_block_t capture) {
  __weak RCConsumetWebTask *wt = task;
  __weak WKWebView *wv = webView;
  dispatch_after(RCConsumetAfter(kCaptureDelay), dispatch_get_main_queue(), ^{
    WKWebView *view = wv;
    if (view && !wt.isSettled)
      RCConsumetCaptureWhenReady(wt, view, NO, capture);
  });
}

@implementation Consumet

RCT_EXPORT_MODULE()

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeConsumetSpecJSI>(params);
}

#pragma mark - makeGetRequestWithWebView

- (void)makeGetRequestWithWebView:(NSString *)urlStr
                          headers:(NSDictionary *)headers
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCConsumetWebTask *task =
        [[RCConsumetWebTask alloc] initWithResolve:resolve reject:reject];
    task.onFinish = ^(RCConsumetWebTask *task, WKWebView *webView) {
      RCConsumetCaptureUnlessChallenge(task, webView, ^{
        RCConsumetReadPage(
            task, webView, @"document.documentElement.outerHTML",
            ^(NSString *html) {
              NSString *finalURL =
                  task.finishedURL.length ? task.finishedURL : urlStr;
              RCConsumetReadCookies(webView, finalURL,
                                    ^(NSArray<NSHTTPCookie *> *cookies,
                                      NSString *cookieStr) {
                                      [task resolve:@{
                                        @"url" : finalURL,
                                        @"html" : html,
                                        @"cookies" : cookieStr,
                                        @"status" : @"success"
                                      }];
                                    });
            });
      });
    };
    [task loadURL:urlStr method:@"GET" headers:headers body:nil];
  });
}

#pragma mark - makePostRequestWithWebView

- (void)makePostRequestWithWebView:(NSString *)urlStr
                           headers:(NSDictionary *)headers
                              body:(NSString *)body
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCConsumetWebTask *task =
        [[RCConsumetWebTask alloc] initWithResolve:resolve reject:reject];

    // The page as { content, contentType }: a JSON response is shown as a
    // lone <pre>.
    NSString *jsExtract =
        @"(function(){"
        @"  var ct='text/html',content=document.documentElement.outerHTML;"
        @"  if(document.body&&document.body.children.length===1"
        @"     &&document.body.children[0].tagName==='PRE'){"
        @"    var t=document.body.children[0].textContent;"
        @"    try{JSON.parse(t);ct='application/json';content=t;}catch(e){}"
        @"  }"
        @"  return JSON.stringify({content:content,contentType:ct});"
        @"})()";

    task.onFinish = ^(RCConsumetWebTask *task, WKWebView *webView) {
      RCConsumetCaptureUnlessChallenge(task, webView, ^{
        RCConsumetReadPage(task, webView, jsExtract, ^(NSString *jsonStr) {
          // A page can replace JSON.stringify, so the capture is checked too.
          NSData *data = [jsonStr dataUsingEncoding:NSUTF8StringEncoding];
          id json = [NSJSONSerialization JSONObjectWithData:data
                                                    options:0
                                                      error:nil];
          BOOL isObject = [json isKindOfClass:[NSDictionary class]];
          id content = isObject ? json[@"content"] : nil;
          id contentType = isObject ? json[@"contentType"] : nil;
          if (![content isKindOfClass:[NSString class]] ||
              ![contentType isKindOfClass:[NSString class]]) {
            [task rejectWithCode:kWebViewErrorCode
                         message:kCaptureFailedMessage];
            return;
          }
          NSString *finalURL =
              task.finishedURL.length ? task.finishedURL : urlStr;
          RCConsumetReadCookies(
              webView, finalURL,
              ^(NSArray<NSHTTPCookie *> *cookies, NSString *cookieStr) {
                [task resolve:@{
                  @"url" : finalURL,
                  @"response" : content,
                  @"cookies" : cookieStr,
                  @"status" : @"success",
                  @"contentType" : contentType
                }];
              });
        });
      });
    };
    [task loadURL:urlStr method:@"POST" headers:headers body:body];
  });
}

#pragma mark - makePostRequest

- (void)makePostRequest:(NSString *)urlStr
                headers:(NSDictionary *)headers
                   body:(NSString *)body
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  NSURL *url = [NSURL URLWithString:urlStr];
  if (!url) {
    reject(@"HTTP_ERROR", @"Invalid URL", nil);
    return;
  }

  NSMutableURLRequest *req =
      [NSMutableURLRequest requestWithURL:url
                              cachePolicy:NSURLRequestReloadIgnoringCacheData
                          timeoutInterval:30];
  req.HTTPMethod = @"POST";
  [headers enumerateKeysAndObjectsUsingBlock:^(NSString *k, NSString *v,
                                               BOOL *stop) {
    [req setValue:v forHTTPHeaderField:k];
  }];
  // Header names match in any case, as on Android.
  if (![req valueForHTTPHeaderField:@"Content-Type"]) {
    [req setValue:@"application/json; charset=utf-8"
        forHTTPHeaderField:@"Content-Type"];
  }
  req.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];

  [[[NSURLSession sharedSession]
      dataTaskWithRequest:req
        completionHandler:^(NSData *d, NSURLResponse *r, NSError *e) {
          if (e) {
            reject(@"HTTP_ERROR", e.localizedDescription, e);
            return;
          }
          NSHTTPURLResponse *resp = (NSHTTPURLResponse *)r;
          NSString *respBody =
              [[NSString alloc] initWithData:d ?: [NSData data]
                                    encoding:NSUTF8StringEncoding]
                  ?: @"";
          NSMutableDictionary *respHeaders = [NSMutableDictionary dictionary];
          [resp.allHeaderFields
              enumerateKeysAndObjectsUsingBlock:^(id k, id v, BOOL *s) {
                respHeaders[k] = v;
              }];
          resolve(@{
            @"statusCode" : @(resp.statusCode),
            @"body" : respBody,
            @"headers" : respHeaders
          });
        }] resume];
}

#pragma mark - deobfuscateScript

- (void)deobfuscateScript:(NSString *)source
                  resolve:(RCTPromiseResolveBlock)resolve
                   reject:(RCTPromiseRejectBlock)reject {
  // Downloaded at most once per process and saved for later launches, after
  // its SHA-256 is checked (see RCConsumetSynchronyCache.h).
  [[RCConsumetSynchronyCache sharedCache] loadScript:^(NSString *script,
                                                       NSString *code,
                                                       NSString *message) {
    if (!script) {
      reject(code, message, nil);
      return;
    }
    // Off the cache's queue (running Synchrony takes a while), on a thread
    // with the stack Synchrony needs.
    NSThread *thread = [[NSThread alloc] initWithBlock:^{
      // A detached thread needs its own pool for what ARC autoreleases.
      @autoreleasepool {
        JSContext *ctx = [[JSContext alloc] init];
        __block NSString *jsErr = nil;
        ctx.exceptionHandler = ^(JSContext *c, JSValue *ex) {
          jsErr = ex.toString;
        };

        [ctx evaluateScript:@"var console={log:function(){},warn:function(){},"
                            @"error:function(){},trace:function(){}};"];
        [ctx evaluateScript:script];
        if (jsErr) {
          reject(@"EvaluationError", jsErr, nil);
          return;
        }

        // A Synchrony exception reaches exceptionHandler and rejects, as on
        // Android; the promise resolves only with a string.
        ctx[@"__src"] = source;
        JSValue *result =
            [ctx evaluateScript:@"new Deobfuscator().deobfuscateSource(__src)"];
        if (jsErr) {
          reject(@"EvaluationError", jsErr, nil);
          return;
        }
        if (!result.isString) {
          reject(@"EvaluationError", @"Deobfuscator did not return a string",
                 nil);
          return;
        }
        resolve(result.toString);
      }
    }];
    thread.name = @"ConsumetDeobfuscator";
    thread.stackSize = kSynchronyThreadStackBytes;
    thread.qualityOfService = NSQualityOfServiceUtility;
    [thread start];
  }];
}

@end
