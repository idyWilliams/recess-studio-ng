import { describe, expect, it } from 'vitest';
import { detectMobileBrowser } from './browser-detect';

describe('detectMobileBrowser', () => {
  it('correctly detects Chrome on iOS (CriOS)', () => {
    const iosChromeUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/124.0.6367.88 Mobile/15E148 Safari/604.1';
    expect(detectMobileBrowser(iosChromeUA)).toBe('ios-chrome');
  });

  it('correctly detects Safari on iOS', () => {
    const iosSafariUA =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4.1 Mobile/15E148 Safari/604.1';
    expect(detectMobileBrowser(iosSafariUA)).toBe('ios-safari');
  });

  it('correctly detects Chrome on Android', () => {
    const androidChromeUA =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36';
    expect(detectMobileBrowser(androidChromeUA)).toBe('android-chrome');
  });

  it('correctly identifies desktop browsers', () => {
    const macChromeUA =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
    expect(detectMobileBrowser(macChromeUA)).toBe('desktop');
  });
});
