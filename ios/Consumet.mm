#import "Consumet.h"
#import <JavaScriptCore/JavaScriptCore.h>
#import <WebKit/WebKit.h>

static NSString *const kDefaultUA =
    @"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) "
    @"AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 "
    @"Safari/604.1";

#pragma mark - RCConsumetWebTask

/**
 * Manages a single WKWebView lifecycle for an async request.
 * Must be created and used exclusively on the main thread.
 */
@interface RCConsumetWebTask : NSObject <WKNavigationDelegate>
@property(nonatomic, copy) void (^onFinish)(WKWebView *webView, NSString *url);
@property(nonatomic, copy) void (^onError)(NSString *description);
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
  cfg.websiteDataStore = [WKWebsiteDataStore defaultDataStore];

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
    self.onError(@"WebView request timed out");
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

- (void)webView:(WKWebView *)webView
    didFailNavigation:(WKNavigation *)navigation
            withError:(NSError *)error {
  if (_done)
    return;
  _done = YES;
  [_timer invalidate];
  _timer = nil;
  if (self.onError)
    self.onError(error.localizedDescription);
  [self cleanup];
}

- (void)webView:(WKWebView *)webView
    didFailProvisionalNavigation:(WKNavigation *)navigation
                       withError:(NSError *)error {
  if (_done)
    return;
  _done = YES;
  [_timer invalidate];
  _timer = nil;
  if (self.onError)
    self.onError(error.localizedDescription);
  [self cleanup];
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

- (NSNumber *)multiply:(double)a b:(double)b {
  return @(a * b);
}

#pragma mark - Private Helpers

- (NSString *)_cookieHeader:(NSArray<NSHTTPCookie *> *)cookies {
  NSMutableArray<NSString *> *parts =
      [NSMutableArray arrayWithCapacity:cookies.count];
  for (NSHTTPCookie *c in cookies) {
    [parts addObject:[NSString stringWithFormat:@"%@=%@", c.name, c.value]];
  }
  return [parts componentsJoinedByString:@"; "];
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

    NSMutableArray<NSHTTPCookie *> *allCookies = [existing mutableCopy];
    if (checkResp) {
      [allCookies addObjectsFromArray:[NSHTTPCookie
                                          cookiesWithResponseHeaderFields:
                                              checkResp.allHeaderFields
                                                                   forURL:url]];
    }
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
      NSURL *targetURL = [NSURL URLWithString:urlStr];
      [[webView.configuration.websiteDataStore httpCookieStore]
          getAllCookies:^(NSArray<NSHTTPCookie *> *cookies) {
            NSMutableString *str = [NSMutableString string];
            BOOL hasDdg2 = NO;
            for (NSHTTPCookie *c in cookies) {
              if (targetURL.host && ![c.domain hasSuffix:targetURL.host])
                continue;
              if (str.length)
                [str appendString:@"; "];
              [str appendFormat:@"%@=%@", c.name, c.value];
              if ([c.name isEqualToString:@"__ddg2_"])
                hasDdg2 = YES;
            }
            hasDdg2
                ? resolve(str)
                : reject(@"COOKIE_ERROR", @"No __ddg2_ cookie received", nil);
            [wt cleanup];
            [ws _removeTask:wt];
          }];
    };
    task.onError = ^(NSString *desc) {
      reject(@"WEBVIEW_ERROR", desc, nil);
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
                   [[webView.configuration.websiteDataStore httpCookieStore]
                       getAllCookies:^(NSArray<NSHTTPCookie *> *cookies) {
                         NSMutableString *cookieStr = [NSMutableString string];
                         for (NSHTTPCookie *c in cookies) {
                           if (cookieStr.length)
                             [cookieStr appendString:@"; "];
                           [cookieStr appendFormat:@"%@=%@", c.name, c.value];
                         }
                         resolve(@{
                           @"url" : loadedURL ?: urlStr,
                           @"html" : htmlStr,
                           @"cookies" : cookieStr,
                           @"status" : @"success"
                         });
                         [wt cleanup];
                         [ws _removeTask:wt];
                       }];
                 }];
          });
    };
    task.onError = ^(NSString *desc) {
      reject(@"WEBVIEW_ERROR", desc, nil);
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
                   [[webView.configuration.websiteDataStore httpCookieStore]
                       getAllCookies:^(NSArray<NSHTTPCookie *> *cookies) {
                         NSMutableString *cookieStr = [NSMutableString string];
                         for (NSHTTPCookie *c in cookies) {
                           if (cookieStr.length)
                             [cookieStr appendString:@"; "];
                           [cookieStr appendFormat:@"%@=%@", c.name, c.value];
                         }
                         NSString *jsonStr =
                             [r isKindOfClass:[NSString class]] ? r : @"{}";
                         NSDictionary *parsed =
                             [NSJSONSerialization
                                 JSONObjectWithData:
                                     [jsonStr
                                         dataUsingEncoding:NSUTF8StringEncoding]
                                            options:0
                                              error:nil]
                                 ?: @{};
                         resolve(@{
                           @"url" : loadedURL ?: urlStr,
                           @"response" : parsed[@"content"] ?: @"",
                           @"cookies" : cookieStr,
                           @"status" : @"success",
                           @"contentType" : parsed[@"contentType"]
                               ?: @"text/html"
                         });
                         [wt cleanup];
                         [ws _removeTask:wt];
                       }];
                 }];
          });
    };
    task.onError = ^(NSString *desc) {
      reject(@"WEBVIEW_ERROR", desc, nil);
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
  dispatch_async(dispatch_get_global_queue(QOS_CLASS_UTILITY, 0), ^{
    // Fetch Synchrony deobfuscator script.
    NSURL *synchronyURL = [NSURL
        URLWithString:
            @"https://raw.githubusercontent.com/Kohi-den/extensions-source/"
            @"9328d12fcfca686becfb3068e9d0be95552c536f/lib/synchrony/src/main/"
            @"assets/synchrony-v2.4.5.1.js"];

    NSMutableURLRequest *req =
        [NSMutableURLRequest requestWithURL:synchronyURL
                                cachePolicy:NSURLRequestReloadIgnoringCacheData
                            timeoutInterval:15];
    [req setValue:@"Mozilla/5.0 (iPhone)" forHTTPHeaderField:@"User-Agent"];

    dispatch_semaphore_t sem = dispatch_semaphore_create(0);
    __block NSData *fetchedData = nil;
    __block NSError *fetchErr = nil;

    [[[NSURLSession sharedSession]
        dataTaskWithRequest:req
          completionHandler:^(NSData *d, NSURLResponse *r, NSError *e) {
            fetchedData = d;
            fetchErr = e;
            dispatch_semaphore_signal(sem);
          }] resume];

    if (dispatch_semaphore_wait(
            sem, dispatch_time(DISPATCH_TIME_NOW, 20 * NSEC_PER_SEC)) != 0 ||
        !fetchedData) {
      reject(@"NetworkError",
             fetchErr.localizedDescription ?: @"Timeout fetching Synchrony",
             fetchErr);
      return;
    }

    NSString *original = [[NSString alloc] initWithData:fetchedData
                                               encoding:NSUTF8StringEncoding];
    if (!original) {
      reject(@"ParseError", @"Invalid Synchrony encoding", nil);
      return;
    }

    // Transform ES module export to plain const declarations so JSContext can
    // run it.
    NSError *reErr;
    NSRegularExpression *re = [NSRegularExpression
        regularExpressionWithPattern:
            @"export\\{(.*?) as Deobfuscator,(.*?) as Transformer\\};"
                             options:0
                               error:&reErr];
    if (!re) {
      reject(@"ParseError", reErr.localizedDescription, reErr);
      return;
    }

    __block NSString *transformed = nil;
    [re enumerateMatchesInString:original
                         options:0
                           range:NSMakeRange(0, original.length)
                      usingBlock:^(NSTextCheckingResult *m, NSMatchingFlags f,
                                   BOOL *stop) {
                        NSString *deob =
                            [original substringWithRange:[m rangeAtIndex:1]];
                        NSString *trans =
                            [original substringWithRange:[m rangeAtIndex:2]];
                        NSString *rep = [NSString
                            stringWithFormat:
                                @"const Deobfuscator=%@,Transformer=%@;", deob,
                                trans];
                        transformed =
                            [original stringByReplacingCharactersInRange:m.range
                                                              withString:rep];
                        *stop = YES;
                      }];

    if (!transformed) {
      reject(@"ParseError", @"Could not parse Synchrony export format", nil);
      return;
    }

    JSContext *ctx = [[JSContext alloc] init];
    __block NSString *jsErr = nil;
    ctx.exceptionHandler = ^(JSContext *c, JSValue *ex) {
      jsErr = ex.toString;
    };

    [ctx evaluateScript:@"var "
                        @"console={log:function(){},warn:function(){},error:"
                        @"function(){},trace:function(){}};"];
    [ctx evaluateScript:transformed];
    if (jsErr) {
      reject(@"EvaluationError", jsErr, nil);
      return;
    }

    ctx[@"__src"] = source;
    JSValue *result = [ctx evaluateScript:@"(function(){try{return new "
                                          @"Deobfuscator().deobfuscateSource(__"
                                          @"src);}catch(e){return null;}})()"];
    if (jsErr) {
      reject(@"EvaluationError", jsErr, nil);
      return;
    }

    (!result || result.isNull || result.isUndefined) ? resolve([NSNull null])
                                                     : resolve(result.toString);
  });
}

@end
