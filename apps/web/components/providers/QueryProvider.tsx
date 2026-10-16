'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

/**
 * App-wide React Query provider (the client's established data-fetching stack).
 *
 * Defaults are tuned for server-authoritative gameplay:
 * - No refetch-on-focus: session state converges through polling, and a focus refetch
 *   would race the in-flight poll rather than add information.
 * - No automatic retries: a failed request surfaces immediately as an error the UI can
 *   render honestly. Game-session polling recovers on its next tick, and move mutations
 *   must never auto-retry because a lost response is indistinguishable from a move the
 *   server already applied.
 */
export function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            retry: false,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
