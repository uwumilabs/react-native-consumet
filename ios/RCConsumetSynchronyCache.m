#import "RCConsumetSynchronyCache.h"
#import <CommonCrypto/CommonDigest.h>

NSString *const RCConsumetNetworkErrorCode = @"NetworkError";
NSString *const RCConsumetParseErrorCode = @"ParseError";

// Synchrony v2.4.5.1, at a fixed commit. The URL never serves other content, so
// the script must have this SHA-256; anything else was tampered with or cut
// short. Change both together, and the pair in android/.../Synchrony.kt.
static NSString *const kSynchronyURL =
    @"https://raw.githubusercontent.com/Kohi-den/extensions-source/"
    @"9328d12fcfca686becfb3068e9d0be95552c536f/lib/synchrony/src/main/assets/"
    @"synchrony-v2.4.5.1.js";
static NSString *const kSynchronySHA256 =
    @"8f816ca971ca5e6a34952775f3ca1a3a7379ffe5645efd7b693574ec77358d82";

static NSString *RCConsumetSHA256Hex(NSData *data) {
  unsigned char digest[CC_SHA256_DIGEST_LENGTH];
  CC_SHA256(data.bytes, (CC_LONG)data.length, digest);
  NSMutableString *hex =
      [NSMutableString stringWithCapacity:CC_SHA256_DIGEST_LENGTH * 2];
  for (size_t i = 0; i < CC_SHA256_DIGEST_LENGTH; i++) {
    [hex appendFormat:@"%02x", digest[i]];
  }
  return hex;
}

/** `synchrony-<64 hex digits>.js`: a saved script of any version. */
static BOOL RCConsumetIsSavedSynchrony(NSString *name) {
  return name.length == 77 && [name hasPrefix:@"synchrony-"] &&
         [name hasSuffix:@".js"];
}

/**
 * Rewrites Synchrony's ES module export as plain const declarations, so
 * JSContext can run it as a classic script. nil if the format is unexpected.
 */
static NSString *RCConsumetPrepareSynchrony(NSString *original) {
  NSRegularExpression *re = [NSRegularExpression
      regularExpressionWithPattern:
          @"export\\{(.*?) as Deobfuscator,(.*?) as Transformer\\};"
                           options:0
                             error:nil];
  NSTextCheckingResult *m =
      [re firstMatchInString:original
                     options:0
                       range:NSMakeRange(0, original.length)];
  if (!m)
    return nil;
  NSString *rep = [NSString
      stringWithFormat:@"const Deobfuscator=%@,Transformer=%@;",
                       [original substringWithRange:[m rangeAtIndex:1]],
                       [original substringWithRange:[m rangeAtIndex:2]]];
  return [original stringByReplacingCharactersInRange:m.range withString:rep];
}

@implementation RCConsumetSynchronyCache {
  NSURL *_url;
  NSString *_sha256;
  NSURL *_directory;
  NSURLSession *_session;
  dispatch_queue_t _queue;
  // Only touched on _queue.
  NSString *_script;
  NSMutableArray<RCConsumetSynchronyCompletion> *_waiting;
}

+ (instancetype)sharedCache {
  static RCConsumetSynchronyCache *shared;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    NSURL *caches = [[NSFileManager defaultManager]
                        URLsForDirectory:NSCachesDirectory
                               inDomains:NSUserDomainMask]
                        .firstObject;
    shared = [[self alloc]
        initWithURL:[NSURL URLWithString:kSynchronyURL]
             sha256:kSynchronySHA256
          directory:[caches URLByAppendingPathComponent:@"consumet"
                                            isDirectory:YES]];
  });
  return shared;
}

- (instancetype)initWithURL:(NSURL *)url
                     sha256:(NSString *)sha256
                  directory:(NSURL *)directory {
  if ((self = [super init])) {
    _url = url;
    _sha256 = sha256.lowercaseString;
    _directory = directory;
    _queue = dispatch_queue_create("com.consumet.synchrony",
                                   DISPATCH_QUEUE_SERIAL);
    _waiting = [NSMutableArray array];

    // Ephemeral: no cookies or URL cache on disk for this download.
    NSURLSessionConfiguration *cfg =
        [NSURLSessionConfiguration ephemeralSessionConfiguration];
    cfg.timeoutIntervalForRequest = 15;
    cfg.timeoutIntervalForResource = 30;
    _session = [NSURLSession sessionWithConfiguration:cfg];
  }
  return self;
}

- (NSURL *)fileURL {
  return [_directory
      URLByAppendingPathComponent:[NSString stringWithFormat:@"synchrony-%@.js",
                                                             _sha256]];
}

- (void)loadScript:(RCConsumetSynchronyCompletion)completion {
  RCConsumetSynchronyCompletion block = [completion copy];
  dispatch_async(_queue, ^{
    if (self->_script) {
      block(self->_script, nil, nil);
      return;
    }
    [self->_waiting addObject:block];
    // A load is already running; it calls every waiting block.
    if (self->_waiting.count > 1)
      return;

    NSData *saved = [self _readSaved];
    if (saved) {
      [self _useScript:saved save:NO];
    } else {
      [self _download];
    }
  });
}

#pragma mark - Private (on _queue)

- (void)_download {
  NSMutableURLRequest *req = [NSMutableURLRequest requestWithURL:_url];
  [req setValue:@"Mozilla/5.0 (iPhone)" forHTTPHeaderField:@"User-Agent"];
  [[_session
      dataTaskWithRequest:req
        completionHandler:^(NSData *data, NSURLResponse *response,
                            NSError *error) {
          dispatch_async(self->_queue, ^{
            NSInteger status =
                [response isKindOfClass:[NSHTTPURLResponse class]]
                    ? ((NSHTTPURLResponse *)response).statusCode
                    : 200;
            if (error || !data) {
              [self _finish:nil
                       code:RCConsumetNetworkErrorCode
                    message:error.localizedDescription
                                ?: @"Could not download Synchrony"];
            } else if (status < 200 || status >= 300) {
              [self _finish:nil
                       code:RCConsumetNetworkErrorCode
                    message:[NSString
                                stringWithFormat:@"HTTP %ld", (long)status]];
            } else if (![RCConsumetSHA256Hex(data)
                           isEqualToString:self->_sha256]) {
              [self _finish:nil
                       code:RCConsumetNetworkErrorCode
                    message:[NSString
                                stringWithFormat:
                                    @"Synchrony script failed its integrity "
                                    @"check: expected SHA-256 %@, got %@",
                                    self->_sha256, RCConsumetSHA256Hex(data)]];
            } else {
              [self _useScript:data save:YES];
            }
          });
        }] resume];
}

/** `data` has the pinned SHA-256. */
- (void)_useScript:(NSData *)data save:(BOOL)save {
  NSString *original = [[NSString alloc] initWithData:data
                                             encoding:NSUTF8StringEncoding];
  if (!original) {
    [self _finish:nil
             code:RCConsumetParseErrorCode
          message:@"Invalid Synchrony encoding"];
    return;
  }
  NSString *script = RCConsumetPrepareSynchrony(original);
  if (!script) {
    [self _finish:nil
             code:RCConsumetParseErrorCode
          message:@"Could not parse Synchrony export format"];
    return;
  }
  if (save)
    [self _save:data];
  [self _finish:script code:nil message:nil];
}

- (void)_finish:(NSString *)script
           code:(NSString *)code
        message:(NSString *)message {
  if (script)
    _script = script;
  NSArray<RCConsumetSynchronyCompletion> *waiting = [_waiting copy];
  [_waiting removeAllObjects];
  for (RCConsumetSynchronyCompletion completion in waiting) {
    completion(script, code, message);
  }
}

/** The saved script if it is intact; a file that isn't is deleted. */
- (NSData *)_readSaved {
  NSURL *file = self.fileURL;
  NSData *data = file ? [NSData dataWithContentsOfURL:file] : nil;
  if (!data)
    return nil;
  if ([RCConsumetSHA256Hex(data) isEqualToString:_sha256])
    return data;
  [[NSFileManager defaultManager] removeItemAtURL:file error:nil];
  return nil;
}

- (void)_save:(NSData *)data {
  NSURL *file = self.fileURL;
  if (!file)
    return;
  NSFileManager *fm = [NSFileManager defaultManager];
  // Not saved (no space, say): this process still has the script in memory.
  if (![fm createDirectoryAtURL:_directory
          withIntermediateDirectories:YES
                           attributes:nil
                                error:nil])
    return;
  // Atomic: written to a temporary file and renamed, so no reader sees a
  // partial script.
  if (![data writeToURL:file options:NSDataWritingAtomic error:nil])
    return;
  for (NSURL *other in [fm contentsOfDirectoryAtURL:_directory
                         includingPropertiesForKeys:nil
                                            options:0
                                              error:nil]) {
    NSString *name = other.lastPathComponent;
    if (RCConsumetIsSavedSynchrony(name) &&
        ![name isEqualToString:file.lastPathComponent]) {
      [fm removeItemAtURL:other error:nil];
    }
  }
}

@end
