export type MobileBrowserType =
  | 'ios-chrome'
  | 'ios-safari'
  | 'android-chrome'
  | 'desktop'
  | 'other-mobile';

/**
 * Inspects userAgent to determine browser family and mobile OS
 * for tailor-made Add to Home Screen (PWA) / fullscreen guidance.
 */
export function detectMobileBrowser(userAgent: string): MobileBrowserType {
  const ua = userAgent.toLowerCase();
  const isIOS = /iphone|ipad|ipod/.test(ua);
  const isAndroid = /android/.test(ua);

  if (isIOS) {
    if (ua.includes('crios')) {
      return 'ios-chrome';
    }
    return 'ios-safari';
  }

  if (isAndroid) {
    if (ua.includes('chrome')) {
      return 'android-chrome';
    }
    return 'other-mobile';
  }

  return 'desktop';
}
