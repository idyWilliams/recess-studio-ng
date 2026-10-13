import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SessionService } from './sessions/session-service.js';
import { TurnTimeoutSweeper } from './sessions/turn-timeout-sweeper.js';

describe('TurnTimeoutSweeper (Stage 2)', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('sweepOnce forwards the configured batch size and returns sweep counters', async () => {
    const reconcile = vi.fn(async () => ({ scanned: 3, reconciled: 2 }));
    const service = { reconcileExpiredTurns: reconcile } as unknown as SessionService;
    const sweeper = new TurnTimeoutSweeper(service, { batchSize: 7 });

    const result = await sweeper.sweepOnce();

    expect(result).toEqual({ scanned: 3, reconciled: 2 });
    expect(reconcile).toHaveBeenCalledTimes(1);
    expect(reconcile).toHaveBeenCalledWith(7, expect.any(Function));
  });

  it('never overlaps ticks: a pending sweep skips later ticks instead of queueing', async () => {
    vi.useFakeTimers();
    let releaseSweep: (() => void) | null = null;
    const reconcile = vi.fn(
      () =>
        new Promise<{ scanned: number; reconciled: number }>((resolve) => {
          releaseSweep = () => {
            resolve({ scanned: 1, reconciled: 0 });
          };
        }),
    );
    const service = { reconcileExpiredTurns: reconcile } as unknown as SessionService;
    const sweeper = new TurnTimeoutSweeper(service, { intervalMs: 100 });

    sweeper.start();
    await vi.advanceTimersByTimeAsync(350); // three intervals elapse during one sweep

    expect(reconcile).toHaveBeenCalledTimes(1);

    releaseSweep!();
    await vi.advanceTimersByTimeAsync(100); // the next tick runs after the sweep completes
    expect(reconcile).toHaveBeenCalledTimes(2);

    releaseSweep!(); // release the second sweep so stop() can drain it
    await sweeper.stop();
  });

  it('stop clears the timer and waits for an in-flight sweep before resolving', async () => {
    vi.useFakeTimers();
    let releaseSweep: (() => void) | null = null;
    const reconcile = vi.fn(
      () =>
        new Promise<{ scanned: number; reconciled: number }>((resolve) => {
          releaseSweep = () => {
            resolve({ scanned: 0, reconciled: 0 });
          };
        }),
    );
    const service = { reconcileExpiredTurns: reconcile } as unknown as SessionService;
    const sweeper = new TurnTimeoutSweeper(service, { intervalMs: 50 });

    sweeper.start();
    await vi.advanceTimersByTimeAsync(50);
    expect(reconcile).toHaveBeenCalledTimes(1);

    let stopped = false;
    const stopping = sweeper.stop().then(() => {
      stopped = true;
    });

    await vi.advanceTimersByTimeAsync(500);
    expect(stopped).toBe(false); // still waiting for the in-flight sweep
    expect(reconcile).toHaveBeenCalledTimes(1); // and no further ticks were queued

    releaseSweep!();
    await stopping;
    expect(stopped).toBe(true);
  });

  it('logs and swallows sweep failures so the next tick can retry', async () => {
    const boom = new Error('database unavailable');
    const reconcile = vi.fn(async () => {
      throw boom;
    });
    const error = vi.fn();
    const service = { reconcileExpiredTurns: reconcile } as unknown as SessionService;
    const sweeper = new TurnTimeoutSweeper(service, { logger: { error } });

    const result = await sweeper.sweepOnce();

    expect(result).toEqual({ scanned: 0, reconciled: 0 });
    expect(error).toHaveBeenCalledWith({ err: boom }, 'Turn timeout sweep failed');
  });
});
