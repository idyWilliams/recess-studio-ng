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
} from '@/lib/api-client';
import {
  LudoRulesEngine,
  canTokenMove,
  type LudoState,
  type LudoMove,
} from '@recess/game-ludo';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';
import { PlayerMedallion } from '@/components/ui/PlayerMedallion';

const ludoEngine = new LudoRulesEngine();

interface RollOutcomePill {
  value: number;
  text: string;
  pillClass: string;
}

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
  const [isRolling, setIsRolling] = useState(false);
  const [animatedDiceValue, setAnimatedDiceValue] = useState<number | null>(null);
  const [rollOutcome, setRollOutcome] = useState<RollOutcomePill | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [turnPingMessage, setTurnPingMessage] = useState<string | null>(null);

  // Initialize demo or fetch live match
  useEffect(() => {
    if (isDemo) {
      const initial = ludoEngine.createInitialState([
        { id: 'player-red', displayName: myUsername },
        { id: 'bot-green', displayName: 'NaijaBot' },
      ]);
      setLocalState(initial);
      setRollOutcome({
        value: 1,
        text: 'Match Started — Tap Die to roll',
        pillClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
      });
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

  // Pawn counts for clean 2-player HUD bar
  const redTokens = currentState?.tokens.red ?? [];
  const greenTokens = currentState?.tokens.green ?? [];

  const myHome = redTokens.filter((t) => t.isHome).length;
  const myYard = redTokens.filter((t) => t.step === -1).length;
  const myTrack = redTokens.filter((t) => t.step >= 0 && !t.isHome).length;

  const oppHome = greenTokens.filter((t) => t.isHome).length;
  const oppYard = greenTokens.filter((t) => t.step === -1).length;
  const oppTrack = greenTokens.filter((t) => t.step >= 0 && !t.isHome).length;

  // Bot Turn Automation (handles 2-step roll->move and extra turn roll on 6 reliably)
  useEffect(() => {
    const isBotTurn = Boolean(
      isDemo &&
      currentState &&
      !currentState.isGameOver &&
      currentState.currentPlayerId === 'bot-green'
    );

    if (isBotTurn && !isBotPlaying) {
      setIsBotPlaying(true);
      const timer = setTimeout(() => {
        try {
          if (currentState!.turnPhase === 'roll') {
            // Bot Rolls
            const next = ludoEngine.applyMove(currentState!, { type: 'roll' }, 'bot-green');
            setLocalState(next);

            if (next.diceRoll === 6) {
              setRollOutcome({
                value: 6,
                text: '🤖 Opponent rolled 6! Extra turn & exit yard',
                pillClass: 'border-amber-500/40 bg-amber-500/15 text-amber-300',
              });
            } else {
              setRollOutcome({
                value: next.diceRoll ?? 1,
                text: `🤖 Opponent rolled ${next.diceRoll}`,
                pillClass: 'border-white/10 bg-white/5 text-white/70',
              });
            }
          } else if (currentState!.turnPhase === 'move') {
            // Bot Moves
            const botTokens = currentState!.tokens[currentState!.currentColor] ?? [];
            const roll = currentState!.diceRoll ?? 1;
            const validIdxs = botTokens
              .map((t, i) => (canTokenMove(t, roll) ? i : -1))
              .filter((i) => i !== -1);

            if (validIdxs.length > 0) {
              const yardToken = validIdxs.find((i) => botTokens[i]!.step === -1);
              const trackToken = validIdxs.find((i) => botTokens[i]!.step >= 0);
              const chosen = trackToken !== undefined ? trackToken : (yardToken ?? validIdxs[0]!);

              const next = ludoEngine.applyMove(
                currentState!,
                { type: 'move', tokenIndex: chosen },
                'bot-green',
              );
              setLocalState(next);

              const lastHistory = next.history[next.history.length - 1];
              if (lastHistory?.capturedTokenId) {
                setRollOutcome({
                  value: roll,
                  text: '💥 Opponent captured your pawn!',
                  pillClass: 'border-rose-500/40 bg-rose-500/20 text-rose-300',
                });
              }
            } else {
              // Watchdog: If no tokens can move in move phase, pass turn safely
              const forced = { ...currentState!, turnPhase: 'roll' as const, diceRoll: null };
              (ludoEngine as any).advanceToNextPlayer?.(forced);
              setLocalState(forced);
            }
          }
        } catch {
          // pass on bot error
        } finally {
          setIsBotPlaying(false);
        }
      }, 750);
      return () => clearTimeout(timer);
    }
  }, [
    isDemo,
    currentState?.currentPlayerId,
    currentState?.turnCount,
    currentState?.turnPhase,
    currentState?.diceRoll,
    isBotPlaying,
  ]);

  // Handle Animated Roll Dice
  const handleRollDice = async () => {
    if (!currentState || !isMyTurn || turnPhase !== 'roll' || currentState.isGameOver || isRolling) {
      return;
    }

    setIsRolling(true);
    triggerHaptic('light');

    // Run 450ms multi-axis tumble animation cycling faces 1 -> 4 -> 2 -> 6 -> final
    const tumbleSequence = [1, 4, 2, 6];
    tumbleSequence.forEach((face, index) => {
      setTimeout(() => {
        setAnimatedDiceValue(face);
        triggerHaptic('light');
      }, index * 90);
    });

    setTimeout(async () => {
      const move: LudoMove = { type: 'roll' };

      if (isDemo) {
        try {
          const next = ludoEngine.applyMove(currentState, move, 'player-red');
          setLocalState(next);
          const finalVal = next.diceRoll ?? 1;
          setAnimatedDiceValue(finalVal);
          setIsRolling(false);
          triggerHaptic('heavy');

          // Check if player has valid moves with this roll
          const playerTokens = next.tokens.red ?? [];
          const hasMoves = playerTokens.some((t) => canTokenMove(t, finalVal));

          if (finalVal === 6) {
            setRollOutcome({
              value: 6,
              text: 'ROLLED 6! ★ Tap a Yard or Track Pawn',
              pillClass: 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-glow-gold',
            });
          } else if (hasMoves) {
            setRollOutcome({
              value: finalVal,
              text: `ROLLED ${finalVal} — Tap Your Highlighted Pawn`,
              pillClass: 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-glow-green',
            });
          } else {
            setRollOutcome({
              value: finalVal,
              text: `ROLLED ${finalVal} — No Valid Moves (Passing Turn...)`,
              pillClass: 'border-rose-500/50 bg-rose-500/20 text-rose-300',
            });
          }
        } catch (err: any) {
          setIsRolling(false);
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
          const next = updated.state as unknown as LudoState;
          setLocalState(next);
          const finalVal = next.diceRoll ?? 1;
          setAnimatedDiceValue(finalVal);
          setIsRolling(false);
          triggerHaptic('heavy');

          const playerTokens = next.tokens.red ?? [];
          const hasMoves = playerTokens.some((t) => canTokenMove(t, finalVal));

          if (finalVal === 6) {
            setRollOutcome({
              value: 6,
              text: 'ROLLED 6! ★ Tap a Yard or Track Pawn',
              pillClass: 'border-amber-400 bg-amber-500/20 text-amber-200 shadow-glow-gold',
            });
          } else if (hasMoves) {
            setRollOutcome({
              value: finalVal,
              text: `ROLLED ${finalVal} — Tap Your Highlighted Pawn`,
              pillClass: 'border-emerald-500 bg-emerald-500/20 text-emerald-300 shadow-glow-green',
            });
          } else {
            setRollOutcome({
              value: finalVal,
              text: `ROLLED ${finalVal} — No Valid Moves (Passing Turn...)`,
              pillClass: 'border-rose-500/50 bg-rose-500/20 text-rose-300',
            });
          }
        } catch {
          setIsRolling(false);
        }
      }
    }, 450);
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
          setRollOutcome({
            value: 6,
            text: '💥 CAPTURE! Opponent pawn knocked back to Yard!',
            pillClass: 'border-amber-400 bg-amber-500/25 text-amber-200 shadow-glow-gold',
          });
          triggerHaptic('heavy');
        } else if (lastHistory?.isExtraTurn) {
          setRollOutcome({
            value: 6,
            text: '✨ BONUS ROLL GRANTED! Tap Die Again',
            pillClass: 'border-emerald-400 bg-emerald-500/25 text-emerald-200 shadow-glow-green',
          });
        }
      } catch (err: any) {
        // pass error
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
      } catch {
        // pass error
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
          score: myHome,
          isCurrentTurn: isMyTurn,
        },
        playerTwo: {
          name: isDemo ? 'NaijaBot' : 'Opponent',
          score: oppHome,
          isCurrentTurn: !isMyTurn,
        },
      },
      shareTitle: 'Ludo Arena Race on Recess',
      shareText: `🎲 Your turn in Ludo Arena! Tap to roll:\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(`🎲 Your turn in Ludo Arena!\n\n${matchUrl}`),
    });
  };

  const opponentDisplayName = isDemo ? 'NaijaBot' : 'Opponent';
  const effectiveDiceVal = isRolling ? animatedDiceValue : (diceRoll ?? animatedDiceValue);

  return (
    <WhatsAppMiniAppShell
      gameTitle="Ludo Arena"
      opponentName={opponentDisplayName}
      opponentScore={oppHome}
      myScore={myHome}
      myTurn={isMyTurn}
      timeLeftSec={isMyTurn ? 15 : null}
      onReturnToWhatsApp={handleShareTurn}
      isBotPlaying={isBotPlaying}
      syncStatus={syncStatus}
      turnPingMessage={turnPingMessage}
      onSendTurnPing={handleShareTurn}
    >
      <div className="relative min-h-[84vh] flex flex-col justify-between py-1 select-none overflow-hidden">
        {/* TOP BAR: Opponent Profile & Pawn Status Bar */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-[#121214] border border-white/[0.06] shadow-sm">
          <div className="flex items-center gap-2.5 min-w-0">
            <PlayerMedallion username={opponentDisplayName} size="sm" isOnline={!isMyTurn} />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-medium text-[#F4F4F0] truncate">
                  @{opponentDisplayName}
                </p>
                {!isMyTurn && (
                  <span className="rounded bg-[#C8B28A]/20 px-1.5 py-0.5 text-[9px] font-medium text-[#C8B28A]">
                    ● Turn
                  </span>
                )}
              </div>
              {/* Mini Pawn Counters */}
              <div className="flex items-center gap-2 text-[10px] text-[#8E8E93] font-medium pt-0.5 tabular-nums">
                <span>Home: <strong className="text-[#F4F4F0]">{oppHome}/4</strong></span>
                <span>Active: <strong className="text-[#F4F4F0]">{oppTrack}</strong></span>
                <span>Yard: <strong className="text-[#F4F4F0]">{oppYard}</strong></span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleShareTurn}
            className="rounded-lg border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] px-2.5 py-1 text-xs font-medium text-[#E4E4E0] transition-colors"
          >
            Share
          </button>
        </div>

        {/* CENTER: Precision Ludo Cross Board SVG */}
        <div className="my-auto py-1 px-1 flex items-center justify-center">
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

        {/* BOTTOM SECTION: Tactile 3D Animated Dice Roller Tray & Player Bar */}
        <div className="w-full space-y-2">
          {/* Roll Outcome Pill */}
          {rollOutcome && (
            <div className="flex justify-center px-2">
              <div
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-black backdrop-blur-xl transition-all shadow-md ${rollOutcome.pillClass}`}
              >
                <span>{rollOutcome.text}</span>
              </div>
            </div>
          )}

          {/* Tray Dock */}
          <div className="flex items-center justify-between px-3.5 py-3 rounded-2xl bg-[#121214] border border-white/[0.06] shadow-md">
            {/* Player Info & Mini Pawn Counters */}
            <div className="flex items-center gap-2.5 min-w-0">
              <PlayerMedallion username={myUsername} size="sm" isOnline={isMyTurn} />

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-medium text-[#F4F4F0] truncate">
                    @{myUsername}
                  </p>
                  {isMyTurn && (
                    <span className="rounded bg-[#34D399]/20 px-1.5 py-0.5 text-[9px] font-medium text-[#34D399]">
                      ● Your Turn
                    </span>
                  )}
                </div>

                {/* 4 Mini Pawn Counters */}
                <div className="flex items-center gap-2 text-[10px] text-[#8E8E93] font-medium pt-0.5 tabular-nums">
                  <span>Home: <strong className="text-[#F4F4F0]">{myHome}/4</strong></span>
                  <span>Active: <strong className="text-[#F4F4F0]">{myTrack}</strong></span>
                  <span>Yard: <strong className="text-[#F4F4F0]">{myYard}</strong></span>
                </div>
              </div>
            </div>

            {/* Tactile 3D SVG Die Roller & CTA Button */}
            <div className="flex items-center gap-3 shrink-0">
              <LudoDiceSvg
                value={effectiveDiceVal}
                isRolling={isRolling}
                canRoll={isMyTurn && turnPhase === 'roll'}
                onRoll={handleRollDice}
                size={68}
              />

              {isMyTurn && turnPhase === 'roll' && (
                <button
                  type="button"
                  onClick={handleRollDice}
                  disabled={isRolling}
                  className="rounded-xl bg-[#F4F4F0] hover:bg-white px-4 py-2 text-xs font-medium text-[#0A0A0B] transition-colors active:scale-95 disabled:opacity-50"
                >
                  {isRolling ? 'Rolling...' : 'Roll Dice'}
                </button>
              )}
            </div>
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
                : opponentDisplayName
            }
            isDraw={false}
            myUserId="player-red"
            playerOne={{
              id: 'player-red',
              name: myUsername,
              score: myHome,
            }}
            playerTwo={{
              id: 'bot-green',
              name: opponentDisplayName,
              score: oppHome,
            }}
            onPlayAgain={() => {
              if (isDemo) {
                const fresh = ludoEngine.createInitialState([
                  { id: 'player-red', displayName: myUsername },
                  { id: 'bot-green', displayName: 'Tunde (Ludo Bot)' },
                ]);
                setLocalState(fresh);
                setRollOutcome({
                  value: 1,
                  text: 'New match — Tap Die to roll',
                  pillClass: 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300',
                });
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
