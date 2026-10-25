'use client';

import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { GamingProfile, RegisterUserInput } from '@recess/shared';

import { ApiClientError, fetchCurrentUser, registerUser, sendPlayerHeartbeat } from '@/lib/api-client';
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
      if (identity.sessionToken.startsWith('offline_')) return null;
      try {
        const auth = await fetchCurrentUser(identity.sessionToken);
        if (auth?.profile) {
          const updated: StoredIdentity = {
            sessionToken: identity.sessionToken,
            profile: auth.profile,
            expiresAt: identity.expiresAt,
          };
          storeIdentity(updated);
          setStored(updated);
        }
        return auth;
      } catch (err) {
        // Only bubble UNAUTHORIZED so local token is cleared if the server explicitly rejected it;
        // network/timeout errors on tunnels are handled gracefully without clearing stored identity
        if (err instanceof ApiClientError && err.code === 'UNAUTHORIZED') {
          throw err;
        }
        return null;
      }
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

  // Send heartbeat while logged in to maintain live telemetry
  useEffect(() => {
    const token = stored?.sessionToken;
    if (!token || token.startsWith('offline_')) return;
    void sendPlayerHeartbeat(token);
    const interval = setInterval(() => {
      void sendPlayerHeartbeat(token);
    }, 60000);
    return () => clearInterval(interval);
  }, [stored?.sessionToken]);

  const register = useMutation({
    mutationFn: (input: string | RegisterUserInput) => registerUser(input),
    retry: false,
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
    onError: () => {
      // Handled gracefully with local identity persistence
    },
  });

  const signOut = useCallback(() => {
    clearStoredIdentity();
    setStored(null);
    queryClient.removeQueries({ queryKey: IDENTITY_QUERY_KEY });
  }, [queryClient]);

  const isWhatsAppConnected = Boolean(
    stored?.profile?.whatsappVerified || stored?.profile?.maskedWhatsApp,
  );

  return {
    profile: (stored?.profile ?? null) as GamingProfile | null,
    sessionToken: stored?.sessionToken ?? null,
    isVerifying: stored !== null && meQuery.isPending,
    isWhatsAppConnected,
    register,
    signOut,
  };
}
