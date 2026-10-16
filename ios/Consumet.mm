#import "Consumet.h"
#import "RCConsumetSynchronyCache.h"
#import <JavaScriptCore/JavaScriptCore.h>
#import <WebKit/WebKit.h>

static NSString *const kDefaultUA =
    @"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
    @"AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 "
    @"Safari/604.1";

// Rejection codes shared with Android (see the contract in src/NativeConsumet.ts).
static NSString *const kWebViewErrorCode = @"WEBVIEW_ERROR";
static NSString *const kTimeoutCode = @"TIMEOUT";

/**
 * One in-memory website data store for every request this module makes.
 * Cookies (such as a passed DDoS-Guard challenge) carry over between calls,
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

/**
 * Manages a single WKWebView lifecycle for an async request.
 * Must be created and used exclusively on the main thread.
 */
@interface RCConsumetWebTask : NSObject <WKNavigationDelegate>
@property(nonatomic, copy) void (^onFinish)(WKWebView *webView, NSString *url);
@property(nonatomic, copy) void (^onError)(NSString *code, NSString *description);
- (void)loadRequest:(NSURLRequest *)request
          userAgent:(nullable NSString *)ua
       cookieHeader:(nullable NSString *)cookieHeader;
- (void)cleanup;
@end

@implementation RCConsumetWebTask {
  WKWebView *_webView;
  UIWindow *_offscreenWindow;
  NSTimer *_timer;
  BOOL _done;
}

- (void)loadRequest:(NSURLRequest *)request
          userAgent:(NSString *)ua
       cookieHeader:(NSString *)cookieHeader {
  NSAssert([NSThread isMainThread],
           @"loadRequest must be called on main thread");

  WKWebViewConfiguration *cfg = [WKWebViewConfiguration new];
  cfg.websiteDataStore = RCConsumetDataStore();

  _webView = [[WKWebView alloc] initWithFrame:CGRectMake(0, 0, 1, 1)
                                configuration:cfg];
  _webView.customUserAgent = ua.length ? ua : kDefaultUA;
  _webView.navigationDelegate = self;

  // Attach to a tiny off-screen window so WKWebView loads resources properly.
  _offscreenWindow = [[UIWindow alloc] initWithFrame:CGRectMake(-2, -2, 1, 1)];
  _offscreenWindow.windowLevel = UIWindowLevelNormal - 200;
  _offscreenWindow.hidden = NO;
  [_offscreenWindow addSubview:_webView];

  _timer = [NSTimer scheduledTimerWithTimeInterval:30
                                            target:self
                                          selector:@selector(_didTimeout)
                                          userInfo:nil
                                           repeats:NO];

  // Seed cookies from the Cookie header into WKHTTPCookieStore before loading,
  // then load once all cookies are set (WKWebView ignores a raw Cookie header).
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
  if (_done)
    return;
  _done = YES;
  if (self.onError)
    self.onError(kTimeoutCode, @"WebView request timed out");
  [self cleanup];
}

- (void)_didFailWithError:(NSError *)error {
  // A navigation cancelled because another one replaced it (a redirect or a
  // script reload, as on challenge pages) is not a failure; the replacement
  // navigation or the timeout settles the request. Android does not report
  // these either.
  if ([error.domain isEqualToString:NSURLErrorDomain] &&
      error.code == NSURLErrorCancelled)
    return;
  if (_done)
    return;
  _done = YES;
  [_timer invalidate];
  _timer = nil;
  if (self.onError)
    self.onError(kWebViewErrorCode, error.localizedDescription);
  [self cleanup];
}

- (void)cleanup {
  [_timer invalidate];
  _timer = nil;
  _webView.navigationDelegate = nil;
  [_webView stopLoading];
  [_webView removeFromSuperview];
  _webView = nil;
  _offscreenWindow.hidden = YES;
  _offscreenWindow = nil;
}

- (void)webView:(WKWebView *)webView
    didFinishNavigation:(WKNavigation *)navigation {
  if (_done)
    return;
  _done = YES;
  [_timer invalidate];
  _timer = nil;
  if (self.onFinish)
    self.onFinish(webView, webView.URL.absoluteString ?: @"");
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

@end

#pragma mark - Consumet Module

@implementation Consumet {
  NSMutableSet<RCConsumetWebTask *> *_tasks;
}

RCT_EXPORT_MODULE()

- (instancetype)init {
  if ((self = [super init])) {
    _tasks = [NSMutableSet set];
  }
  return self;
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params {
  return std::make_shared<facebook::react::NativeConsumetSpecJSI>(params);
}

#pragma mark - Private Helpers

- (NSString *)_cookieHeader:(NSArray<NSHTTPCookie *> *)cookies {
  return RCConsumetCookieHeader(cookies);
}

- (void)_removeTask:(RCConsumetWebTask *)task {
  if (task)
    [_tasks removeObject:task];
}

- (NSMutableURLRequest *)_requestWithURL:(NSString *)urlStr
                                  method:(NSString *)method
                                 headers:(NSDictionary *)headers
                                    body:(nullable NSString *)body
                            outUserAgent:(NSString *__autoreleasing *)outUA {
  NSMutableURLRequest *req =
      [NSMutableURLRequest requestWithURL:[NSURL URLWithString:urlStr]
                              cachePolicy:NSURLRequestReloadIgnoringCacheData
                          timeoutInterval:30];
  req.HTTPMethod = method;

  __block NSString *ua = kDefaultUA;
  [headers enumerateKeysAndObjectsUsingBlock:^(NSString *k, NSString *v,
                                               BOOL *stop) {
    if ([k caseInsensitiveCompare:@"User-Agent"] == NSOrderedSame) {
      ua = v;
    } else if ([k caseInsensitiveCompare:@"Cookie"] != NSOrderedSame) {
      [req setValue:v forHTTPHeaderField:k];
    }
  }];
  if (outUA)
    *outUA = ua;

  if (body)
    req.HTTPBody = [body dataUsingEncoding:NSUTF8StringEncoding];
  return req;
}

- (NSString *)_cookieHeaderValueFromHeaders:(NSDictionary *)headers {
  __block NSString *val = nil;
  [headers enumerateKeysAndObjectsUsingBlock:^(NSString *k, NSString *v,
                                               BOOL *stop) {
    if ([k caseInsensitiveCompare:@"Cookie"] == NSOrderedSame) {
      val = v;
      *stop = YES;
    }
  }];
  return val;
}

#pragma mark - bypassDdosGuard

- (void)bypassDdosGuard:(NSString *)urlStr
                resolve:(RCTPromiseResolveBlock)resolve
                 reject:(RCTPromiseRejectBlock)reject {
  NSURL *url = [NSURL URLWithString:urlStr];
  if (!url) {
    reject(@"ERROR", @"Invalid URL", nil);
    return;
  }

  // Return existing __ddg2_ cookie if we already have one.
  NSArray<NSHTTPCookie *> *existing =
      [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:url];
  for (NSHTTPCookie *c in existing) {
    if ([c.name isEqualToString:@"__ddg2_"] && c.value.length > 0) {
      resolve(@{@"cookie" : [self _cookieHeader:existing]});
      return;
    }
  }

  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    NSURLSession *session = [NSURLSession sharedSession];

    // Step 1 — fetch check.js to extract the well-known verification path.
    dispatch_semaphore_t sem1 = dispatch_semaphore_create(0);
    __block NSString *wellKnown = nil;
    __block NSError *err1 = nil;

    [[session dataTaskWithURL:
                  [NSURL URLWithString:@"https://check.ddos-guard.net/check.js"]
            completionHandler:^(NSData *d, NSURLResponse *r, NSError *e) {
              if (e || !d) {
                err1 = e;
              } else {
                NSString *body =
                    [[NSString alloc] initWithData:d
                                          encoding:NSUTF8StringEncoding]
                        ?: @"";
                NSArray<NSString *> *parts =
                    [body componentsSeparatedByString:@"'"];
                if (parts.count > 1)
                  wellKnown = parts[1];
              }
              dispatch_semaphore_signal(sem1);
            }] resume];
    dispatch_semaphore_wait(
        sem1, dispatch_time(DISPATCH_TIME_NOW, 15 * NSEC_PER_SEC));

    if (!wellKnown.length) {
      reject(@"ERROR",
             err1.localizedDescription
                 ?: @"Could not parse well-known path from check.js",
             err1);
      return;
    }

    // Step 2 — hit the well-known path on the target host to obtain the __ddg2_
    // cookie.
    NSString *checkStr = [NSString
        stringWithFormat:@"%@://%@%@", url.scheme, url.host, wellKnown];
    NSURL *checkURL = [NSURL URLWithString:checkStr];
    if (!checkURL) {
      reject(@"ERROR", @"Invalid check URL", nil);
      return;
    }

    dispatch_semaphore_t sem2 = dispatch_semaphore_create(0);
    __block NSHTTPURLResponse *checkResp = nil;

    [[session dataTaskWithURL:checkURL
            completionHandler:^(NSData *d2, NSURLResponse *r2, NSError *e2) {
              checkResp = (NSHTTPURLResponse *)r2;
              dispatch_semaphore_signal(sem2);
            }] resume];
    dispatch_semaphore_wait(
        sem2, dispatch_time(DISPATCH_TIME_NOW, 15 * NSEC_PER_SEC));

    NSArray<NSHTTPCookie *> *newCookies =
        [checkResp isKindOfClass:[NSHTTPURLResponse class]]
            ? [NSHTTPCookie
                  cookiesWithResponseHeaderFields:checkResp.allHeaderFields
                                           forURL:url]
            : @[];
    // Like Android: no cookie from the check request means the bypass failed.
    if (newCookies.count == 0) {
      reject(@"ERROR", @"Failed to get DDos-Guard cookie", nil);
      return;
    }
    NSMutableArray<NSHTTPCookie *> *allCookies = [existing mutableCopy];
    [allCookies addObjectsFromArray:newCookies];
    resolve(@{@"cookie" : [self _cookieHeader:allCookies]});
  });
}

#pragma mark - getDdosGuardCookiesWithWebView

- (void)getDdosGuardCookiesWithWebView:(NSString *)urlStr
                               resolve:(RCTPromiseResolveBlock)resolve
                                reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCConsumetWebTask *task = [RCConsumetWebTask new];
    [self->_tasks addObject:task];
    __weak __typeof__(self) ws = self;
    __weak RCConsumetWebTask *wt = task;

    task.onFinish = ^(WKWebView *webView, NSString *loadedURL) {
      RCConsumetReadCookies(
          webView, loadedURL.length ? loadedURL : urlStr,
          ^(NSArray<NSHTTPCookie *> *cookies, NSString *header) {
            BOOL hasDdg2 = NO;
            for (NSHTTPCookie *c in cookies) {
              if ([c.name isEqualToString:@"__ddg2_"])
                hasDdg2 = YES;
            }
            hasDdg2
                ? resolve(header)
                : reject(@"COOKIE_ERROR", @"No __ddg2_ cookie received", nil);
            [wt cleanup];
            [ws _removeTask:wt];
          });
    };
    task.onError = ^(NSString *code, NSString *desc) {
      reject(code, desc, nil);
      [ws _removeTask:wt];
    };

    [task loadRequest:[NSURLRequest
                           requestWithURL:[NSURL URLWithString:urlStr]
                              cachePolicy:NSURLRequestReloadIgnoringCacheData
                          timeoutInterval:30]
            userAgent:kDefaultUA
         cookieHeader:nil];
  });
}

#pragma mark - makeGetRequestWithWebView

- (void)makeGetRequestWithWebView:(NSString *)urlStr
                          headers:(NSDictionary *)headers
                          resolve:(RCTPromiseResolveBlock)resolve
                           reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCConsumetWebTask *task = [RCConsumetWebTask new];
    [self->_tasks addObject:task];
    __weak __typeof__(self) ws = self;
    __weak RCConsumetWebTask *wt = task;

    task.onFinish = ^(WKWebView *webView, NSString *loadedURL) {
      // Short delay so JS on the page has time to settle.
      dispatch_after(
          dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.5 * NSEC_PER_SEC)),
          dispatch_get_main_queue(), ^{
            [webView
                evaluateJavaScript:@"(function(){try{return "
                                   @"document.documentElement.outerHTML;}catch("
                                   @"e){return '';}})()"
                 completionHandler:^(id html, NSError *e) {
                   NSString *htmlStr =
                       [html isKindOfClass:[NSString class]] ? html : @"";
                   NSString *finalURL = loadedURL.length ? loadedURL : urlStr;
                   RCConsumetReadCookies(
                       webView, finalURL,
                       ^(NSArray<NSHTTPCookie *> *cookies,
                         NSString *cookieStr) {
                         resolve(@{
                           @"url" : finalURL,
                           @"html" : htmlStr,
                           @"cookies" : cookieStr,
                           @"status" : @"success"
                         });
                         [wt cleanup];
                         [ws _removeTask:wt];
                       });
                 }];
          });
    };
    task.onError = ^(NSString *code, NSString *desc) {
      reject(code, desc, nil);
      [ws _removeTask:wt];
    };

    NSString *ua = kDefaultUA;
    NSMutableURLRequest *req = [self _requestWithURL:urlStr
                                              method:@"GET"
                                             headers:headers
                                                body:nil
                                        outUserAgent:&ua];
    [task loadRequest:req
            userAgent:ua
         cookieHeader:[self _cookieHeaderValueFromHeaders:headers]];
  });
}

#pragma mark - makePostRequestWithWebView

- (void)makePostRequestWithWebView:(NSString *)urlStr
                           headers:(NSDictionary *)headers
                              body:(NSString *)body
                           resolve:(RCTPromiseResolveBlock)resolve
                            reject:(RCTPromiseRejectBlock)reject {
  dispatch_async(dispatch_get_main_queue(), ^{
    RCConsumetWebTask *task = [RCConsumetWebTask new];
    [self->_tasks addObject:task];
    __weak __typeof__(self) ws = self;
    __weak RCConsumetWebTask *wt = task;

    NSString *jsExtract =
        @"(function(){"
        @"try{"
        @"  var ct='text/html',content=document.documentElement.outerHTML;"
        @"  if(document.body&&document.body.children.length===1"
        @"     &&document.body.children[0].tagName==='PRE'){"
        @"    var t=document.body.children[0].textContent;"
        @"    try{JSON.parse(t);ct='application/json';content=t;}catch(e){}"
        @"  }"
        @"  return JSON.stringify({content:content,contentType:ct});"
        @"}catch(e){return JSON.stringify({content:'',contentType:'unknown'});}"
        @"})()";

    task.onFinish = ^(WKWebView *webView, NSString *loadedURL) {
      dispatch_after(
          dispatch_time(DISPATCH_TIME_NOW, (int64_t)(1.5 * NSEC_PER_SEC)),
          dispatch_get_main_queue(), ^{
            [webView
                evaluateJavaScript:jsExtract
                 completionHandler:^(id r, NSError *e) {
                   NSString *finalURL = loadedURL.length ? loadedURL : urlStr;
                   RCConsumetReadCookies(
                       webView, finalURL,
                       ^(NSArray<NSHTTPCookie *> *cookies,
                         NSString *cookieStr) {
                         NSString *jsonStr =
                             [r isKindOfClass:[NSString class]] ? r : @"{}";
                         id json = [NSJSONSerialization
                             JSONObjectWithData:
                                 [jsonStr
                                     dataUsingEncoding:NSUTF8StringEncoding]
                                        options:0
                                          error:nil];
                         NSDictionary *parsed =
                             [json isKindOfClass:[NSDictionary class]] ? json
                                                                       : @{};
                         resolve(@{
                           @"url" : finalURL,
                           @"response" : parsed[@"content"] ?: @"",
                           @"cookies" : cookieStr,
                           @"status" : @"success",
                           @"contentType" : parsed[@"contentType"]
                               ?: @"text/html"
                         });
                         [wt cleanup];
                         [ws _removeTask:wt];
                       });
                 }];
          });
    };
    task.onError = ^(NSString *code, NSString *desc) {
      reject(code, desc, nil);
      [ws _removeTask:wt];
    };

    NSString *ua = kDefaultUA;
    NSMutableURLRequest *req = [self _requestWithURL:urlStr
                                              method:@"POST"
                                             headers:headers
                                                body:body
                                        outUserAgent:&ua];
    [task loadRequest:req
            userAgent:ua
         cookieHeader:[self _cookieHeaderValueFromHeaders:headers]];
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
  if (!req.allHTTPHeaderFields[@"Content-Type"]) {
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
    // Off the cache's queue: running Synchrony takes a while.
    dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
      JSContext *ctx = [[JSContext alloc] init];
      __block NSString *jsErr = nil;
      ctx.exceptionHandler = ^(JSContext *c, JSValue *ex) {
        jsErr = ex.toString;
      };

      [ctx evaluateScript:@"var "
                          @"console={log:function(){},warn:function(){},error:"
                          @"function(){},trace:function(){}};"];
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
    });
  }];
}

@end
