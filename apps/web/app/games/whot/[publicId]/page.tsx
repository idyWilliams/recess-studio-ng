'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

import { WhatsAppMiniAppShell } from '@/components/shell/WhatsAppMiniAppShell';
import { WhotCardSvg, type WhotSuit } from '@/components/games/whot/WhotCardSvg';
import { GameResultOverlay } from '@/components/games/GameResultOverlay';
import { useIdentity } from '@/hooks/use-identity';
import { triggerHaptic } from '@/lib/haptics';
import {
  fetchGameSession,
  joinGameSession,
  submitGameMove,
  requestRematch,
  ApiClientError,
} from '@/lib/api-client';
import {
  WhotRulesEngine,
  type WhotCard,
  type WhotDeclaredSuit,
  type WhotHouseRules,
  type WhotState,
  WHOT_RULE_PRESETS,
  DEFAULT_WHOT_HOUSE_RULES,
} from '@recess/game-whot';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
import { formatWhatsAppDeepLink } from '@/lib/whatsapp';

const whotEngine = new WhotRulesEngine();

export default function WhotArenaPage() {
  const params = useParams();
  const router = useRouter();
  const publicId = (params?.publicId as string) || 'demo-match';
  const isDemo = publicId === 'demo-match';

  const { profile, sessionToken } = useIdentity();
  const myUserId = profile?.id || 'player-1';
  const myUsername = profile?.username || 'You';

  // Game state
  const [session, setSession] = useState<any>(null);
  const [localState, setLocalState] = useState<WhotState | null>(null);
  const [isBotPlaying, setIsBotPlaying] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced'>('idle');
  const [turnPingMessage, setTurnPingMessage] = useState<string | null>(null);
  const [calloutToast, setCalloutToast] = useState<string | null>(null);
  const [selected20CardId, setSelected20CardId] = useState<string | null>(null);
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [activeHouseRules, setActiveHouseRules] = useState<WhotHouseRules>({
    ...DEFAULT_WHOT_HOUSE_RULES,
  });

  // Initialize demo or fetch live match
  useEffect(() => {
    if (isDemo) {
      const initial = whotEngine.createInitialState(
        [
          { id: 'player-1', displayName: myUsername },
          { id: 'bot-naija', displayName: 'NaijaBot' },
        ],
        { houseRules: activeHouseRules, seed: Date.now() },
      );
      setLocalState(initial);
      setCalloutToast('🎮 Match Started! Play your card or draw from Market');
    } else {
      let isMounted = true;
      const poll = async () => {
        try {
          const s = await fetchGameSession(publicId);
          if (isMounted) {
            setSession(s);
            if (s.state) {
              setLocalState(s.state as unknown as WhotState);
              if ((s.state as any).houseRules) {
                setActiveHouseRules((s.state as any).houseRules);
              }
            }
          }
        } catch {
          // fallback to demo on failure
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
  const isMyTurn = currentState ? currentState.currentPlayerId === 'player-1' : false;
  const myHand: WhotCard[] = currentState?.hands?.['player-1'] ?? [];
  const opponentHandCount = currentState?.hands?.['bot-naija']?.length ?? 6;
  const topDiscard = currentState?.discardPile?.length
    ? currentState.discardPile[currentState.discardPile.length - 1]
    : null;

  // Flash Naija Callout Toast
  const triggerCallout = (text: string) => {
    setCalloutToast(text);
    triggerHaptic('medium');
    setTimeout(() => {
      setCalloutToast((prev) => (prev === text ? null : prev));
    }, 3200);
  };

  // Bot Turn Automation (handles multi-turn special cards Hold On/Pick Two reliably)
  useEffect(() => {
    const isBotTurn = Boolean(
      isDemo &&
      currentState &&
      !currentState.isGameOver &&
      currentState.currentPlayerId === 'bot-naija'
    );

    if (isBotTurn && !isBotPlaying) {
      setIsBotPlaying(true);
      const timer = setTimeout(() => {
        try {
          const botHand = currentState!.hands['bot-naija'] ?? [];
          let chosenMove: any = null;

          // If penalty pending, bot tries to defend
          if (currentState!.pendingDrawCount > 0) {
            const defenseCard = botHand.find(
              (c) =>
                (c.number === 2 && activeHouseRules.rule2PickTwo) ||
                (c.number === 5 && activeHouseRules.rule5PickThree) ||
                (c.number === 7 && activeHouseRules.rule7Variant === 'pick_two'),
            );
            if (defenseCard) {
              chosenMove = { type: 'play', cardId: defenseCard.id };
            } else {
              chosenMove = { type: 'draw' };
            }
          } else {
            // Find valid playable card
            const validCard = botHand.find((c) => {
              if (c.number === 20 || c.suit === 'whot') return true;
              return c.suit === currentState!.activeSuit || c.number === currentState!.activeNumber;
            });

            if (validCard) {
              if (validCard.number === 20 || validCard.suit === 'whot') {
                const suits: WhotDeclaredSuit[] = ['circle', 'triangle', 'cross', 'square', 'star'];
                const randomSuit = suits[Math.floor(Math.random() * suits.length)]!;
                chosenMove = { type: 'play', cardId: validCard.id, declaredSuit: randomSuit };
              } else {
                chosenMove = { type: 'play', cardId: validCard.id };
              }
            } else {
              chosenMove = { type: 'draw' };
            }
          }

          const next = whotEngine.applyMove(currentState!, chosenMove, 'bot-naija');
          setLocalState(next);
          if (next.lastActionDescription) {
            triggerCallout(`🤖 ${next.lastActionDescription}`);
          }
        } catch {
          // Watchdog fallback: draw market to prevent freeze
          try {
            const fallback = whotEngine.applyMove(currentState!, { type: 'draw' }, 'bot-naija');
            setLocalState(fallback);
          } catch {
            // ignore
          }
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
    currentState?.pendingDrawCount,
    currentState?.discardPile?.length,
    isBotPlaying,
    activeHouseRules,
  ]);

  // Handle Play Card
  const handlePlayCard = (card: WhotCard) => {
    if (!currentState || !isMyTurn || currentState.isGameOver) return;

    if (card.number === 20 || card.suit === 'whot') {
      setSelected20CardId(card.id);
      return;
    }

    executeMove({ type: 'play', cardId: card.id });
  };

  // Handle Whot 20 Suit Selection
  const handleSelectSuit = (declaredSuit: WhotDeclaredSuit) => {
    if (!selected20CardId) return;
    executeMove({ type: 'play', cardId: selected20CardId, declaredSuit });
    setSelected20CardId(null);
  };

  // Handle Draw from Market
  const handleDrawMarket = () => {
    if (!currentState || !isMyTurn || currentState.isGameOver) return;
    executeMove({ type: 'draw' });
  };

  const executeMove = async (move: any) => {
    if (!currentState) return;
    triggerHaptic('light');
    setSyncStatus('syncing');

    if (isDemo) {
      try {
        const next = whotEngine.applyMove(currentState, move, 'player-1');
        setLocalState(next);
        setSyncStatus('synced');
        setTimeout(() => setSyncStatus('idle'), 2000);
        if (next.lastActionDescription) {
          triggerCallout(next.lastActionDescription);
        }
      } catch (err: any) {
        setSyncStatus('idle');
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
        setLocalState(updated.state as unknown as WhotState);
        setSyncStatus('synced');
        setTurnPingMessage('✅ Move saved & @opponent pinged!');
        setTimeout(() => setSyncStatus('idle'), 3000);
      } catch (err: any) {
        setSyncStatus('idle');
        triggerCallout(`⚠️ ${err?.message || 'Move failed'}`);
      }
    }
  };

  // Check if a card is legally playable right now
  const isCardPlayable = (card: WhotCard): boolean => {
    if (!currentState || !isMyTurn || currentState.isGameOver) return false;
    const validation = whotEngine.validateMove(currentState, { cardId: card.id }, 'player-1');
    return validation.ok;
  };

  // Share match
  const handleShareTurn = async () => {
    const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://recess.studio';
    const matchUrl = `${siteUrl}/games/whot/${publicId}`;

    await shareMatchSnapshotToWhatsApp({
      snapshotOptions: {
        gameName: 'Whot! Naija Classic',
        headline: `${myUsername} played in Whot! Naija!`,
        statusBadge: activeHouseRules.excludeWhot20 ? 'NO 20s • PURE SKILL' : 'NAIJA STREET CLASSIC',
        playerOne: {
          name: myUsername,
          score: myHand.length,
          isCurrentTurn: isMyTurn,
        },
        playerTwo: {
          name: isDemo ? 'NaijaBot' : 'Opponent',
          score: opponentHandCount,
          isCurrentTurn: !isMyTurn,
        },
      },
      shareTitle: 'Whot! Naija Match on Recess',
      shareText: `🎴 Your turn in Whot! Naija Classic! Tap to play:\n${matchUrl}`,
      shareUrl: matchUrl,
      fallbackUrl: formatWhatsAppDeepLink(`🎴 Your turn in Whot! Naija Classic!\n\n${matchUrl}`),
    });
  };

  return (
    <WhatsAppMiniAppShell
      gameTitle="Whot! Naija Classic"
      opponentName={isDemo ? 'NaijaBot' : 'Opponent'}
      opponentScore={opponentHandCount}
      myScore={myHand.length}
      myTurn={isMyTurn}
      timeLeftSec={isMyTurn ? 15 : null}
      onReturnToWhatsApp={handleShareTurn}
      isBotPlaying={isBotPlaying}
      syncStatus={syncStatus}
      turnPingMessage={turnPingMessage}
      onSendTurnPing={handleShareTurn}
    >
      <div className="relative min-h-[82vh] flex flex-col justify-between py-2 select-none overflow-hidden">
        {/* Top Active House Rules Ribbon */}
        <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-[#121214] border border-white/[0.06] shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-medium">
            <span className="px-2 py-0.5 rounded-md bg-[#161619] text-[#F4F4F0] border border-white/[0.08]">
              Whot Classic
            </span>
            {activeHouseRules.excludeWhot20 ? (
              <span className="px-2 py-0.5 rounded-md bg-[#161619] text-[#8E8E93] border border-white/[0.06]">
                No 20s
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-md bg-[#161619] text-[#8E8E93] border border-white/[0.06]">
                20 Wild
              </span>
            )}
            {activeHouseRules.rule14GoGen && (
              <span className="px-2 py-0.5 rounded-md bg-[#161619] text-[#8E8E93] border border-white/[0.06]">
                14 Go Gen
              </span>
            )}
            {activeHouseRules.rule7Variant === 'pick_two' && (
              <span className="px-2 py-0.5 rounded-md bg-[#161619] text-[#C8B28A] border border-[#C8B28A]/30">
                7 Pick 2
              </span>
            )}
            {currentState && currentState.pendingDrawCount > 0 && (
              <span className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-medium">
                Pick +{currentState.pendingDrawCount} Pending
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleShareTurn}
            className="text-xs font-medium text-[#E4E4E0] hover:text-[#F4F4F0] px-2.5 py-1 rounded-lg bg-[#1A1A1E] border border-white/[0.08] shrink-0 ml-2 transition-colors"
          >
            Share Turn
          </button>
        </div>

        {/* Animated Naija Callout Toast */}
        {calloutToast && (
          <div className="absolute top-14 left-1/2 -translate-x-1/2 z-30 w-11/12 max-w-sm pointer-events-none transition-all">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-amber-600 via-rose-600 to-amber-700 text-white font-black text-center text-sm shadow-2xl border-2 border-amber-300/50 animate-bounce">
              {calloutToast}
            </div>
          </div>
        )}

        {/* Opponent Area (Top) */}
        <div className="flex flex-col items-center py-2 space-y-1">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-xs font-black text-white/80">
              {isDemo ? 'NaijaBot' : 'Opponent'}
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white/10 text-white/70">
              {opponentHandCount} Cards
            </span>
          </div>

          {/* Opponent Masked Hand */}
          <div className="flex justify-center -space-x-7 py-1">
            {Array.from({ length: Math.min(opponentHandCount, 8) }).map((_, i) => (
              <WhotCardSvg
                key={i}
                suit="whot"
                number={20}
                faceDown
                isSmall
                className="transform -rotate-2 hover:-translate-y-2"
              />
            ))}
          </div>
        </div>

        {/* Center Table: Market Pile & Discard Call Card */}
        <div className="my-auto py-4 flex items-center justify-center gap-6 sm:gap-10">
          {/* Market Pile */}
          <div className="flex flex-col items-center space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">
              Market Pile
            </span>
            <div className="relative group">
              <WhotCardSvg
                suit="whot"
                number={20}
                faceDown
                onClick={isMyTurn ? handleDrawMarket : undefined}
                badge={`${currentState?.stockPile?.length ?? 30} Left`}
                className={isMyTurn ? 'ring-2 ring-amber-400/80 active:scale-95' : 'opacity-80'}
              />
            </div>
            {isMyTurn && (
              <button
                type="button"
                onClick={handleDrawMarket}
                className="px-3 py-1 rounded-full bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-black text-amber-300 transition-all"
              >
                Tap to Draw
              </button>
            )}
          </div>

          {/* Call Card (Active Discard Pile) */}
          <div className="flex flex-col items-center space-y-1.5">
            <div className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-white/60">
                Call Card
              </span>
              {currentState?.activeSuit && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold rounded bg-amber-400 text-stone-950 uppercase">
                  Need: {currentState.activeSuit}
                </span>
              )}
            </div>

            {topDiscard ? (
              <WhotCardSvg
                suit={topDiscard.suit}
                number={topDiscard.number}
                className="shadow-2xl ring-2 ring-white/20"
              />
            ) : (
              <div className="w-20 h-28 sm:w-24 sm:h-36 rounded-xl border-2 border-dashed border-white/20 flex items-center justify-center text-white/30 text-xs">
                Empty
              </div>
            )}
          </div>
        </div>

        {/* Player Hand Dock (Bottom) */}
        <div className="w-full flex flex-col items-center pt-2 space-y-2">
          <div className="flex items-center justify-between w-full px-4">
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <span>Your Hand ({myHand.length})</span>
              {isMyTurn && (
                <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                  YOUR TURN
                </span>
              )}
            </span>

            {isDemo && (
              <span className="text-[10px] font-bold text-white/50">
                Single-Device Test Mode
              </span>
            )}
          </div>

          {/* Cards Fan Dock */}
          <div className="w-full overflow-x-auto pb-4 pt-2 px-4 flex items-center justify-start sm:justify-center -space-x-5 scrollbar-none">
            {myHand.map((card) => {
              const playable = isCardPlayable(card);
              return (
                <WhotCardSvg
                  key={card.id}
                  suit={card.suit}
                  number={card.number}
                  isPlayable={playable}
                  onClick={() => handlePlayCard(card)}
                  className="hover:z-20 transition-all duration-200"
                />
              );
            })}
          </div>
        </div>

        {/* Whot 20 Suit Picker Modal */}
        {selected20CardId && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <div className="bg-[#121214] border border-white/[0.08] p-6 rounded-2xl max-w-sm w-full text-center space-y-3 shadow-2xl">
              <h3 className="text-lg font-medium text-[#F4F4F0]">Declare Suit</h3>
              <p className="text-xs text-[#8E8E93]">
                Select the suit you want the next player to follow:
              </p>

              <div className="grid grid-cols-5 gap-2 pt-2">
                {(['circle', 'triangle', 'cross', 'square', 'star'] as WhotDeclaredSuit[]).map(
                  (suit) => (
                    <button
                      key={suit}
                      type="button"
                      onClick={() => handleSelectSuit(suit)}
                      className="p-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-amber-500/20 hover:border-amber-400 active:scale-95 transition-all flex flex-col items-center gap-1.5"
                    >
                      <WhotCardSvg suit={suit} number={1} isSmall className="pointer-events-none" />
                      <span className="text-[10px] font-black uppercase text-white/80">{suit}</span>
                    </button>
                  ),
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelected20CardId(null)}
                className="w-full py-2.5 rounded-xl text-xs font-bold text-white/60 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Game Over Result Overlay */}
        {currentState?.isGameOver && (
          <GameResultOverlay
            gameName="Whot! Naija Classic"
            winnerId={myHand.length === 0 ? 'player-1' : 'bot-naija'}
            winnerName={myHand.length === 0 ? myUsername : 'Chidi'}
            isDraw={false}
            myUserId="player-1"
            playerOne={{ id: 'player-1', name: myUsername, score: myHand.length }}
            playerTwo={{
              id: 'bot-naija',
              name: isDemo ? 'Chidi (Smart Bot)' : 'Opponent',
              score: opponentHandCount,
            }}
            onPlayAgain={() => {
              if (isDemo) {
                const fresh = whotEngine.createInitialState(
                  [
                    { id: 'player-1', displayName: myUsername },
                    { id: 'bot-naija', displayName: 'Chidi (Smart Bot)' },
                  ],
                  { houseRules: activeHouseRules, seed: Date.now() },
                );
                setLocalState(fresh);
              } else {
                router.push('/games/whot');
              }
            }}
            onShareWhatsApp={handleShareTurn}
          />
        )}
      </div>
    </WhatsAppMiniAppShell>
  );
}
