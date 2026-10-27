'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createGameSession, ApiClientError } from '@/lib/api-client';
import { useIdentity } from '@/hooks/use-identity';
import { RegisterCard } from '@/components/identity/RegisterCard';

export default function LudoLobbyPage() {
  const router = useRouter();
  const { profile, sessionToken, register } = useIdentity();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartMatch = async () => {
    if (!sessionToken || isCreating) return;
    setIsCreating(true);
    setErrorMessage(null);

    try {
      const session = await createGameSession(sessionToken, 'ludo');
      router.push(`/games/ludo/${session.publicId}`);
    } catch (err) {
      if (err instanceof ApiClientError) {
        setErrorMessage(err.message);
      } else {
        router.push(`/games/ludo/demo-match`);
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
            background: 'linear-gradient(145deg, rgba(239,68,68,0.7) 0%, rgba(99,102,241,0.85) 100%)',
          }}
        >
          <span className="text-2xl">🎲</span>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            Ludo Arena
          </h1>
          <p className="text-xs text-white/60">
            Legendary 4-quadrant cross race with 3D dice rolls & knockouts.
          </p>
        </div>
      </header>

      {!profile ? (
        <RegisterCard
          title="Join Ludo Arena"
          description="Pick your gaming username — rival players see your token colors on the track."
          isPending={register.isPending}
          error={register.error instanceof ApiClientError ? register.error.message : null}
          onRegister={(username) => register.mutate(username)}
        />
      ) : (
        <div className="space-y-5">
          {/* Rules Overview Card */}
          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl shadow-card space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-indigo-400">
              Board Rules & Track Movement
            </span>
            <h2 className="text-base font-black text-white">Authentic Cross-Track Racing</h2>
            <ul className="text-xs text-white/70 space-y-2 list-disc list-inside">
              <li>Roll a <strong>6</strong> to exit the Home Yard onto your starting square!</li>
              <li>Safe Stars (★) protect your tokens from rival captures.</li>
              <li>Landing on an opponent on an open track <strong>knocks them back</strong> to their yard!</li>
              <li>First player to navigate all 4 tokens into the central Crown Zone wins!</li>
            </ul>
          </section>

          {/* Action Launchers */}
          <div className="space-y-3">
            <button
              type="button"
              disabled={isCreating}
              onClick={handleStartMatch}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-indigo-600 to-emerald-500 text-white font-black text-base shadow-xl hover:opacity-95 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <span>{isCreating ? 'Setting Up Board...' : 'Create Match & Invite via WhatsApp'}</span>
              <span>⚔️</span>
            </button>

            <Link
              href="/games/ludo/demo-match"
              className="w-full py-3.5 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 text-white font-bold text-sm text-center block transition-all"
            >
              ⚡ Play Solo vs Ludo Bot (Instant Play)
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
