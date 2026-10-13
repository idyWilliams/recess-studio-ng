/**
 * Word validity checker — API service layer concern.
 *
 * Uses the ENABLE1 word list (Enhanced North American Benchmark LExicon),
 * bundled locally at `data/enable1.txt`. This is a public-domain word list
 * with ~172,000 entries compiled by the ENABLE project.
 *
 * Provenance: Originally published by the ENABLE project and distributed
 * widely as a public-domain reference list for word games. No licence
 * restrictions apply.
 *
 * By loading the dictionary at startup, validation is:
 *   - Synchronous in O(1) (Set lookup)
 *   - Zero latency (no network round-trip)
 *   - Zero network dependency (works offline, never degrades game availability)
 *
 * This intentionally lives outside `@recess/game-core` because the
 * GameDefinition contract is pure and infrastructure-free.
 */

import { createReadStream } from 'node:fs';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

/** Populated at startup by `loadDictionary()`. */
let wordSet: Set<string> | null = null;

/** Absolute path to the bundled ENABLE1 word list. */
function getDictionaryPath(): string {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(__dirname, '../../data/enable1.txt');
}

/**
 * Load the ENABLE1 dictionary from disk into memory.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Called once at application startup.
 */
export async function loadDictionary(): Promise<void> {
  if (wordSet !== null) return;

  const dict = new Set<string>();
  const rl = createInterface({
    input: createReadStream(getDictionaryPath(), { encoding: 'utf8' }),
    crlfDelay: Infinity,
  });

  for await (const line of rl) {
    const word = line.trim().toLowerCase();
    if (word.length > 0) {
      dict.add(word);
    }
  }

  wordSet = dict;
}

/**
 * Check whether a word exists in the locally-bundled ENABLE1 dictionary.
 *
 * Returns `true` if the word is found; `false` otherwise.
 *
 * @throws Error if `loadDictionary()` has not been called yet (startup omission).
 */
export function isValidWordSync(word: string): boolean {
  if (wordSet === null) {
    throw new Error(
      'Dictionary has not been loaded. Call loadDictionary() at application startup.',
    );
  }
  const normalized = word.trim().toLowerCase();
  if (normalized.length === 0 || !/^[a-z]+$/.test(normalized)) {
    return false;
  }
  return wordSet.has(normalized);
}

/** Async wrapper — satisfies the WordValidator interface. */
export async function isValidWord(word: string): Promise<boolean> {
  return isValidWordSync(word);
}

/** Interface for dependency injection in tests and future providers. */
export interface WordValidator {
  isValidWord(word: string): Promise<boolean>;
}

/** Default implementation using the locally-bundled ENABLE1 dictionary. */
export const localDictionaryValidator: WordValidator = {
  isValidWord,
};

/**
 * @deprecated Use `localDictionaryValidator` instead.
 * Kept for backwards-compatibility with existing code that references this name.
 */
export const dictionaryApiValidator: WordValidator = localDictionaryValidator;
