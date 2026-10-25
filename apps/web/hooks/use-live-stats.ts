'use client';

import { useQuery } from '@tanstack/react-query';
import type { LivePlayerStatsResponse } from '@recess/shared';
import { fetchLivePlayerStats } from '@/lib/api-client';

export const LIVE_STATS_QUERY_KEY = ['live-player-stats'] as const;

export function useLiveStats() {
  const query = useQuery<LivePlayerStatsResponse>({
    queryKey: LIVE_STATS_QUERY_KEY,
    queryFn: fetchLivePlayerStats,
    refetchInterval: 15000, // Refresh every 15s for live telemetry
    staleTime: 10000,
  });

  return {
    stats: query.data ?? null,
    isLoading: query.isPending,
    isError: query.isError,
    refetch: query.refetch,
  };
}
