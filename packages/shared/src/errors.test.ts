import { describe, expect, it } from 'vitest';

import { ApiErrorCode } from './errors.js';

describe('ApiErrorCode', () => {
  it('includes stable game session codes', () => {
    expect(ApiErrorCode.STALE_GAME_STATE).toBe('STALE_GAME_STATE');
    expect(ApiErrorCode.INVALID_MOVE).toBe('INVALID_MOVE');
  });
});
