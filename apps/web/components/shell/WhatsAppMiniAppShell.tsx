'use client';

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  getFloatingPiPSupport,
  startLiveMatchPiP,
  type FloatingPiPController,
  type LivePiPStateSnapshot,
} from '@/lib/floating-pip';

import { PlayerMedallion } from '@/components/ui/PlayerMedallion';

export interface MatchHistoryChatEntry {
  id: string;
  word: string;
  score: number;
  playerName: string;
  isViewer: boolean;
  timestamp?: string | undefined;
}

export interface WhatsAppMiniAppShellProps {
  gameTitle?: string | undefined;
  opponentName?: string | undefined;
  opponentScore?: number | undefined;
  myScore?: number | undefined;
  myTurn?: boolean | undefined;
  timeLeftSec?: number | null | undefined;
  lastWord?: string | null | undefined;
  historyEntries?: MatchHistoryChatEntry[] | undefined;
  onReturnToWhatsApp?: (() => void) | undefined;
  onSendWhatsAppChat?: ((message: string) => void) | undefined;
  turnPingMessage?: string | null | undefined;
  onSendTurnPing?: (() => void) | undefined;
  isBotPlaying?: boolean | undefined;
  syncStatus?: 'idle' | 'syncing' | 'synced' | undefined;
  children: ReactNode;
}

interface CustomChatMessage {
  id: string;
  text: string;
  sender: 'viewer' | 'opponent' | 'system';
  time: string;
}

const REACTION_CHIPS = [
  'Well played',
  'Your move',
  'Sharp play',
  'Good game',
];

export function WhatsAppMiniAppShell({
  gameTitle = 'Word Battle',
  opponentName = 'Opponent',
  opponentScore = 0,
  myScore = 0,
  myTurn = false,
  timeLeftSec,
  lastWord,
  historyEntries = [],
  onReturnToWhatsApp,
  onSendWhatsAppChat,
  turnPingMessage,
  onSendTurnPing,
  isBotPlaying = false,
  syncStatus = 'idle',
  children,
}: WhatsAppMiniAppShellProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [customMessages, setCustomMessages] = useState<CustomChatMessage[]>([]);
  const [isStandalone, setIsStandalone] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [dismissHandoff, setDismissHandoff] = useState(false);
  const pipControllerRef = useRef<FloatingPiPController | null>(null);

  // Check PiP capability and standalone mode on mount
  useEffect(() => {
    const support = getFloatingPiPSupport();
    setPipSupported(support.isSupported);

    if (typeof window !== 'undefined') {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsStandalone(Boolean(isStandaloneMode));
    }
  }, []);

  // Update PiP state live when props change
  useEffect(() => {
    if (pipControllerRef.current && pipControllerRef.current.isActive()) {
      const snapshot: LivePiPStateSnapshot = {
        gameTitle,
        player1Name: 'You',
        player1Score: myScore,
        player2Name: opponentName,
        player2Score: opponentScore,
        isMyTurn: Boolean(myTurn),
        timeLeftSec,
        lastWord,
      };
      pipControllerRef.current.updateState(snapshot);
    }
  }, [gameTitle, myScore, opponentName, opponentScore, myTurn, timeLeftSec, lastWord]);

  // Handle PiP Toggle
  const handleTogglePiP = useCallback(async () => {
    if (isPiPActive && pipControllerRef.current) {
      await pipControllerRef.current.stop();
      setIsPiPActive(false);
      pipControllerRef.current = null;
      return;
    }

    const snapshot: LivePiPStateSnapshot = {
      gameTitle,
      player1Name: 'You',
      player1Score: myScore,
      player2Name: opponentName,
      player2Score: opponentScore,
      isMyTurn: Boolean(myTurn),
      timeLeftSec,
      lastWord,
    };

    try {
      const controller = await startLiveMatchPiP(snapshot, () => {
        setIsPiPActive(false);
        pipControllerRef.current = null;
      });

      if (controller) {
        pipControllerRef.current = controller;
        setIsPiPActive(true);
      }
    } catch {
      setIsPiPActive(false);
    }
  }, [isPiPActive, gameTitle, myScore, opponentName, opponentScore, myTurn, timeLeftSec, lastWord]);

  // Clean up PiP controller on unmount
  useEffect(() => {
    return () => {
      if (pipControllerRef.current) {
        void pipControllerRef.current.stop();
      }
    };
  }, []);

  // Handle reaction chips
  const handleSendReaction = (text: string) => {
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newMsg: CustomChatMessage = {
      id: `chat-${Date.now()}`,
      text,
      sender: 'viewer',
      time: timeStr,
    };
    setCustomMessages((prev) => [...prev, newMsg]);

    if (onSendWhatsAppChat) {
      onSendWhatsAppChat(text);
    }
  };

  const handleCopyMatchCode = async () => {
    if (typeof window !== 'undefined') {
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
      } catch {
        // Fallback
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#0A0A0B] text-[#F4F4F0]">
      {/* Mobile Browser Standalone Handoff Banner */}
      {!isStandalone && !dismissHandoff && (
        <div className="relative z-50 flex items-center justify-between border-b border-white/[0.06] bg-[#161619] px-4 py-2 text-xs text-[#E4E4E0]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
            <span className="truncate text-xs font-medium text-[#8E8E93]">
              Active Match Drawer • {gameTitle}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <button
              type="button"
              onClick={handleCopyMatchCode}
              className="rounded-lg bg-[#1F1F24] hover:bg-[#282830] border border-white/[0.08] px-2.5 py-1 text-xs font-medium text-[#F4F4F0] transition-colors"
            >
              {copiedCode ? 'Copied' : 'Copy Link'}
            </button>
            <button
              type="button"
              onClick={() => setDismissHandoff(true)}
              className="text-[#8E8E93] hover:text-[#F4F4F0] text-xs px-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* ── Quiet Luxury Architectural Top Bar (#121214) ──────────────── */}
      <header className="sticky top-0 z-50 flex flex-col border-b border-white/[0.06] bg-[#121214] shadow-sm select-none">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Left: Return to Lounge / WhatsApp & Opponent Identity */}
          <div className="flex items-center gap-3 min-w-0">
            {onReturnToWhatsApp && (
              <button
                type="button"
                onClick={onReturnToWhatsApp}
                title="Return to Lounge"
                className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] px-2.5 py-1.5 text-xs font-medium text-[#E4E4E0] transition-colors"
              >
                <span>←</span>
                <span>Lounge</span>
              </button>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <PlayerMedallion username={opponentName} size="xs" isOnline={true} />

              <div className="flex flex-col min-w-0 leading-tight">
                <span className="truncate text-xs font-medium text-[#F4F4F0]">
                  @{opponentName}
                </span>
                <span className="text-[10px] text-[#8E8E93]">
                  {gameTitle}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Sync Status, PiP Float, and Minimize Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {syncStatus !== 'idle' && (
              <div className="flex items-center gap-1.5 rounded-full bg-[#18181B] border border-white/[0.06] px-2.5 py-0.5 text-[10px] text-[#8E8E93]">
                {syncStatus === 'syncing' ? (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#C8B28A] animate-pulse" />
                    <span>Syncing</span>
                  </>
                ) : (
                  <>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#34D399]" />
                    <span>Synced</span>
                  </>
                )}
              </div>
            )}

            {pipSupported && (
              <button
                type="button"
                onClick={handleTogglePiP}
                title={isPiPActive ? 'Close Floating PiP' : 'Float Match'}
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  isPiPActive
                    ? 'border-[#C8B28A] bg-[#C8B28A] text-[#0A0A0B]'
                    : 'border-white/[0.08] bg-[#1A1A1E] text-[#E4E4E0] hover:bg-[#222227]'
                }`}
              >
                <span className="text-[10px]">⧉</span>
                <span className="hidden xs:inline">{isPiPActive ? 'Floating' : 'Float'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              title={isMinimized ? 'Expand Game Arena' : 'Minimize View'}
              className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#1A1A1E] px-3 py-1.5 text-xs font-medium text-[#E4E4E0] hover:bg-[#222227] transition-colors"
            >
              {isMinimized ? (
                <>
                  <span>↗</span>
                  <span className="hidden xs:inline">Expand</span>
                </>
              ) : (
                <>
                  <span>—</span>
                  <span className="hidden xs:inline">Minimize</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Bot Thinking Status Bar */}
        {isBotPlaying && (
          <div className="flex items-center justify-center gap-2 bg-[#18181B] border-t border-white/[0.06] py-1 text-xs text-[#C8B28A]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#C8B28A] animate-pulse" />
            <span>@{opponentName} is calculating move...</span>
          </div>
        )}

        {/* Turn Ping Toast / Fallback Bar */}
        {turnPingMessage && (
          <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#161619] px-4 py-2 text-xs text-[#E4E4E0]">
            <span className="truncate text-xs text-[#8E8E93]">
              {turnPingMessage}
            </span>
            {onSendTurnPing && (
              <button
                type="button"
                onClick={onSendTurnPing}
                className="shrink-0 ml-3 rounded-lg bg-[#F4F4F0] hover:bg-white px-3 py-1 text-xs font-medium text-[#0A0A0B] transition-colors"
              >
                Share via WhatsApp
              </button>
            )}
          </div>
        )}
      </header>

      {/* ── Active Arena or Minimized Feed ───────── */}
      {!isMinimized ? (
        <div className="flex-1 w-full flex flex-col">{children}</div>
      ) : (
        /* Minimized State: Clean Feed */
        <div className="flex-1 flex flex-col bg-[#0A0A0B] relative overflow-hidden">
          {/* Chat feed */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* System banner */}
            <div className="flex justify-center">
              <span className="rounded-lg bg-[#121214] border border-white/[0.06] px-3 py-1 text-xs font-medium text-[#8E8E93]">
                Live Match Session • {gameTitle}
              </span>
            </div>

            {/* Turn status alert bubble */}
            <div className="flex justify-center">
              <span
                className={`rounded-lg px-3.5 py-1.5 text-xs font-medium flex items-center gap-2 ${
                  myTurn
                    ? 'bg-[#18181B] border border-[#34D399]/30 text-[#34D399]'
                    : 'bg-[#18181B] border border-white/[0.08] text-[#8E8E93]'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${myTurn ? 'bg-[#34D399]' : 'bg-[#C8B28A]'}`} />
                <span>
                  {myTurn
                    ? 'Your Turn'
                    : `Waiting for ${opponentName}`}
                  {timeLeftSec != null ? ` (${timeLeftSec}s)` : ''}
                </span>
              </span>
            </div>

            {/* Move history */}
            {historyEntries.map((entry) => {
              const isViewer = entry.isViewer;
              return (
                <div
                  key={entry.id}
                  className={`flex w-full ${isViewer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-xl px-4 py-2.5 text-xs flex flex-col ${
                      isViewer
                        ? 'bg-[#1F1F24] border border-white/[0.08] text-[#F4F4F0]'
                        : 'bg-[#121214] border border-white/[0.06] text-[#E4E4E0]'
                    }`}
                  >
                    <span className="text-[10px] font-medium text-[#8E8E93] mb-0.5">
                      {isViewer ? 'You' : opponentName}
                    </span>
                    <span className="text-sm font-medium tracking-wide">
                      Played &quot;{entry.word.toUpperCase()}&quot; (+{entry.score} pts)
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#52525B]">
                      <span>{entry.timestamp ?? 'Just now'}</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Custom reaction messages */}
            {customMessages.map((msg) => (
              <div
                key={msg.id}
                className="flex w-full justify-end"
              >
                <div className="max-w-[78%] rounded-xl bg-[#1F1F24] border border-white/[0.08] px-4 py-2.5 text-xs text-[#F4F4F0] flex flex-col">
                  <span className="text-sm font-medium">{msg.text}</span>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#52525B]">
                    <span>{msg.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Reaction Chips Bar */}
          <div className="relative z-10 border-t border-white/[0.06] bg-[#121214] px-4 py-3 flex flex-col gap-2">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-[10px] font-medium text-[#52525B] uppercase tracking-wider flex-shrink-0 mr-1">
                Nudge:
              </span>
              {REACTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendReaction(chip)}
                  className="flex-shrink-0 rounded-lg border border-white/[0.08] bg-[#18181B] px-3 py-1.5 text-xs font-medium text-[#E4E4E0] transition-colors hover:bg-[#222227] hover:text-[#F4F4F0]"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>

          {/* Floating Minimizable Game Head Bubble in Bottom Right Corner */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="Expand Game Arena"
            className="fixed bottom-24 right-4 z-50 flex items-center gap-3 rounded-full bg-[#18181B] border border-white/[0.1] px-4 py-2.5 text-left shadow-2xl transition-transform hover:scale-105 active:scale-95"
          >
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-medium tracking-wider text-[#8E8E93]">
                {myTurn ? 'YOUR TURN' : 'WAITING'}
              </span>
              <span className="mt-1 text-xs font-semibold tabular-nums text-[#F4F4F0]">
                {myScore} – {opponentScore}
              </span>
            </div>

            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F4F4F0] text-[#0A0A0B] text-xs font-semibold">
              ↗
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
