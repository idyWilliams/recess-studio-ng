'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createGameSession, ApiClientError } from '@/lib/api-client';
import { useIdentity } from '@/hooks/use-identity';
import { RegisterCard } from '@/components/identity/RegisterCard';

export default function MancalaLobbyPage() {
  const router = useRouter();
  const { profile, sessionToken, register } = useIdentity();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartMatch = async () => {
    if (!sessionToken || isCreating) return;
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const session = await createGameSession(sessionToken, 'mancala');
      router.push(`/games/mancala/${session.publicId}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        router.push(`/games/mancala/demo-match`);
      }
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="flex items-center gap-3">
        <div
          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
          style={{
            background: 'linear-gradient(145deg, rgba(245,158,11,0.7) 0%, rgba(69,26,3,0.9) 100%)',
          }}
        >
          <span className="text-2xl">🪵</span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Mancala Royale
          </h1>
          <p className="text-xs text-white/60">
            Ayoayo & Kalah-6 tactical seed sowing duels.
          </p>
        </div>
      </header>

      {!profile ? (
        <RegisterCard
          title="Join Mancala Royale"
          description="Pick your gaming username — opponents see it on the carved board."
          isPending={register.isPending}
          error={register.error instanceof ApiClientError ? register.error.message : null}
          onRegister={(username) => register.mutate(username)}
        />
      ) : (
        <div className="space-y-5">
          {/* Rules Preview Card */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-card space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
              Rules of Ayoayo / Kalah
            </span>
            <h2 className="text-base font-black text-white">Classic 14-Pit Sowing</h2>
            <ul className="text-xs text-white/70 space-y-2 list-disc list-inside">
              <li>Each player commands 6 pits and 1 large Kalah store.</li>
              <li>Sow seeds counter-clockwise into consecutive pits.</li>
              <li>Landing your last seed in your own store grants an <strong>Extra Turn</strong>!</li>
              <li>Landing in an empty pit on your side <strong>captures</strong> all opponent opposite seeds!</li>
            </ul>
          </section>

          {/* Action Launchers */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isCreating}
              onClick={handleStartMatch}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-500 via-amber-600 to-emerald-600 text-white font-black text-base shadow-xl hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>{isCreating ? 'Creating Board...' : 'Create Match & Invite via WhatsApp'}</span>
              <span>⚔️</span>
            </button>

            <Link
              href="/games/mancala/demo-match"
              className="w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-sm text-center block transition-all"
            >
              ⚡ Play Solo vs Ayo Master Bot (Instant Play)
            </Link>

            {errorMessage && (
              <p className="text-xs text-rose-400 text-center font-medium">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
