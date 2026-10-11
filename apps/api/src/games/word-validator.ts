/**
 * Word validity checker — API service layer concern.
 *
 * Uses the Free Dictionary API (https://dictionaryapi.dev/) which requires
 * no authentication. Returns true when the word is found, false otherwise.
 *
 * This intentionally lives outside `@recess/game-core` because the
 * GameDefinition contract is pure and infrastructure-free.
 */

const DICTIONARY_API_BASE = 'https://api.dictionaryapi.dev/api/v2/entries/en';

/**
 * Check whether a word is a valid English word via the Free Dictionary API.
 *
 * Returns `true` if the API confirms the word exists; `false` if the word
 * is not found (HTTP 404) or the API is unreachable.
 *
 * Callers should handle the `false` case by rejecting the move with
 * `INVALID_MOVE` before it reaches the game core.
 */
export async function isValidWord(word: string): Promise<boolean> {
  const normalized = word.trim().toLowerCase();
  if (normalized.length === 0 || !/^[a-z]+$/.test(normalized)) {
    return false;
  }

  try {
    const response = await fetch(
      `${DICTIONARY_API_BASE}/${encodeURIComponent(normalized)}`,
      {
        method: 'GET',
        signal: AbortSignal.timeout(5000), // 5-second timeout
      },
    );

    // 200 = word found, 404 = word not found
    return response.ok;
  } catch {
    // Network errors, timeouts, DNS failures — treat as invalid to
    // maintain server-authoritative validation. The player can retry.
    return false;
  }
}

/** Interface for dependency injection in tests and future providers. */
export interface WordValidator {
  isValidWord(word: string): Promise<boolean>;
}

/** Default implementation using the Free Dictionary API. */
export const dictionaryApiValidator: WordValidator = {
  isValidWord,
};
