'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GamingProfile } from '@recess/shared';

import { ApiClientError, fetchCurrentUser, registerUser } from '@/lib/api-client';
import {
  clearStoredIdentity,
  loadStoredIdentity,
  storeIdentity,
  type StoredIdentity,
} from '@/lib/identity-store';

export const IDENTITY_QUERY_KEY = ['identity'] as const;

/**
 * Player identity for the current browser. Credentials live in localStorage and are
 * verified against GET /me on mount; an expired token clears the stored identity so the
 * UI can ask for registration again. Only the public GamingProfile is exposed for
 * rendering.
 */
export function useIdentity() {
  const [stored, setStored] = useState<StoredIdentity | null>(null);
  const queryClient = useQueryClient();

  // localStorage is browser-only: SSR renders signed-out and the effect syncs the real
  // state right after hydration.
  useEffect(() => {
    setStored(loadStoredIdentity());
  }, []);

  const meQuery = useQuery({
    queryKey: IDENTITY_QUERY_KEY,
    enabled: stored !== null,
    retry: false,
    queryFn: async () => {
      const identity = loadStoredIdentity();
      if (!identity) return null;
      return fetchCurrentUser(identity.sessionToken);
    },
  });

  // The stored token was rejected (expired/invalid) → sign the browser out locally.
  useEffect(() => {
    if (
      meQuery.error instanceof ApiClientError &&
      meQuery.error.code === 'UNAUTHORIZED'
    ) {
      clearStoredIdentity();
      setStored(null);
    }
  }, [meQuery.error]);

  const register = useMutation({
    mutationFn: (username: string) => registerUser(username),
    onSuccess: (response) => {
      const identity: StoredIdentity = {
        sessionToken: response.sessionToken,
        profile: response.profile,
        expiresAt: response.expiresAt,
      };
      storeIdentity(identity);
      setStored(identity);
      void queryClient.invalidateQueries({ queryKey: IDENTITY_QUERY_KEY });
    },
  });

  const signOut = useCallback(() => {
    clearStoredIdentity();
    setStored(null);
    queryClient.removeQueries({ queryKey: IDENTITY_QUERY_KEY });
  }, [queryClient]);

  return {
    profile: (stored?.profile ?? null) as GamingProfile | null,
    sessionToken: stored?.sessionToken ?? null,
    isVerifying: stored !== null && meQuery.isPending,
    register,
    signOut,
  };
}
