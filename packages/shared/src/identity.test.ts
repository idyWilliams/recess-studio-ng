import { describe, expect, it } from 'vitest';

import {
  createGamingProfileSchema,
  maskWhatsAppNumber,
  normalizeWhatsAppNumber,
  registerUserSchema,
} from './identity.js';

describe('Identity schemas', () => {
  it('validates registerUserSchema with valid input including WhatsApp number', () => {
    const valid = {
      email: 'player@example.com',
      username: 'Gamer_99',
      whatsappNumber: '+2348012345678',
      displayName: 'Chidi Victor',
      countryFlag: '🇳🇬',
      avatarId: 'avatar-chidi',
      avatarUrl: 'https://example.com/avatar.png',
    };
    const result = registerUserSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid username characters', () => {
    const invalid = {
      username: 'bad username!',
    };
    const result = registerUserSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('rejects short usernames', () => {
    const invalid = {
      username: 'ab',
    };
    const result = registerUserSchema.safeParse(invalid);
    expect(result.success).toBe(false);
  });

  it('validates createGamingProfileSchema with valid UUID', () => {
    const valid = {
      userId: '123e4567-e89b-12d3-a456-426614174000',
      username: 'ProPlayer',
    };
    const result = createGamingProfileSchema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('WhatsApp Number Privacy & Masking', () => {
  it('masks Nigerian phone numbers correctly while strictly concealing middle digits', () => {
    const masked = maskWhatsAppNumber('+2348012345678');
    expect(masked).toBe('+234 ••• ••78');
    expect(masked).not.toContain('80123456');
  });

  it('masks international numbers correctly', () => {
    const maskedGhana = maskWhatsAppNumber('+233201234567');
    expect(maskedGhana).toBe('+233 ••• ••67');
  });

  it('normalizes local leading-zero numbers to default country code E.164', () => {
    const normalized = normalizeWhatsAppNumber('08012345678', '+234');
    expect(normalized).toBe('+2348012345678');
  });

  it('preserves already prefixed E.164 numbers', () => {
    const normalized = normalizeWhatsAppNumber('+2348012345678');
    expect(normalized).toBe('+2348012345678');
  });
});
