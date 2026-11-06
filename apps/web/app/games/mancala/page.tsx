'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { createGameSession, ApiClientError } from '@/lib/api-client';
import { useIdentity } from '@/hooks/use-identity';
import { RegisterCard } from '@/components/identity/RegisterCard';
import { triggerHaptic } from '@/lib/haptics';

export default function MancalaLobbyPage() {
  const router = useRouter();
  const { profile, sessionToken, register } = useIdentity();
  const [isCreating, setIsCreating] = useState(false);
  const [isBotStarting, setIsBotStarting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleStartMatch = async () => {
    if (!sessionToken || isCreating) return;
    triggerHaptic('light');
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

  const handlePlayBot = () => {
    triggerHaptic('light');
    setIsBotStarting(true);
    router.push('/games/mancala/demo-match');
  };

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 pb-28 space-y-6 sm:px-6">
      {/* Header */}
      <header className="flex items-center gap-3.5">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#16161A] border border-white/[0.06]">
          <svg className="w-5 h-5 text-[#C8B28A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="6" width="18" height="12" rx="6" stroke="currentColor" />
            <circle cx="8" cy="12" r="1.5" fill="currentColor" />
            <circle cx="12" cy="12" r="1.5" fill="currentColor" />
            <circle cx="16" cy="12" r="1.5" fill="currentColor" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-medium tracking-tight text-[#F4F4F0]">
            Mancala Royale
          </h1>
          <p className="text-xs text-[#8E8E93]">
            Ayoayo and Kalah-6 tactical seed sowing duels.
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
          <section className="rounded-2xl border border-white/[0.06] bg-[#121214] p-5 space-y-3">
            <span className="text-[10px] font-medium uppercase tracking-widest text-[#8E8E93]">
              Rules of Ayoayo & Kalah
            </span>
            <h2 className="text-sm font-medium text-[#F4F4F0]">Classic 14-Pit Sowing</h2>
            <ul className="text-xs text-[#8E8E93] space-y-2 list-disc list-inside">
              <li>Each player commands 6 pits and 1 large Kalah store.</li>
              <li>Sow seeds counter-clockwise into consecutive pits.</li>
              <li>Landing your last seed in your own store grants an <strong className="text-[#F4F4F0]">Extra Turn</strong>.</li>
              <li>Landing in an empty pit on your side <strong className="text-[#F4F4F0]">captures</strong> all opponent opposite seeds.</li>
            </ul>
          </section>

          {/* Action Launchers */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isCreating || isBotStarting}
              onClick={handleStartMatch}
              className="w-full py-3.5 rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] font-medium text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isCreating ? (
                <>
                  <span className="h-4 w-4 rounded-full border-2 border-[#0A0A0B] border-t-transparent animate-spin" />
                  <span>Setting up board...</span>
                </>
              ) : (
                <span>Create Match & Invite via WhatsApp</span>
              )}
            </button>

            <button
              type="button"
              disabled={isCreating || isBotStarting}
              onClick={handlePlayBot}
              className="w-full py-3 rounded-xl border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] text-[#E4E4E0] font-medium text-sm text-center flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isBotStarting ? (
                <>
                  <span className="h-3.5 w-3.5 rounded-full border-2 border-[#E4E4E0] border-t-transparent animate-spin" />
                  <span>Loading Bot Arena...</span>
                </>
              ) : (
                <span>Play vs Smart Bot</span>
              )}
            </button>

            {errorMessage && (
              <p className="text-xs text-rose-400 text-center font-medium">{errorMessage}</p>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
