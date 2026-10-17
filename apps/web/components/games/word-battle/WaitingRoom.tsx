'use client';

import { useState } from 'react';

import { Button, PvPMatchup, type MatchupPlayer } from '@recess/ui';

interface WaitingRoomProps {
  matchupOne: MatchupPlayer;
  matchupTwo: MatchupPlayer | null;
  shareUrl: string;
  /** The viewer already holds a seat in this session. */
  isParticipant: boolean;
  /** The viewer has an identity and may join. */
  canJoin: boolean;
  joinPending: boolean;
  joinError: string | null;
  onJoin: () => void;
}

/**
 * Pre-match waiting room: seat map, shareable invite link, and the join control for
 * the invited player. Honest states only — "Waiting..." until the opponent actually
 * joins and the server starts the match.
 */
export function WaitingRoom({
  matchupOne,
  matchupTwo,
  shareUrl,
  isParticipant,
  canJoin,
  joinPending,
  joinError,
  onJoin,
}: WaitingRoomProps) {
  const [copied, setCopied] = useState(false);

  const copyShareLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable — the link stays visible in the input for manual copy.
    }
  };

  return (
    <>
      <PvPMatchup
        isDark
        roundInfo="Waiting Room"
        playerOne={matchupOne}
        playerTwo={matchupTwo}
      />

      <div
        className="rounded-xl p-3.5"
        style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.1)',
        }}
      >
        <span className="text-[10px] font-bold uppercase tracking-widest text-neutral-500">
          Invite a Friend
        </span>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="text"
            value={shareUrl}
            readOnly
            aria-label="Match invite link"
            onFocus={(event) => event.currentTarget.select()}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-white/10 px-2.5 py-2 text-[11px] text-neutral-300 outline-none"
          />
          <button
            type="button"
            onClick={copyShareLink}
            className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold text-white transition-transform active:scale-95"
            style={{
              background: 'rgba(108,56,255,0.35)',
              border: '1px solid rgba(108,56,255,0.5)',
            }}
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          The match starts the moment your opponent joins — 15 seconds per turn.
        </p>
      </div>

      {!isParticipant && (
        <div className="space-y-2">
          {canJoin ? (
            <Button
              variant="primary"
              size="lg"
              fullWidth
              isLoading={joinPending}
              onClick={onJoin}
            >
              Join Match
            </Button>
          ) : (
            <p className="rounded-xl px-3 py-2 text-center text-xs font-semibold text-recess-purple-light"
              style={{
                background: 'rgba(108,56,255,0.15)',
                border: '1px solid rgba(108,56,255,0.3)',
              }}
            >
              Create your player profile below to take the open seat.
            </p>
          )}
          {joinError && (
            <p className="text-center text-xs font-semibold text-rose-300" role="alert">
              {joinError}
            </p>
          )}
        </div>
      )}

      {isParticipant && (
        <p className="py-2 text-center text-xs font-semibold text-neutral-400">
          You are in! Waiting for your opponent to join…
        </p>
      )}
    </>
  );
}
