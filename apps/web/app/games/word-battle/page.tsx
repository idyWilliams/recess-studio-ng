'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { ApiClientError } from '@/lib/api-client';
import { parseMatchCode } from '@/lib/word-battle-view';
import { useCreateGameSession } from '@/hooks/use-game-session';
import { useIdentity } from '@/hooks/use-identity';
import { RegisterCard } from '@/components/identity/RegisterCard';

/**
 * Word Battle lobby — the real entry point to the game. Creates a match via
 * POST /game-sessions or hands a parsed invite link to the arena route, which owns
 * joining. Platform chrome stays quiet; the arena owns the visual energy.
 */
export default function WordBattleLobbyPage() {
  const router = useRouter();
  const { profile, sessionToken, register } = useIdentity();
  const createSession = useCreateGameSession();

  const [joinInput, setJoinInput] = useState('');
  const [joinLinkError, setJoinLinkError] = useState<string | null>(null);

  const handleCreate = () => {
    if (!sessionToken || createSession.isPending) return;
    createSession.mutate(sessionToken, {
      onSuccess: (session) => {
        router.push(`/games/word-battle/${session.publicId}`);
      },
    });
  };

  const handleJoinByLink = () => {
    const publicId = parseMatchCode(joinInput);
    if (!publicId) {
      setJoinLinkError('That does not look like a Word Battle match link.');
      return;
    }
    setJoinLinkError(null);
    router.push(`/games/word-battle/${publicId}`);
  };

  const createError =
    createSession.error instanceof ApiClientError
      ? createSession.error.message
      : createSession.error
        ? 'Could not create a match — please try again.'
        : null;

  const registerError =
    register.error instanceof ApiClientError ? register.error.message : null;

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 space-y-6 sm:px-6">
      <header className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#16161A] border border-white/[0.06]">
          <svg className="w-5 h-5 text-[#C8B28A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" />
            <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" opacity="0.6" />
            <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" opacity="0.6" />
            <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight text-[#F4F4F0]">
            Word Battle
          </h1>
          <p className="text-xs text-[#8E8E93]">
            Turn-based vocabulary duels — 3 lives each, 15 seconds per turn.
          </p>
        </div>
      </header>

      {!profile ? (
        <RegisterCard
          title="Create your player profile"
          description="Pick a gaming username — opponents see it on the board, never your private account."
          isPending={register.isPending}
          error={registerError}
          onRegister={(username) => register.mutate(username)}
        />
      ) : (
        <>
          {/* Start a match */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#121214] p-5 space-y-3">
            <h2 className="text-sm font-medium text-[#F4F4F0]">
              Start a New Match
            </h2>
            <p className="text-xs text-[#8E8E93]">
              You take seat one and get an invite link to share with your opponent.
            </p>
            <div className="mt-3">
              <button
                type="button"
                disabled={createSession.isPending}
                onClick={handleCreate}
                className="w-full py-3.5 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {createSession.isPending ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-[#0A0A0B] border-t-transparent animate-spin" />
                    <span>Creating Match...</span>
                  </>
                ) : (
                  <span>Create New Match</span>
                )}
              </button>
            </div>
            {createError && (
              <p className="mt-2 text-xs font-medium text-rose-400" role="alert">
                {createError}
              </p>
            )}
          </section>

          {/* Join a match */}
          <section className="rounded-2xl border border-white/[0.06] bg-[#121214] p-5 space-y-3">
            <h2 className="text-sm font-medium text-[#F4F4F0]">
              Join a Match
            </h2>
            <p className="text-xs text-[#8E8E93]">
              Paste the invite link your opponent shared with you.
            </p>
            <form
              className="mt-3 flex flex-col gap-2 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                handleJoinByLink();
              }}
            >
              <input
                type="text"
                value={joinInput}
                onChange={(event) => setJoinInput(event.target.value)}
                placeholder="Paste match link…"
                aria-label="Match invite link"
                spellCheck={false}
                className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#18181B] px-3.5 py-2.5 text-sm font-medium text-[#F4F4F0] placeholder-[#52525B] outline-none transition-colors focus:border-white/30"
              />
              <button
                type="submit"
                className="rounded-xl border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] px-4 py-2.5 text-sm font-medium text-[#E4E4E0] transition-colors"
              >
                Go to Match
              </button>
            </form>
            {joinLinkError && (
              <p className="mt-2 text-xs font-medium text-rose-400" role="alert">
                {joinLinkError}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
