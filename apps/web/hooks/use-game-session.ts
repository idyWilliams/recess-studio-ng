'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { WordBattleMove } from '@recess/game-word-battle';

import {
  createWordBattleSession,
  fetchGameSession,
  joinGameSession,
  requestTurnExpiry,
  submitGameMove,
  type WordBattleSession,
} from '@/lib/api-client';

/**
 * Session polling interval while a match is live. This is the synchronization
 * mechanism both clients use to converge: every read is a full server-authoritative
 * snapshot (and the server lazily reconciles expired turns on read, per ADR-007).
 */
const LIVE_POLL_INTERVAL_MS = 1_500;

export function gameSessionQueryKey(publicId: string) {
  return ['game-session', publicId] as const;
}

/** Creates a new waiting Word Battle session (used by the lobby). */
export function useCreateGameSession() {
  return useMutation({
    mutationFn: (sessionToken: string) => createWordBattleSession(sessionToken),
  });
}

/**
 * Live session state plus the mutations for the gameplay loop. Successful mutation
 * responses are written straight into the query cache so the UI updates from the
 * confirmed server response instead of local predictions. Mutations are never retried
 * automatically (see QueryProvider defaults).
 */
export function useGameSession(publicId: string) {
  const queryClient = useQueryClient();

  const sessionQuery = useQuery({
    queryKey: gameSessionQueryKey(publicId),
    queryFn: () => fetchGameSession(publicId),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === 'waiting' || status === 'active'
        ? LIVE_POLL_INTERVAL_MS
        : false;
    },
    // Async duels: keep converging even when the tab is backgrounded.
    refetchIntervalInBackground: true,
    retry: false,
  });

  const setSession = (session: WordBattleSession) => {
    queryClient.setQueryData(gameSessionQueryKey(publicId), session);
  };

  const joinSession = useMutation({
    mutationFn: (sessionToken: string) => joinGameSession(sessionToken, publicId),
    onSuccess: setSession,
  });

  const submitMove = useMutation({
    mutationFn: (input: {
      sessionToken: string;
      move: WordBattleMove;
      expectedStateVersion: number;
    }) =>
      submitGameMove(
        input.sessionToken,
        publicId,
        input.move,
        input.expectedStateVersion,
      ),
    onSuccess: setSession,
  });

  const expireTurn = useMutation({
    mutationFn: (input: { sessionToken: string; expectedStateVersion: number }) =>
      requestTurnExpiry(input.sessionToken, publicId, input.expectedStateVersion),
    onSuccess: setSession,
    // TURN_NOT_EXPIRED (client clock slightly ahead) and STALE_GAME_STATE (another
    // client, a move, or the sweeper already reconciled) are both benign outcomes:
    // the authoritative state arrives with the next poll. Refresh to speed that up.
    onError: () => {
      void sessionQuery.refetch();
    },
  });

  return {
    session: (sessionQuery.data ?? null) as WordBattleSession | null,
    sessionQuery,
    joinSession,
    submitMove,
    expireTurn,
    refreshSession: sessionQuery.refetch,
  };
}
