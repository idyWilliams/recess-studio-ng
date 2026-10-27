'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { WhatsAppMiniAppShell } from '@/components/shell/WhatsAppMiniAppShell';
import { MancalaBoardSvg } from '@/components/games/mancala/MancalaSvg';
import { GameResultOverlay } from '@/components/games/GameResultOverlay';
import { useIdentity } from '@/hooks/use-identity';
import { triggerHaptic } from '@/lib/haptics';
import {
  fetchGameSession,
  submitGameMove,
  ApiClientError,
} from '@/lib/api-client';
import {
  MancalaRulesEngine,
  type MancalaState,
  type MancalaMove,
  P1_PITS,
  P2_PITS,
} from '@recess/game-mancala';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';

const mancalaEngine = new MancalaRulesEngine();

export default function MancalaArenaPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = (params?.publicId as string) || 'demo-match';
  const isDemo = publicId === 'demo-match';

  const { profile, sessionToken } = useIdentity();
  const myUsername = profile?.username || 'You';

  const [session, setSession] = useState<any>(null);
  const [localState, setLocalState] = useState<MancalaState | null>(null);
  const [isBotPlaying, setIsBotPlaying] = useState(false);
  const [calloutToast, setCalloutToast] = useState<string | null>(null);

  // Initialize demo or fetch live match
  useEffect(() => {
    if (isDemo) {
      const initial = mancalaEngine.createInitialState([
        { id: 'player-0', displayName: myUsername },
        { id: 'bot-ayo', displayName: 'Ayo Master (Bot)' },
      ]);
      setLocalState(initial);
      setCalloutToast('🎮 Match Started! Tap any glowing pit on your side to sow');
    } else {
      let isMounted = true;
      const poll = async () => {
        try {
          const s = await fetchGameSession(publicId);
          if (isMounted) {
            setSession(s);
            if (s.state) {
              setLocalState(s.state as unknown as MancalaState);
            }
          }
        } catch {
          // ignore polling errors
        }
      };
      poll();
      const interval = setInterval(poll, 3000);
      return () => {
        isMounted = false;
        clearInterval(interval);
      };
    }
  }, [publicId, isDemo, myUsername]);

  const currentState = localState;
  const isMyTurn = currentState ? currentState.currentPlayerId === 'player-0' : false;
  const myPlayerIndex = 0; // Viewer is Player 0 (bottom row pits 0..5, right store 6)
  const activePlayerIndex = currentState?.currentPlayerId === 'player-0' ? 0 : 1;

  // Flash Callout Toast
  const triggerCallout = (text: string) => {
    setCalloutToast(text);
    triggerHaptic('medium');
    setTimeout(() => {
      setCalloutToast((prev) => (prev === text ? null : prev));
    }, 3200);
  };

  // Bot Turn Automation (in demo mode)
  useEffect(() => {
    if (
      isDemo &&
      currentState &&
      !currentState.isGameOver &&
      currentState.currentPlayerId === 'bot-ayo' &&
      !isBotPlaying
    ) {
      setIsBotPlaying(true);
      const timer = setTimeout(() => {
        try {
          // Find non-empty P2 pit (pits 7..12)
          // Heuristic: prioritize extra turn if last seed lands in pit 13
          const validPits = [7, 8, 9, 10, 11, 12].filter((p) => (currentState.pits[p] ?? 0) > 0);
          if (validPits.length === 0) return;

          let chosenPit = validPits[0]!;
          for (const p of validPits) {
            const count = currentState.pits[p]!;
            if ((p + count) % 14 === 13) {
              chosenPit = p; // Extra turn!
              break;
            }
          }

          const next = mancalaEngine.applyMove(
            currentState,
            { type: 'sow', pitIndex: chosenPit },
            'bot-ayo',
          );
          setLocalState(next);

          const lastHistory = next.history[next.history.length - 1];
          if (lastHistory?.grantedExtraTurn) {
            triggerCallout('🤖 Ayo Master landed in Kalah! EXTRA TURN!');
          } else if ((lastHistory?.capturedSeeds ?? 0) > 0) {
            triggerCallout(`💥 Ayo Master captured ${lastHistory?.capturedSeeds} seeds!`);
          }
        } catch {
          // pass on error
        } finally {
          setIsBotPlaying(false);
        }
      }, 1400);
      return () => clearTimeout(timer);
    }
  }, [isDemo, currentState, isBotPlaying]);

  // Handle Pit Click
  const handleSelectPit = async (pitIndex: number) => {
    if (!currentState || !isMyTurn || currentState.isGameOver) return;
    triggerHaptic('light');

    const move: MancalaMove = { type: 'sow', pitIndex };

    if (isDemo) {
      try {
        const next = mancalaEngine.applyMove(currentState, move, 'player-0');
        setLocalState(next);

        const lastHistory = next.history[next.history.length - 1];
        if (lastHistory?.grantedExtraTurn) {
          triggerCallout('✨ EXTRA TURN! Your last seed landed in your Kalah!');
        } else if ((lastHistory?.capturedSeeds ?? 0) > 0) {
          triggerCallout(`💥 CAPTURE! Swept ${lastHistory?.capturedSeeds} seeds into your store!`);
        }
      } catch (err: any) {
        triggerCallout(`⚠️ ${err?.message || 'Illegal Move'}`);
      }
    } else if (sessionToken) {
      try {
        const updated = await submitGameMove(
          sessionToken,
          publicId,
          move,
          session?.stateVersion ?? 0,
        );
        setSession(updated);
        setLocalState(updated.state as unknown as MancalaState);
      } catch (err: any) {
        triggerCallout(`⚠️ ${err?.message || 'Move failed'}`);
      }
    }
  };

  // Share Turn to WhatsApp
  const handleShareTurn = async () => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://recess.studio';
    const matchUrl = `${siteUrl}/games/mancala/${publicId}`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: 'Mancala Royale',
        headline: `${myUsername}'s Turn in Mancala Royale!`,
        statusBadge: '14-PIT AYOAYO DUEL',
        playerOne: {
          name: myUsername,
          score: currentState?.pits[6] ?? 0,
          isCurrentTurn: isMyTurn,
        },
        playerTwo: {
          name: 'Ayo Master',
          score: currentState?.pits[13] ?? 0,
          isCurrentTurn: !isMyTurn,
        },
      },
      shareTitle: 'Mancala Royale Duel on Recess',
      shareText: `🪵 Your turn in Mancala Royale! Tap to sow:\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(`🪵 Your turn in Mancala Royale!\n\n${matchUrl}`),
    });
  };

  return (
    <WhatsAppMiniAppShell
      gameTitle="Mancala Royale"
      opponentName={isDemo ? 'Ayo Master (Bot)' : 'Opponent'}
      opponentScore={currentState?.pits[13] ?? 0}
      myScore={currentState?.pits[6] ?? 0}
      myTurn={isMyTurn}
      timeLeftSec={isMyTurn ? 15 : null}
      onReturnToWhatsApp={handleShareTurn}
    >
      <div className="relative min-h-[82vh] flex flex-col justify-between py-2 select-none overflow-hidden">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-900/80 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-black">
            <span className="text-amber-400">🪵 Mancala Royale</span>
            <span className="text-white/40">•</span>
            <span className={isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-white/60'}>
              {isMyTurn ? 'YOUR TURN' : 'OPPONENT THINKING...'}
            </span>
          </div>

          <button
            type="button"
            onClick={handleShareTurn}
            className="text-[11px] font-extrabold text-emerald-400 hover:text-emerald-300 px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20"
          >
            Share Turn
          </button>
        </div>

        {/* Animated Callout Toast */}
        {calloutToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-sm pointer-events-none transition-all">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 via-emerald-600 to-amber-700 text-white font-black text-center text-sm shadow-2xl border-2 border-amber-300/50 animate-bounce">
              {calloutToast}
            </div>
          </div>
        )}

        {/* Scores & Stores Summary */}
        <div className="flex items-center justify-between px-4 py-2">
          {/* Opponent Info */}
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-950 border border-amber-600/40 flex items-center justify-center font-black text-amber-300 text-sm">
              P1
            </div>
            <div>
              <span className="text-xs font-black text-white/90 block">
                {isDemo ? 'Ayo Master (Bot)' : 'Opponent'}
              </span>
              <span className="text-[11px] text-amber-400 font-bold">
                {currentState?.pits[13] ?? 0} Seeds in Store
              </span>
            </div>
          </div>

          <span className="text-xs font-black text-white/40">VS</span>

          {/* Player Info */}
          <div className="flex items-center gap-2 text-right">
            <div>
              <span className="text-xs font-black text-white/90 block">{myUsername}</span>
              <span className="text-[11px] text-emerald-400 font-bold">
                {currentState?.pits[6] ?? 0} Seeds in Store
              </span>
            </div>
            <div className="h-8 w-8 rounded-xl bg-emerald-950 border border-emerald-500/40 flex items-center justify-center font-black text-emerald-300 text-sm">
              P0
            </div>
          </div>
        </div>

        {/* Center: Carved Mancala Board SVG */}
        <div className="my-auto py-2 px-1">
          <MancalaBoardSvg
            pits={currentState?.pits ?? Array(14).fill(4)}
            activePlayerIndex={activePlayerIndex}
            isMyTurn={isMyTurn}
            myPlayerIndex={myPlayerIndex}
            onSelectPit={handleSelectPit}
            disabled={!isMyTurn || Boolean(currentState?.isGameOver)}
          />
        </div>

        {/* Bottom Sowing Instructions */}
        <div className="w-full text-center py-2 px-4">
          <p className="text-xs text-white/50">
            {isMyTurn
              ? 'Tap any glowing pit (0–5) in your row to scoop and sow seeds.'
              : 'Waiting for opponent to sow...'}
          </p>
        </div>

        {/* Game Over Result Overlay */}
        {currentState?.isGameOver && (
          <GameResultOverlay
            gameName="Mancala Royale"
            winnerId={
              (currentState.pits[6] ?? 0) > (currentState.pits[13] ?? 0)
                ? 'player-0'
                : 'bot-ayo'
            }
            winnerName={
              (currentState.pits[6] ?? 0) > (currentState.pits[13] ?? 0)
                ? myUsername
                : 'Ayo Master'
            }
            isDraw={(currentState.pits[6] ?? 0) === (currentState.pits[13] ?? 0)}
            myUserId="player-0"
            playerOne={{ id: 'player-0', name: myUsername, score: currentState.pits[6] ?? 0 }}
            playerTwo={{
              id: 'bot-ayo',
              name: isDemo ? 'Ayo Master (Bot)' : 'Opponent',
              score: currentState.pits[13] ?? 0,
            }}
            onPlayAgain={() => {
              if (isDemo) {
                const fresh = mancalaEngine.createInitialState([
                  { id: 'player-0', displayName: myUsername },
                  { id: 'bot-ayo', displayName: 'Ayo Master (Bot)' },
                ]);
                setLocalState(fresh);
              } else {
                router.push('/games/mancala');
              }
            }}
            onShareWhatsApp={handleShareTurn}
          />
        )}
      </div>
    </WhatsAppMiniAppShell>
  );
}
