'use client';

import { useEffect, useState } from 'react';

import { getRemainingMs } from '@/lib/word-battle-view';

/**
 * Live milliseconds remaining on the persisted server deadline (null when there is no
 * deadline). Display-only: the value simply ticks down from the server-provided
 * timestamp — the server alone decides whether the turn has actually expired.
 */
export function useCountdownRemainingMs(
  deadlineIso: string | null | undefined,
): number | null {
  const [remainingMs, setRemainingMs] = useState<number | null>(() =>
    getRemainingMs(deadlineIso),
  );

  useEffect(() => {
    if (!deadlineIso || Number.isNaN(Date.parse(deadlineIso))) {
      setRemainingMs(null);
      return;
    }
    const tick = () => setRemainingMs(getRemainingMs(deadlineIso));
    tick();
    const intervalId = window.setInterval(tick, 250);
    return () => window.clearInterval(intervalId);
  }, [deadlineIso]);

  return remainingMs;
}
