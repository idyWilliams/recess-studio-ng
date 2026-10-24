import { describe, expect, it } from 'vitest';

import {
  formatWhatsAppDeepLink,
  formatWhatsAppInviteUrl,
  formatWhatsAppNudgeUrl,
  formatWhatsAppResultUrl,
  getVersionedMatchUrl,
  isMobileDevice,
} from './whatsapp';
import { buildMatchResultNotification } from './whatsapp-notify';

describe('whatsapp utils', () => {
  const publicId = 'aabbccddeeff';
  const iphoneUA =
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1';
  const androidUA =
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36';
  const desktopUA =
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0 Safari/537.36';

  describe('isMobileDevice', () => {
    it('detects iPhone and Android user agents', () => {
      expect(isMobileDevice(iphoneUA)).toBe(true);
      expect(isMobileDevice(androidUA)).toBe(true);
    });

    it('returns false for desktop user agents', () => {
      expect(isMobileDevice(desktopUA)).toBe(false);
      expect(isMobileDevice('')).toBe(false);
    });
  });

  describe('formatWhatsAppDeepLink', () => {
    it('emits whatsapp://send?text= on mobile', () => {
      const link = formatWhatsAppDeepLink('Hello Recess!', iphoneUA);
      expect(link.startsWith('whatsapp://send?text=')).toBe(true);
      expect(link).toContain(encodeURIComponent('Hello Recess!'));
    });

    it('emits https://wa.me/?text= on desktop', () => {
      const link = formatWhatsAppDeepLink('Hello Recess!', desktopUA);
      expect(link.startsWith('https://wa.me/?text=')).toBe(true);
      expect(link).toContain(encodeURIComponent('Hello Recess!'));
    });
  });

  describe('getVersionedMatchUrl', () => {
    it('appends stateVersion query parameter for OpenGraph cache-busting', () => {
      const url = getVersionedMatchUrl(publicId, 3, 'https://recess.gg');
      expect(url).toBe('https://recess.gg/games/word-battle/aabbccddeeff?v=3');
    });

    it('defaults to stateVersion 0 if omitted', () => {
      const url = getVersionedMatchUrl(publicId, undefined, 'https://recess.gg');
      expect(url).toBe('https://recess.gg/games/word-battle/aabbccddeeff?v=0');
    });

    it('falls back to recess.studio if origin and window are undefined', () => {
      const url = getVersionedMatchUrl(publicId, 2);
      expect(url).toBe('https://recess.studio/games/word-battle/aabbccddeeff?v=2');
    });
  });

  describe('formatWhatsAppInviteUrl', () => {
    it('formats a clean wa.me deep link with encoded invite message on desktop', () => {
      const waUrl = formatWhatsAppInviteUrl(publicId, 'Idy', 'https://recess.gg', desktopUA);
      expect(waUrl.startsWith('https://wa.me/?text=')).toBe(true);

      const encoded = waUrl.replace('https://wa.me/?text=', '');
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toContain('Idy challenged you to a game of Word Battle');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=0');
      // Must not contain markdown link brackets [url](url)
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
    });

    it('formats native whatsapp:// URI scheme on mobile', () => {
      const waUrl = formatWhatsAppInviteUrl(publicId, 'Idy', 'https://recess.gg', iphoneUA);
      expect(waUrl.startsWith('whatsapp://send?text=')).toBe(true);
      const decoded = decodeURIComponent(waUrl.replace('whatsapp://send?text=', ''));
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=0');
    });
  });

  describe('formatWhatsAppNudgeUrl', () => {
    it('formats a turn notification with last word played and score', () => {
      const waUrl = formatWhatsAppNudgeUrl({
        publicId,
        stateVersion: 4,
        senderName: 'Tunde',
        lastMoveWord: 'SPARK',
        lastMoveScore: 5,
        origin: 'https://recess.gg',
        userAgent: desktopUA,
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('Your turn in Word Battle against Tunde!');
      expect(decoded).toContain('Tunde played "SPARK" (+5 pts)');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=4');
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
    });

    it('formats a clean turn notification when no last move word is given on mobile', () => {
      const waUrl = formatWhatsAppNudgeUrl({
        publicId,
        stateVersion: 1,
        senderName: 'Tunde',
        origin: 'https://recess.gg',
        userAgent: androidUA,
      });

      expect(waUrl.startsWith('whatsapp://send?text=')).toBe(true);
      const decoded = decodeURIComponent(waUrl.replace('whatsapp://send?text=', ''));
      expect(decoded).toContain('Your turn in Word Battle against Tunde!');
      expect(decoded).not.toContain('played');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=1');
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
    });
  });

  describe('formatWhatsAppResultUrl', () => {
    it('formats a match victory summary message without markdown brackets', () => {
      const waUrl = formatWhatsAppResultUrl({
        publicId,
        winnerName: 'Ada',
        viewerWon: true,
        isDraw: false,
        myScore: 28,
        opponentScore: 19,
        opponentName: 'Grace',
        origin: 'https://recess.gg',
        userAgent: desktopUA,
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('🏆 I won Word Battle!');
      expect(decoded).toContain('Final: 28 pts vs Grace (19 pts)');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=999');
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
    });

    it('includes knockout label and rematch URL when present', () => {
      const waUrl = formatWhatsAppResultUrl({
        publicId,
        winnerName: 'Ada',
        viewerWon: true,
        isDraw: false,
        isKnockout: true,
        myScore: 35,
        opponentScore: 10,
        opponentName: 'Grace',
        rematchPublicId: 'rematch123',
        origin: 'https://recess.gg',
        userAgent: iphoneUA,
      });

      expect(waUrl.startsWith('whatsapp://send?text=')).toBe(true);
      const decoded = decodeURIComponent(waUrl.replace('whatsapp://send?text=', ''));
      expect(decoded).toContain('🏆 I won Word Battle by knockout!');
      expect(decoded).toContain('https://recess.gg/games/word-battle/rematch123?v=0');
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
    });

    it('formats a tie game summary message', () => {
      const waUrl = formatWhatsAppResultUrl({
        publicId,
        winnerName: null,
        viewerWon: false,
        isDraw: true,
        myScore: 20,
        opponentScore: 20,
        opponentName: 'Grace',
        origin: 'https://recess.gg',
        userAgent: desktopUA,
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('🤝 Tie Game!');
      expect(decoded).toContain('Final: 20 pts vs Grace (20 pts)');
      expect(decoded).not.toMatch(/\[.*\]\(.*\)/);
    });
  });

  describe('buildMatchResultNotification', () => {
    it('constructs a full notification payload with canvas snapshot descriptor', () => {
      const notification = buildMatchResultNotification({
        publicId: 'match-1',
        myName: 'Chidi',
        myScore: 30,
        myLives: 3,
        opponentName: 'Tunde',
        opponentScore: 18,
        opponentLives: 0,
        winnerName: 'Chidi',
        viewerWon: true,
        isDraw: false,
        isKnockout: true,
        rematchPublicId: 'match-2',
        origin: 'https://recess.studio',
        userAgent: iphoneUA,
      });

      expect(notification.headline).toBe('🏆 Chidi Won!');
      expect(notification.statusBadge).toBe('KNOCKOUT VICTORY');
      expect(notification.fallbackUrl.startsWith('whatsapp://send?text=')).toBe(true);
      expect(notification.snapshotOptions.playerOne.name).toBe('Chidi');
      expect(notification.snapshotOptions.playerOne.isWinner).toBe(true);
      expect(notification.snapshotOptions.playerTwo.name).toBe('Tunde');
      expect(notification.snapshotOptions.playerTwo.isWinner).toBe(false);
      expect(notification.shareText).not.toMatch(/\[.*\]\(.*\)/);
      expect(notification.shareText).toContain('https://recess.studio/games/word-battle/match-2?v=0');
    });
  });
});
