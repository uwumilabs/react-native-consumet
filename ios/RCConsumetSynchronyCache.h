#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Rejection codes for deobfuscateScript (see the contract in src/NativeConsumet.ts).
extern NSString *const RCConsumetNetworkErrorCode;
extern NSString *const RCConsumetParseErrorCode;

/// Called with the prepared script, or with a rejection code and message.
typedef void (^RCConsumetSynchronyCompletion)(NSString *_Nullable script,
                                              NSString *_Nullable code,
                                              NSString *_Nullable message);

/**
 * The Synchrony script for deobfuscateScript, so it is not downloaded on every
 * call (NAT-3). Same scheme as Android's SynchronyScriptCache:
 *
 * - Memory: once loaded, the prepared script (its ES module export rewritten as
 *   plain declarations) is kept for the life of the object; +sharedCache lives
 *   as long as the process. Calls made while it loads wait for that load.
 * - Disk: a verified download is saved as `synchrony-<sha256>.js` in the
 *   directory, so later launches skip the network. The file is hashed again
 *   when read; if it doesn't match it is deleted and the script downloaded
 *   again. Saving is best-effort.
 * - Integrity: the script must have the pinned SHA-256. A download that doesn't
 *   is rejected with NetworkError and never saved.
 *
 * Failures are not cached: the next call tries again. Saving a new version
 * deletes the files of other versions.
 */
@interface RCConsumetSynchronyCache : NSObject

/// The pinned Synchrony script, saved in Library/Caches/consumet.
+ (instancetype)sharedCache;

/// `directory` nil keeps the script in memory only.
- (instancetype)initWithURL:(NSURL *)url
                     sha256:(NSString *)sha256
                  directory:(nullable NSURL *)directory
    NS_DESIGNATED_INITIALIZER;
- (instancetype)init NS_UNAVAILABLE;

/// Where the verified script is saved, or nil without a directory.
@property(nonatomic, readonly, nullable) NSURL *fileURL;

/// Calls `completion` once, on a private serial queue: keep the work there short.
- (void)loadScript:(RCConsumetSynchronyCompletion)completion;

@end

NS_ASSUME_NONNULL_END
