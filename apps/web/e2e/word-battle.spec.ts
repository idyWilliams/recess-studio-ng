/**
 * Real two-player Word Battle integration tests.
 *
 * These drive the actual Next.js frontend against the actual Fastify API (same
 * setup `yarn dev` provides) with two isolated browser contexts — one per player.
 * No mocks: moves go through POST /game-sessions/:publicId/moves, state converges
 * through the session polling loop, and every assertion reads the server-confirmed
 * UI state.
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';

import {
  expect,
  test,
  type BrowserContext,
  type Page,
  type APIRequestContext,
} from '@playwright/test';

const API_BASE = 'http://localhost:4000';

interface RegisteredPlayer {
  sessionToken: string;
  profile: { userId: string; username: string; avatarUrl: string | null };
  expiresAt: string;
}

let runCounter = 0;

function uniqueUsername(prefix: string): string {
  runCounter += 1;
  return `${prefix}${Date.now().toString(36)}${runCounter}`.slice(0, 32);
}

/** Registers a real player through the API (faster and stabler than the UI form). */
async function registerViaApi(
  request: APIRequestContext,
  username: string,
): Promise<RegisteredPlayer> {
  const response = await request.post(`${API_BASE}/auth/register`, {
    data: { username },
  });
  expect(response.status(), 'registration should succeed').toBe(201);
  return (await response.json()) as RegisteredPlayer;
}

/** Seeds a browser context's localStorage with a registered identity. */
async function seedIdentity(
  context: BrowserContext,
  player: RegisteredPlayer,
): Promise<void> {
  await context.addInitScript((identity) => {
    window.localStorage.setItem('recess.identity', JSON.stringify(identity));
  }, {
    sessionToken: player.sessionToken,
    profile: player.profile,
    expiresAt: player.expiresAt,
  });
}

/** Creates and starts a real match between two API-registered players. */
async function createActiveMatch(
  request: APIRequestContext,
): Promise<{ playerOne: RegisteredPlayer; playerTwo: RegisteredPlayer; publicId: string }> {
  const playerOne = await registerViaApi(request, uniqueUsername('p1'));
  const playerTwo = await registerViaApi(request, uniqueUsername('p2'));

  const created = await request.post(`${API_BASE}/game-sessions`, {
    headers: { Authorization: `Bearer ${playerOne.sessionToken}` },
    data: { gameId: 'word-battle' },
  });
  expect(created.status(), 'session creation should succeed').toBe(201);
  const { publicId } = (await created.json()) as { publicId: string };

  const joined = await request.post(`${API_BASE}/game-sessions/${publicId}/join`, {
    headers: { Authorization: `Bearer ${playerTwo.sessionToken}` },
    data: {},
  });
  expect(joined.status(), 'join should start the match').toBe(200);
  const session = (await joined.json()) as { status: string };
  expect(session.status).toBe('active');

  return { playerOne, playerTwo, publicId };
}

// ── Board helpers ───────────────────────────────────────────────────────────

/** Reads the 16 displayed tile letters in row-major order from the aria-labels. */
async function readBoardLetters(page: Page): Promise<string[]> {
  return page.$$eval('button[aria-label^="Letter "]', (nodes) =>
    nodes.map((node) => {
      const match = (node.getAttribute('aria-label') ?? '').match(/^Letter ([A-Z])/);
      return match?.[1] ?? '';
    }),
  );
}

async function tileAt(page: Page, cellIndex: number): Promise<void> {
  await page.locator('button[aria-label^="Letter "]').nth(cellIndex).click();
}

async function submitWord(page: Page): Promise<void> {
  await page.getByRole('button', { name: /Submit Word/ }).click();
}

// ── Dictionary helpers (test-side only — the app never duplicates game rules) ──

function loadDictionarySet(): Set<string> {
  const candidates = [
    path.resolve(process.cwd(), 'apps/api/data/enable1.txt'),
    path.resolve(process.cwd(), '../../apps/api/data/enable1.txt'),
  ];
  const file = candidates.find((candidate) => existsSync(candidate));
  if (!file) {
    throw new Error('enable1.txt not found relative to the test working directory');
  }
  return new Set(
    readFileSync(file, 'utf8')
      .split(/\r?\n/)
      .map((word) => word.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Finds a short dictionary word that is formable on the given board with a connected
 * path (orthogonal steps, no tile reuse — a subset of the server's own path rules).
 * Returns the word and the row-major cell indices to tap, or null.
 */
function findFormableWord(
  letters: string[],
  dictionary: Set<string>,
): { word: string; cells: number[] } | null {
  if (letters.length !== 16) return null;
  const grid: string[][] = [];
  for (let row = 0; row < 4; row++) {
    grid.push(letters.slice(row * 4, row * 4 + 4).map((letter) => letter.toLowerCase()));
  }
  const boardLetters = new Set(grid.flat());
  const candidates = [...dictionary]
    .filter(
      (word) =>
        word.length >= 3 &&
        word.length <= 9 &&
        /^[a-z]+$/.test(word) &&
        [...word].every((letter) => boardLetters.has(letter)),
    )
    .sort((a, b) => a.length - b.length);

  const neighbors = (row: number, col: number): Array<[number, number]> =>
    (
      [
        [row - 1, col],
        [row + 1, col],
        [row, col - 1],
        [row, col + 1],
      ] as Array<[number, number]>
    ).filter(([r, c]) => r >= 0 && r < 4 && c >= 0 && c < 4);

  for (const word of candidates) {
    const found: Array<[number, number]> = [];
    const used: boolean[][] = Array.from({ length: 4 }, () => Array(4).fill(false));

    const search = (row: number, col: number, index: number): boolean => {
      const rowUsed = used[row];
      const rowLetters = grid[row];
      if (!rowUsed || !rowLetters || rowLetters[col] !== word[index]) {
        return false;
      }
      found.push([row, col]);
      rowUsed[col] = true;
      if (index === word.length - 1) return true;
      for (const [nextRow, nextCol] of neighbors(row, col)) {
        if (!used[nextRow]?.[nextCol] && search(nextRow, nextCol, index + 1)) {
          return true;
        }
      }
      found.pop();
      rowUsed[col] = false;
      return false;
    };

    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 4; col++) {
        if (search(row, col, 0)) {
          return { word, cells: found.map(([r, c]) => r * 4 + c) };
        }
      }
    }
  }
  return null;
}

const dictionary = loadDictionarySet();

/** Plays one turn: find a formable word, tap its path, submit, and confirm the move. */
async function playFormableWord(page: Page): Promise<{ word: string } | null> {
  const letters = await readBoardLetters(page);
  const found = findFormableWord(letters, dictionary);
  if (!found) return null;

  for (const cell of found.cells) {
    await tileAt(page, cell);
  }
  // The word bar shows the tapped letters (tiles are uppercase on the server board).
  await expect(page.getByText(found.word.toUpperCase())).toBeVisible();
  await submitWord(page);
  // History words are server-normalized to lowercase.
  await expect(
    page.getByText(new RegExp(`"${found.word}" accepted!`)),
  ).toBeVisible({ timeout: 10_000 });
  return { word: found.word };
}

/** Plays a guaranteed-penalty turn: three mutually non-adjacent tiles. */
async function playDisconnectedPenalty(page: Page): Promise<void> {
  // Cells 0 (0,0), 2 (0,2), 8 (2,0): consecutive picks are never adjacent, so the
  // submitted path cannot be validated. The word formed from random letters is also
  // usually not in the dictionary — either way the server records a 1-life penalty.
  const PENALTY_CELLS = [0, 2, 8];
  for (const cell of PENALTY_CELLS) {
    await tileAt(page, cell);
  }
  await submitWord(page);
  await expect(page.getByText(/−1 life/)).toBeVisible({ timeout: 10_000 });
}

// ── Tests ───────────────────────────────────────────────────────────────────

test.describe('Word Battle lobby', () => {
  test('registers through the UI, creates a match, and lands in the waiting room', async ({
    page,
  }) => {
    await page.goto('/games/word-battle');

    await page.getByLabel('Username').fill(uniqueUsername('lobby'));
    await page.getByRole('button', { name: 'Create Profile' }).click();
    await expect(page.getByRole('button', { name: 'Create New Match' })).toBeVisible({
      timeout: 10_000,
    });

    await page.getByRole('button', { name: 'Create New Match' }).click();
    await page.waitForURL(/\/games\/word-battle\/[0-9a-f]{12}$/, {
      timeout: 10_000,
    });

    await expect(page.getByText('Invite a Friend')).toBeVisible();
    await expect(page.getByLabel('Match invite link')).toHaveValue(
      page.url(),
    );
    await expect(
      page.getByText('You are in! Waiting for your opponent to join…'),
    ).toBeVisible();
    await expect(page.getByText('Waiting for player to join...')).toBeVisible();
  });
});

test.describe('Word Battle live match', () => {
  test('two players create, join, converge, time out, and finish by knockout', async ({
    browser,
    request,
  }) => {
    test.setTimeout(240_000);

    const { playerOne, playerTwo, publicId } = await createActiveMatch(request);
    const contextOne = await browser.newContext();
    const contextTwo = await browser.newContext();
    await seedIdentity(contextOne, playerOne);
    await seedIdentity(contextTwo, playerTwo);
    const pageOne = await contextOne.newPage();
    const pageTwo = await contextTwo.newPage();

    try {
      // Both clients load the same server-authoritative active session.
      await pageOne.goto(`/games/word-battle/${publicId}`);
      await pageTwo.goto(`/games/word-battle/${publicId}`);
      await expect(pageOne.getByText('Your turn')).toBeVisible({ timeout: 15_000 });
      await expect(
        pageTwo.getByText(`Waiting for ${playerOne.profile.username}...`),
      ).toBeVisible({ timeout: 15_000 });
      await expect(pageOne.locator('button[aria-label^="Letter "]')).toHaveCount(16);
      await expect(pageTwo.locator('button[aria-label^="Letter "]')).toHaveCount(16);

      // Turn 1 — player one plays a real dictionary word from the live board.
      const lettersBefore = await readBoardLetters(pageOne);
      const played = await playFormableWord(pageOne);
      test.info().annotations.push({
        type: 'turn-1',
        description: played ? `accepted word: ${played.word}` : 'no formable word found',
      });

      // The accepted move changed the board (consumed tiles + gravity + refill).
      if (played) {
        await expect
          .poll(async () => (await readBoardLetters(pageOne)).join(''), {
            timeout: 10_000,
          })
          .not.toBe(lettersBefore.join(''));
      }

      // Player two converges via polling: same board and their turn.
      await expect(pageTwo.getByText('Your turn')).toBeVisible({ timeout: 15_000 });
      if (played) {
        await expect
          .poll(async () => (await readBoardLetters(pageTwo)).join(''), {
            timeout: 10_000,
          })
          .toBe((await readBoardLetters(pageOne)).join(''));
      }

      // Turn 2 — player two lets the 15s deadline lapse: the server reconciles the
      // timeout (1 life, turn passes) and both clients converge on the penalty.
      await expect(pageOne.getByText('Your turn')).toBeVisible({ timeout: 30_000 });
      await expect(pageOne.getByText('Timeout').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(pageTwo.getByText('Timeout').first()).toBeVisible({
        timeout: 20_000,
      });

      // Turns 3+ — player one keeps finding real words while player two keeps
      // submitting disconnected paths until the server knocks someone out.
      let winnerPage: Page | null = null;
      for (let round = 0; round < 16 && !winnerPage; round++) {
        const oneTurn = pageOne.getByText('Your turn');
        if (await oneTurn.isVisible().catch(() => false)) {
          if (!(await playFormableWord(pageOne))) {
            await playDisconnectedPenalty(pageOne);
          }
        }
        if (await pageOne.getByLabel('Match result').isVisible().catch(() => false)) {
          winnerPage = pageOne;
          break;
        }

        const twoTurn = pageTwo.getByText('Your turn');
        if (await twoTurn.isVisible().catch(() => false)) {
          await playDisconnectedPenalty(pageTwo);
        }
        if (await pageTwo.getByLabel('Match result').isVisible().catch(() => false)) {
          winnerPage = pageTwo;
          break;
        }
      }

      // The match completed: both clients show the same server-confirmed result.
      await expect(pageOne.getByLabel('Match result')).toBeVisible({
        timeout: 20_000,
      });
      await expect(pageTwo.getByLabel('Match result')).toBeVisible({
        timeout: 20_000,
      });
      const resultTextOne = await pageOne.getByLabel('Match result').innerText();
      const resultTextTwo = await pageTwo.getByLabel('Match result').innerText();
      expect(resultTextOne).toContain('takes the duel');
      expect(resultTextTwo).toContain('takes the duel');
      expect(resultTextOne).toContain('KO');
    } finally {
      await contextOne.close().catch(() => undefined);
      await contextTwo.close().catch(() => undefined);
    }
  });

  test('prevents duplicate submissions while a move is pending', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { playerOne, playerTwo, publicId } = await createActiveMatch(request);
    const contextOne = await browser.newContext();
    await seedIdentity(contextOne, playerOne);
    const pageOne = await contextOne.newPage();

    let moveRequests = 0;
    const SLOW_MOVE_DELAY_MS = 1_500;
    await pageOne.route('**/backend/game-sessions/*/moves', async (route) => {
      moveRequests += 1;
      await new Promise((resolve) => setTimeout(resolve, SLOW_MOVE_DELAY_MS));
      await route.continue();
    });

    try {
      await pageOne.goto(`/games/word-battle/${publicId}`);
      await expect(pageOne.getByText('Your turn')).toBeVisible({ timeout: 15_000 });

      await tileAt(pageOne, 0);
      await tileAt(pageOne, 1);
      await tileAt(pageOne, 2);
      await submitWord(pageOne);

      // While the request is in flight the submit control is disabled — repeated
      // clicks cannot fire a second move, and exactly one request hits the network.
      await expect(
        pageOne.getByRole('button', { name: /Submit Word/ }),
      ).toBeDisabled();
      await pageOne.waitForTimeout(SLOW_MOVE_DELAY_MS - 400);
      expect(moveRequests).toBe(1);

      // Recovery after the response: the server-confirmed outcome lands (these cells
      // may or may not spell a word — either outcome is authoritative) and the turn
      // passes per the server state.
      await expect(pageOne.getByText(/accepted!|−1 life/)).toBeVisible({
        timeout: 10_000,
      });
      await expect(
        pageOne.getByText(`Waiting for ${playerTwo.profile.username}...`),
      ).toBeVisible({ timeout: 10_000 });
      expect(moveRequests).toBe(1);
    } finally {
      await contextOne.close().catch(() => undefined);
    }
  });

  test('a network failure does not fabricate a successful move', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { playerOne, publicId } = await createActiveMatch(request);
    const contextOne = await browser.newContext();
    await seedIdentity(contextOne, playerOne);
    const pageOne = await contextOne.newPage();

    await pageOne.route('**/backend/game-sessions/*/moves', (route) =>
      route.abort('failed'),
    );

    try {
      await pageOne.goto(`/games/word-battle/${publicId}`);
      await expect(pageOne.getByText('Your turn')).toBeVisible({ timeout: 15_000 });

      await tileAt(pageOne, 0);
      await tileAt(pageOne, 1);
      await tileAt(pageOne, 2);
      await submitWord(pageOne);

      // The failure is reported honestly — no fabricated success.
      await expect(
        pageOne.getByText(
          'Your word was not submitted — connection error. Try again.',
        ),
      ).toBeVisible({ timeout: 15_000 });

      // The selection survived so the player can retry when back online, and the
      // server state is untouched (it is still this player's turn).
      await expect(pageOne.locator('button[aria-pressed="true"]')).toHaveCount(3);
      await expect(pageOne.getByText('Your turn')).toBeVisible();

      // Back online: the same selection submits successfully.
      await pageOne.unroute('**/backend/game-sessions/*/moves');
      await submitWord(pageOne);
      await expect(
        pageOne.locator('[role="status"]').filter({
          hasText: /accepted!|−1 life/,
        }),
      ).toBeVisible({ timeout: 15_000 });
    } finally {
      await contextOne.close().catch(() => undefined);
    }
  });

  test('stale-state conflicts trigger a safe refresh', async ({
    browser,
    request,
  }) => {
    test.setTimeout(180_000);

    const { playerOne, playerTwo, publicId } = await createActiveMatch(request);
    const contextOne = await browser.newContext();
    const contextTwo = await browser.newContext();
    await seedIdentity(contextOne, playerOne);
    await seedIdentity(contextTwo, playerTwo);
    const pageOne = await contextOne.newPage();
    const pageTwo = await contextTwo.newPage();

    try {
      await pageOne.goto(`/games/word-battle/${publicId}`);
      await pageTwo.goto(`/games/word-battle/${publicId}`);
      await expect(pageOne.getByText('Your turn')).toBeVisible({ timeout: 15_000 });

      // Freeze player one's reads on the first response so their client keeps a
      // stale snapshot while the world moves on. Move submissions (POST) still pass.
      let cachedSessionPayload: string | null = null;
      await pageOne.route('**/backend/game-sessions/*', async (route) => {
        if (route.request().method() !== 'GET') {
          await route.continue();
          return;
        }
        if (cachedSessionPayload === null) {
          const response = await route.fetch();
          cachedSessionPayload = await response.text();
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: cachedSessionPayload,
        });
      });

      // The deadline expires while player one is frozen: the server applies the
      // timeout (player one loses a life, player two's turn starts).
      await expect(pageTwo.getByText('Your turn')).toBeVisible({ timeout: 30_000 });

      // Player one still believes it is their turn on the stale version and tries
      // to move; the server rejects the stale version with 409 STALE_GAME_STATE.
      await tileAt(pageOne, 0);
      await tileAt(pageOne, 1);
      await tileAt(pageOne, 2);
      await submitWord(pageOne);
      await expect(
        pageOne.getByText('The board changed — your word was not submitted.'),
      ).toBeVisible({ timeout: 15_000 });

      // The safe refresh adopts the server truth: the timeout is visible, and the
      // client no longer believes it is player one's turn.
      await pageOne.unroute('**/backend/game-sessions/*');
      await expect(pageOne.getByText('Timeout').first()).toBeVisible({
        timeout: 20_000,
      });
      await expect(
        pageOne.getByText(`Waiting for ${playerTwo.profile.username}...`),
      ).toBeVisible({ timeout: 20_000 });
    } finally {
      await contextOne.close().catch(() => undefined);
      await contextTwo.close().catch(() => undefined);
    }
  });

  test('mobile viewport preserves the approved layout', async ({
    browser,
    request,
  }) => {
    test.setTimeout(120_000);

    const { playerOne, publicId } = await createActiveMatch(request);
    const contextOne = await browser.newContext({
      viewport: { width: 375, height: 667 },
      isMobile: true,
      hasTouch: true,
    });
    await seedIdentity(contextOne, playerOne);
    const pageOne = await contextOne.newPage();

    try {
      await pageOne.goto(`/games/word-battle/${publicId}`);
      await expect(pageOne.getByText('Your turn')).toBeVisible({ timeout: 15_000 });

      // No horizontal overflow at 375px and the primary action stays reachable.
      await expect(pageOne.locator('button[aria-label^="Letter "]').first()).toBeVisible();
      const metrics = await pageOne.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      expect(metrics.scrollWidth).toBeLessThanOrEqual(metrics.innerWidth);

      await pageOne
        .getByRole('button', { name: /Submit Word/ })
        .scrollIntoViewIfNeeded();
      await expect(pageOne.getByRole('button', { name: /Submit Word/ })).toBeVisible();

      await pageOne.screenshot({ path: 'test-results/word-battle-mobile.png', fullPage: true });
    } finally {
      await contextOne.close().catch(() => undefined);
    }
  });

  test('shows a not-found state for an unknown match id', async ({ page }) => {
    await page.goto('/games/word-battle/000000000000');
    await expect(page.getByText('This match does not exist')).toBeVisible({
      timeout: 15_000,
    });
  });
});
