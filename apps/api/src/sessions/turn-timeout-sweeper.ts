import type { SessionService } from './session-service.js';

/** Minimal logger surface the sweeper needs (satisfied by Fastify's logger). */
export interface SweepLogger {
  error: (payload: Record<string, unknown>, message: string) => void;
}

export interface TurnTimeoutSweeperOptions {
  /** Milliseconds between sweep ticks. */
  intervalMs?: number | undefined;
  /** Maximum sessions reconciled per tick (bounds DB work per interval). */
  batchSize?: number | undefined;
  logger?: SweepLogger | undefined;
}

/**
 * Bounded background timeout sweeper (ADR-007).
 *
 * Periodically asks the session service to reconcile active sessions whose persisted turn
 * deadline has passed. The sweeper itself contains no game or persistence logic — every
 * transition goes through the same authoritative service path used by lazy read/move
 * reconciliation, so running one or many sweepers (or none, with only lazy reconciliation)
 * can never double-apply a timeout: each turn is consumed at most once via the repository's
 * optimistic-locking CAS and the `game_moves` unique index.
 *
 * Ticks never overlap within a process (an in-flight sweep is skipped, not queued), each
 * tick is bounded by `batchSize`, and a failing tick logs and retries next interval without
 * touching any state.
 */
export class TurnTimeoutSweeper {
  private readonly intervalMs: number;
  private readonly batchSize: number;
  private readonly logger: SweepLogger | undefined;
  private timer: NodeJS.Timeout | null = null;
  private inFlight: Promise<unknown> | null = null;

  constructor(
    private readonly service: SessionService,
    options: TurnTimeoutSweeperOptions = {},
  ) {
    this.intervalMs = options.intervalMs ?? 1_000;
    this.batchSize = options.batchSize ?? 50;
    this.logger = options.logger;
  }

  /** Starts the interval timer. Idempotent: an already-started sweeper is left running. */
  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.tick();
    }, this.intervalMs);
    // Never keep the process alive on its own; shutdown owns the lifecycle.
    this.timer.unref();
  }

  /** Stops the timer and waits for any in-flight sweep to finish (clean shutdown). */
  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    if (this.inFlight) {
      await this.inFlight;
    }
  }

  private tick(): void {
    // Skip — never queue — ticks while work is still in flight, so a slow database
    // cannot accumulate overlapping sweeps within one process.
    if (this.inFlight) return;
    const work = this.sweepOnce();
    this.inFlight = work;
    void work.finally(() => {
      if (this.inFlight === work) {
        this.inFlight = null;
      }
    });
  }

  /**
   * One deterministic sweep pass, exposed for tests (no timers involved). Never throws:
   * per-session failures are reported to the logger and the next tick retries.
   */
  async sweepOnce(): Promise<{ scanned: number; reconciled: number }> {
    try {
      return await this.service.reconcileExpiredTurns(
        this.batchSize,
        (error, context) => {
          this.logger?.error(
            { err: error, sessionId: context.sessionId },
            'Turn timeout reconciliation failed for session',
          );
        },
      );
    } catch (error) {
      // e.g. database outage: log and retry next tick; no state was touched.
      this.logger?.error({ err: error }, 'Turn timeout sweep failed');
      return { scanned: 0, reconciled: 0 };
    }
  }
}
