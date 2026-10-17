'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@recess/ui';

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
      <header className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background:
              'linear-gradient(145deg, rgba(108,56,255,0.55) 0%, rgba(27,118,255,0.35) 100%)',
          }}
        >
          <img
            src="/assets/games/word-battle/icons/word-battle-sword.svg"
            alt=""
            aria-hidden="true"
            className="h-6 w-6"
          />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-recess-text-primary sm:text-3xl">
            Word Battle
          </h1>
          <p className="text-xs text-recess-text-secondary">
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
          <section className="rounded-2xl border border-recess-cream-border bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-recess-text-primary">
              Start a New Match
            </h2>
            <p className="mt-1 text-xs text-recess-text-secondary">
              You take seat one and get an invite link to share with your opponent.
            </p>
            <div className="mt-3">
              <Button
                size="lg"
                fullWidth
                isLoading={createSession.isPending}
                onClick={handleCreate}
              >
                Create New Match
              </Button>
            </div>
            {createError && (
              <p className="mt-2 text-xs font-semibold text-recess-error" role="alert">
                {createError}
              </p>
            )}
          </section>

          {/* Join a match */}
          <section className="rounded-2xl border border-recess-cream-border bg-white p-5 shadow-card">
            <h2 className="text-sm font-bold text-recess-text-primary">
              Join a Match
            </h2>
            <p className="mt-1 text-xs text-recess-text-secondary">
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
                className="min-w-0 flex-1 rounded-xl border border-recess-cream-border bg-recess-cream px-3 py-2.5 text-sm font-semibold text-recess-text-primary placeholder:text-recess-text-muted outline-none transition-colors focus:ring-2 focus:ring-recess-purple"
              />
              <Button type="submit" variant="secondary" size="md">
                Go to Match
              </Button>
            </form>
            {joinLinkError && (
              <p className="mt-2 text-xs font-semibold text-recess-error" role="alert">
                {joinLinkError}
              </p>
            )}
          </section>
        </>
      )}
    </main>
  );
}
