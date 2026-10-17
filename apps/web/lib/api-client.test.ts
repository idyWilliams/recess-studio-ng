import { describe, expect, it } from 'vitest';

import { ApiClientError, toApiClientError } from './api-client';

/** Builds an axios-like error shape without depending on axios internals. */
function axiosLikeError(
  response: { status: number; data: unknown } | undefined,
  message = 'Request failed',
): unknown {
  return { isAxiosError: true, response, message };
}

describe('toApiClientError', () => {
  it('maps a structured API error body to its stable code', () => {
    const error = toApiClientError(
      axiosLikeError({ status: 409, data: { code: 'STALE_GAME_STATE', message: 'version mismatch' } }),
    );
    expect(error).toBeInstanceOf(ApiClientError);
    expect(error.code).toBe('STALE_GAME_STATE');
    expect(error.status).toBe(409);
    expect(error.message).toBe('version mismatch');
  });

  it('maps UNAUTHORIZED so the identity layer can sign the browser out', () => {
    const error = toApiClientError(
      axiosLikeError({ status: 401, data: { code: 'UNAUTHORIZED', message: 'bad token' } }),
    );
    expect(error.code).toBe('UNAUTHORIZED');
    expect(error.status).toBe(401);
  });

  it('maps an unrecognized error body to UNKNOWN_ERROR with the status', () => {
    const error = toApiClientError(axiosLikeError({ status: 500, data: { foo: 'bar' } }));
    expect(error.code).toBe('UNKNOWN_ERROR');
    expect(error.status).toBe(500);
  });

  it('maps missing responses (timeouts, aborted requests) to NETWORK_ERROR', () => {
    const error = toApiClientError(axiosLikeError(undefined, 'timeout of 10000ms exceeded'));
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.status).toBe(0);
  });

  it('treats arbitrary thrown values as NETWORK_ERROR', () => {
    expect(toApiClientError('boom').code).toBe('NETWORK_ERROR');
    expect(toApiClientError(null).code).toBe('NETWORK_ERROR');
    expect(toApiClientError(undefined).code).toBe('NETWORK_ERROR');
  });

  it('passes an existing ApiClientError through unchanged', () => {
    const original = new ApiClientError('TURN_NOT_EXPIRED', 'not yet', 409);
    expect(toApiClientError(original)).toBe(original);
  });
});
