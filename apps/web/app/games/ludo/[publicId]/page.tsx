'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';

import { WhatsAppMiniAppShell } from '@/components/shell/WhatsAppMiniAppShell';
import { LudoBoardSvg, LudoDiceSvg, type LudoColor } from '@/components/games/ludo/LudoSvg';
import { GameResultOverlay } from '@/components/games/GameResultOverlay';
import { useIdentity } from '@/hooks/use-identity';
import { triggerHaptic } from '@/lib/haptics';
import {
  fetchGameSession,
  submitGameMove,
  ApiClientError,
} from '@/lib/api-client';
import {
  LudoRulesEngine,
  canTokenMove,
  type LudoState,
  type LudoMove,
  type LudoToken,
} from '@recess/game-ludo';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';

const ludoEngine = new LudoRulesEngine();

export default function LudoArenaPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = (params?.publicId as string) || 'demo-match';
  const isDemo = publicId === 'demo-match';

  const { profile, sessionToken } = useIdentity();
  const myUsername = profile?.username || 'You';

  const [session, setSession] = useState<any>(null);
  const [localState, setLocalState] = useState<LudoState | null>(null);
  const [isBotPlaying, setIsBotPlaying] = useState(false);
  const [calloutToast, setCalloutToast] = useState<string | null>(null);

  // Initialize demo or fetch live match
  useEffect(() => {
    if (isDemo) {
      const initial = ludoEngine.createInitialState([
        { id: 'player-red', displayName: myUsername },
        { id: 'bot-green', displayName: 'Tunde (Ludo Bot)' },
      ]);
      setLocalState(initial);
      setCalloutToast('🎮 Match Started! Tap the 3D Dice to roll');
    } else {
      let isMounted = true;
      const poll = async () => {
        try {
          const s = await fetchGameSession(publicId);
          if (isMounted) {
            setSession(s);
            if (s.state) {
              setLocalState(s.state as unknown as LudoState);
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
  const isMyTurn = currentState ? currentState.currentPlayerId === 'player-red' : false;
  const myColor: LudoColor = 'red';
  const activeColor: LudoColor = currentState?.currentColor || 'red';
  const turnPhase = currentState?.turnPhase || 'roll';
  const diceRoll = currentState?.diceRoll ?? null;

  // Compute valid token indices when phase is 'move'
  const validTokenIndices = useMemo(() => {
    if (!currentState || turnPhase !== 'move' || diceRoll === null) return [];
    const activeTokens = currentState.tokens[activeColor] ?? [];
    const valids: number[] = [];
    activeTokens.forEach((t, idx) => {
      if (canTokenMove(t, diceRoll)) {
        valids.push(idx);
      }
    });
    return valids;
  }, [currentState, turnPhase, diceRoll, activeColor]);

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
      currentState.currentPlayerId === 'bot-green' &&
      !isBotPlaying
    ) {
      setIsBotPlaying(true);
      const timer = setTimeout(() => {
        try {
          if (currentState.turnPhase === 'roll') {
            // Bot Rolls
            const next = ludoEngine.applyMove(currentState, { type: 'roll' }, 'bot-green');
            setLocalState(next);

            if (next.diceRoll === 6) {
              triggerCallout('🤖 Bot rolled a 6! Bonus Roll / Exit Yard!');
            }
          } else if (currentState.turnPhase === 'move') {
            // Bot Moves
            const botTokens = currentState.tokens[currentState.currentColor] ?? [];
            const roll = currentState.diceRoll ?? 1;
            const validIdxs = botTokens
              .map((t, i) => (canTokenMove(t, roll) ? i : -1))
              .filter((i) => i !== -1);

            if (validIdxs.length > 0) {
              // Prefer moving tokens on track, or exiting yard on 6
              const yardToken = validIdxs.find((i) => botTokens[i]!.step === -1);
              const trackToken = validIdxs.find((i) => botTokens[i]!.step >= 0);
              const chosen = trackToken !== undefined ? trackToken : (yardToken ?? validIdxs[0]!);

              const next = ludoEngine.applyMove(
                currentState,
                { type: 'move', tokenIndex: chosen },
                'bot-green',
              );
              setLocalState(next);

              const lastHistory = next.history[next.history.length - 1];
              if (lastHistory?.capturedTokenId) {
                triggerCallout('💥 KNOCKOUT! Opponent token captured!');
              }
            }
          }
        } catch {
          // pass on error
        } finally {
          setIsBotPlaying(false);
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isDemo, currentState, isBotPlaying]);

  // Handle Roll Dice Click
  const handleRollDice = async () => {
    if (!currentState || !isMyTurn || turnPhase !== 'roll' || currentState.isGameOver) return;
    triggerHaptic('medium');

    const move: LudoMove = { type: 'roll' };

    if (isDemo) {
      try {
        const next = ludoEngine.applyMove(currentState, move, 'player-red');
        setLocalState(next);
        if (next.diceRoll === 6) {
          triggerCallout('🎲 ROLLED A 6! Bonus Turn / Exit Home Yard!');
        } else {
          triggerCallout(`🎲 Rolled a ${next.diceRoll}! Pick a glowing pawn`);
        }
      } catch (err: any) {
        triggerCallout(`⚠️ ${err?.message || 'Illegal Roll'}`);
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
        setLocalState(updated.state as unknown as LudoState);
      } catch (err: any) {
        triggerCallout(`⚠️ ${err?.message || 'Roll failed'}`);
      }
    }
  };

  // Handle Token Click
  const handleSelectToken = async (tokenIndex: number) => {
    if (!currentState || !isMyTurn || turnPhase !== 'move' || currentState.isGameOver) return;
    triggerHaptic('light');

    const move: LudoMove = { type: 'move', tokenIndex };

    if (isDemo) {
      try {
        const next = ludoEngine.applyMove(currentState, move, 'player-red');
        setLocalState(next);

        const lastHistory = next.history[next.history.length - 1];
        if (lastHistory?.capturedTokenId) {
          triggerCallout('💥 CAPTURE! Opponent pawn knocked back to Yard!');
        } else if (lastHistory?.isExtraTurn) {
          triggerCallout('✨ BONUS ROLL GRANTED!');
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
        setLocalState(updated.state as unknown as LudoState);
      } catch (err: any) {
        triggerCallout(`⚠️ ${err?.message || 'Move failed'}`);
      }
    }
  };

  // Share Turn to WhatsApp
  const handleShareTurn = async () => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://recess.studio';
    const matchUrl = `${siteUrl}/games/ludo/${publicId}`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: 'Ludo Arena',
        headline: `${myUsername}'s Turn in Ludo Arena!`,
        statusBadge: '4-PLAYER TRACK RACE',
        playerOne: {
          name: myUsername,
          score: currentState?.tokens.red.filter((t) => t.isHome).length ?? 0,
          isCurrentTurn: isMyTurn,
        },
        playerTwo: {
          name: 'Tunde (Bot)',
          score: currentState?.tokens.green.filter((t) => t.isHome).length ?? 0,
          isCurrentTurn: !isMyTurn,
        },
      },
      shareTitle: 'Ludo Arena Race on Recess',
      shareText: `🎲 Your turn in Ludo Arena! Tap to roll:\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(`🎲 Your turn in Ludo Arena!\n\n${matchUrl}`),
    });
  };

  return (
    <WhatsAppMiniAppShell
      gameTitle="Ludo Arena"
      opponentName={isDemo ? 'Tunde (Ludo Bot)' : 'Opponent'}
      opponentScore={currentState?.tokens.green.filter((t) => t.isHome).length ?? 0}
      myScore={currentState?.tokens.red.filter((t) => t.isHome).length ?? 0}
      myTurn={isMyTurn}
      timeLeftSec={isMyTurn ? 15 : null}
      onReturnToWhatsApp={handleShareTurn}
    >
      <div className="relative min-h-[82vh] flex flex-col justify-between py-2 select-none overflow-hidden">
        {/* Top Status Bar */}
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-stone-900/80 border border-white/10 backdrop-blur-md">
          <div className="flex items-center gap-2 text-xs font-black">
            <span className="text-rose-400">🎲 Ludo Arena</span>
            <span className="text-white/40">•</span>
            <span className={isMyTurn ? 'text-emerald-400 animate-pulse' : 'text-white/60'}>
              {isMyTurn
                ? turnPhase === 'roll'
                  ? 'ROLL DICE'
                  : 'MOVE PAWN'
                : 'OPPONENT TURN...'}
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
            <div className="p-3 rounded-2xl bg-gradient-to-r from-rose-600 via-indigo-600 to-emerald-600 text-white font-black text-center text-sm shadow-2xl border-2 border-white/40 animate-bounce">
              {calloutToast}
            </div>
          </div>
        )}

        {/* Center: Precision Ludo Cross Board SVG */}
        <div className="my-auto py-2 px-1">
          <LudoBoardSvg
            tokens={currentState?.tokens ?? { red: [], green: [], yellow: [], blue: [] }}
            activeColor={activeColor}
            myColor={myColor}
            turnPhase={turnPhase}
            diceRoll={diceRoll}
            validTokenIndices={validTokenIndices}
            onSelectToken={handleSelectToken}
            isMyTurn={isMyTurn}
            disabled={!isMyTurn || Boolean(currentState?.isGameOver)}
          />
        </div>

        {/* Bottom Roller Dock */}
        <div className="w-full flex items-center justify-between px-4 py-3 bg-stone-900/90 border border-white/10 rounded-2xl backdrop-blur-xl">
          {/* Instructions */}
          <div className="flex flex-col">
            <span className="text-xs font-black text-white">
              {isMyTurn
                ? turnPhase === 'roll'
                  ? '🎲 Tap the 3D Dice to roll!'
                  : '🎯 Tap any glowing pawn to move.'
                : '⏳ Waiting for rival to play...'}
            </span>
            <span className="text-[11px] text-white/50">
              {diceRoll !== null ? `Current Roll: ${diceRoll}` : 'Roll a 6 to exit home base'}
            </span>
          </div>

          {/* Interactive 3D Dice Roller */}
          <div className="flex items-center gap-3">
            <LudoDiceSvg
              value={diceRoll}
              canRoll={isMyTurn && turnPhase === 'roll'}
              onRoll={handleRollDice}
              size={56}
            />

            {isMyTurn && turnPhase === 'roll' && (
              <button
                type="button"
                onClick={handleRollDice}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-indigo-600 text-white font-black text-xs shadow-glow-red hover:opacity-95 active:scale-95 transition-all"
              >
                ROLL!
              </button>
            )}
          </div>
        </div>

        {/* Game Over Result Overlay */}
        {currentState?.isGameOver && (
          <GameResultOverlay
            gameName="Ludo Arena"
            winnerId={
              currentState.winnerColor === 'red' ? 'player-red' : 'bot-green'
            }
            winnerName={
              currentState.winnerColor === 'red'
                ? myUsername
                : 'Tunde (Ludo Bot)'
            }
            isDraw={false}
            myUserId="player-red"
            playerOne={{
              id: 'player-red',
              name: myUsername,
              score: currentState.tokens.red.filter((t) => t.isHome).length,
            }}
            playerTwo={{
              id: 'bot-green',
              name: isDemo ? 'Tunde (Ludo Bot)' : 'Opponent',
              score: currentState.tokens.green.filter((t) => t.isHome).length,
            }}
            onPlayAgain={() => {
              if (isDemo) {
                const fresh = ludoEngine.createInitialState([
                  { id: 'player-red', displayName: myUsername },
                  { id: 'bot-green', displayName: 'Tunde (Ludo Bot)' },
                ]);
                setLocalState(fresh);
              } else {
                router.push('/games/ludo');
              }
            }}
            onShareWhatsApp={handleShareTurn}
          />
        )}
      </div>
    </WhatsAppMiniAppShell>
  );
}
