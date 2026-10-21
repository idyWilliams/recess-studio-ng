import { describe, expect, it } from 'vitest';

import {
  formatWhatsAppInviteUrl,
  formatWhatsAppNudgeUrl,
  formatWhatsAppResultUrl,
  getVersionedMatchUrl,
} from './whatsapp';

describe('whatsapp utils', () => {
  const publicId = 'aabbccddeeff';

  describe('getVersionedMatchUrl', () => {
    it('appends stateVersion query parameter for OpenGraph cache-busting', () => {
      const url = getVersionedMatchUrl(publicId, 3, 'https://recess.gg');
      expect(url).toBe('https://recess.gg/games/word-battle/aabbccddeeff?v=3');
    });

    it('defaults to stateVersion 0 if omitted', () => {
      const url = getVersionedMatchUrl(publicId, undefined, 'https://recess.gg');
      expect(url).toBe('https://recess.gg/games/word-battle/aabbccddeeff?v=0');
    });
  });

  describe('formatWhatsAppInviteUrl', () => {
    it('formats a clean wa.me deep link with encoded invite message', () => {
      const waUrl = formatWhatsAppInviteUrl(publicId, 'Idy', 'https://recess.gg');
      expect(waUrl.startsWith('https://wa.me/?text=')).toBe(true);

      const encoded = waUrl.replace('https://wa.me/?text=', '');
      const decoded = decodeURIComponent(encoded);

      expect(decoded).toContain('Idy challenged you to a game of Word Battle');
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
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('Your turn in Word Battle against Tunde!');
      expect(decoded).toContain('Tunde played "SPARK" (+5 pts)');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=4');
    });

    it('formats a clean turn notification when no last move word is given', () => {
      const waUrl = formatWhatsAppNudgeUrl({
        publicId,
        stateVersion: 1,
        senderName: 'Tunde',
        origin: 'https://recess.gg',
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('Your turn in Word Battle against Tunde!');
      expect(decoded).not.toContain('played');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=1');
    });
  });

  describe('formatWhatsAppResultUrl', () => {
    it('formats a match victory summary message', () => {
      const waUrl = formatWhatsAppResultUrl({
        publicId,
        winnerName: 'Ada',
        viewerWon: true,
        isDraw: false,
        myScore: 28,
        opponentScore: 19,
        opponentName: 'Grace',
        origin: 'https://recess.gg',
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('🏆 Ada won!');
      expect(decoded).toContain('Final: 28 pts vs Grace (19 pts)');
      expect(decoded).toContain('https://recess.gg/games/word-battle/aabbccddeeff?v=999');
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
      });

      const decoded = decodeURIComponent(waUrl.replace('https://wa.me/?text=', ''));
      expect(decoded).toContain('🤝 Tie Game!');
      expect(decoded).toContain('Final: 20 pts vs Grace (20 pts)');
    });
  });
});
