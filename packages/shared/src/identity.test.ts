import { describe, expect, it } from 'vitest';

import { createGamingProfileSchema, registerUserSchema } from './identity.js';

describe('Identity schemas', () => {
  it('validates registerUserSchema with valid input', () => {
    const valid = {
      email: 'player@example.com',
      username: 'Gamer_99',
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
