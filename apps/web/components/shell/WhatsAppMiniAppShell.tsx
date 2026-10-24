'use client';

import React, { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import {
  getFloatingPiPSupport,
  startLiveMatchPiP,
  type FloatingPiPController,
  type LivePiPStateSnapshot,
} from '@/lib/floating-pip';

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
  children: ReactNode;
}

interface CustomChatMessage {
  id: string;
  text: string;
  sender: 'viewer' | 'opponent' | 'system';
  time: string;
}

const REACTION_CHIPS = [
  '🔥 Too easy!',
  '⏳ Hurry up!',
  '🧠 Big brain move',
  '🤝 Good game!',
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
  children,
}: WhatsAppMiniAppShellProps) {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isPiPActive, setIsPiPActive] = useState(false);
  const [pipSupported, setPipSupported] = useState(false);
  const [customMessages, setCustomMessages] = useState<CustomChatMessage[]>([]);
  const pipControllerRef = useRef<FloatingPiPController | null>(null);

  // Check PiP capability on mount
  useEffect(() => {
    const support = getFloatingPiPSupport();
    setPipSupported(support.isSupported);
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

  const opponentInitial = opponentName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-[#05070B] text-white">
      {/* ── WhatsApp Chameleon Sheet Top Bar (#1F2C34) ──────────────── */}
      <header
        className="sticky top-0 z-50 flex flex-col border-b border-[#2A3942] bg-[#1F2C34] shadow-md transition-all select-none"
        style={{ WebkitBackdropFilter: 'blur(8px)' }}
      >
        {/* Subtle center grab handle */}
        <div className="flex w-full items-center justify-center pt-2 pb-1">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between px-3.5 pb-2.5 pt-0.5">
          {/* Left: Return to WhatsApp & Opponent Identity */}
          <div className="flex items-center gap-2.5 min-w-0">
            {onReturnToWhatsApp && (
              <button
                type="button"
                onClick={onReturnToWhatsApp}
                title="Return to WhatsApp Chat"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-[#00A884] transition-all hover:bg-white/10 active:scale-95"
              >
                <span>←</span>
                <span>WhatsApp</span>
              </button>
            )}

            <div className="flex items-center gap-2 min-w-0">
              <div className="relative flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-[#00A884] to-[#128C7E] font-bold text-white text-xs shadow-sm">
                {opponentInitial}
                {/* Pulsing online status indicator */}
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#1F2C34] bg-[#00A884] animate-pulse" />
              </div>

              <div className="flex flex-col min-w-0 leading-tight">
                <span className="truncate text-xs font-bold text-white">
                  {opponentName}
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[#8696A0]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#00A884]" />
                  <span>{gameTitle} • Live Mini-App</span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: PiP Float and Minimize Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {pipSupported && (
              <button
                type="button"
                onClick={handleTogglePiP}
                title={isPiPActive ? 'Close Floating PiP' : 'Float Match over WhatsApp'}
                className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all active:scale-95 ${
                  isPiPActive
                    ? 'bg-[#00A884] text-white shadow-sm'
                    : 'bg-[#2A3942] text-[#E9EDEF] hover:bg-[#374248]'
                }`}
              >
                <span>⧉</span>
                <span className="hidden xs:inline">{isPiPActive ? 'Floating' : 'Float'}</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setIsMinimized((prev) => !prev)}
              title={isMinimized ? 'Expand Game Arena' : 'Minimize to Chat Head'}
              className="flex items-center gap-1 rounded-lg bg-[#2A3942] px-2.5 py-1 text-[11px] font-bold text-[#E9EDEF] transition-all hover:bg-[#374248] active:scale-95"
            >
              {isMinimized ? (
                <>
                  <span>↗</span>
                  <span className="hidden xs:inline">Expand</span>
                </>
              ) : (
                <>
                  <span>_</span>
                  <span className="hidden xs:inline">Minimize</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ── Active Arena or Minimized WhatsApp Mirror Thread ───────── */}
      {!isMinimized ? (
        <div className="flex-1 w-full flex flex-col">{children}</div>
      ) : (
        /* Minimized State: WhatsApp Mirror Live Chat Feed */
        <div className="flex-1 flex flex-col bg-[#0B141A] relative overflow-hidden">
          {/* Subtle WhatsApp chat doodle background overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.035]"
            style={{
              backgroundImage:
                'radial-gradient(#FFFFFF 1.5px, transparent 1.5px), radial-gradient(#FFFFFF 1.5px, #0B141A 1.5px)',
              backgroundSize: '30px 30px',
              backgroundPosition: '0 0, 15px 15px',
            }}
          />

          {/* Chat feed */}
          <div className="relative z-10 flex-1 overflow-y-auto px-4 py-4 space-y-3">
            {/* System banner */}
            <div className="flex justify-center">
              <span className="rounded-lg bg-[#182229] border border-[#2A3942]/60 px-3 py-1 text-[11px] font-medium text-[#8696A0] shadow-sm">
                🔒 Live Match Session #{gameTitle} • End-to-End Synced
              </span>
            </div>

            {/* Turn status alert bubble */}
            <div className="flex justify-center">
              <span
                className={`rounded-lg px-3.5 py-1.5 text-xs font-bold shadow-sm flex items-center gap-1.5 ${
                  myTurn
                    ? 'bg-[#00A884]/20 border border-[#00A884]/40 text-[#00A884]'
                    : 'bg-[#F59E0B]/15 border border-[#F59E0B]/30 text-[#FBBF24]'
                }`}
              >
                <span>{myTurn ? '🟢' : '⏳'}</span>
                <span>
                  {myTurn
                    ? 'Your Turn! Tap floating head to submit word'
                    : `Waiting for ${opponentName} to play`}
                  {timeLeftSec != null ? ` (${timeLeftSec}s)` : ''}
                </span>
              </span>
            </div>

            {/* Move history as WhatsApp chat bubbles */}
            {historyEntries.map((entry) => {
              const isViewer = entry.isViewer;
              return (
                <div
                  key={entry.id}
                  className={`flex w-full ${isViewer ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[78%] rounded-2xl px-3.5 py-2 text-xs shadow-sm flex flex-col ${
                      isViewer
                        ? 'bg-[#005C4B] text-white rounded-tr-none'
                        : 'bg-[#202C33] text-[#E9EDEF] rounded-tl-none'
                    }`}
                  >
                    <span className="text-[10px] font-bold text-[#8696A0] mb-0.5">
                      {isViewer ? 'You' : opponentName}
                    </span>
                    <span className="text-sm font-semibold tracking-wide">
                      Played &quot;{entry.word.toUpperCase()}&quot; (+{entry.score} pts)
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696A0]">
                      <span>{entry.timestamp ?? 'Just now'}</span>
                      {isViewer && <span className="text-[#53BDEB] font-bold">✓✓</span>}
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
                <div className="max-w-[78%] rounded-2xl rounded-tr-none bg-[#005C4B] px-3.5 py-2 text-xs text-white shadow-sm flex flex-col">
                  <span className="text-sm font-semibold">{msg.text}</span>
                  <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-[#8696A0]">
                    <span>{msg.time}</span>
                    <span className="text-[#53BDEB] font-bold">✓✓</span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Quick Reaction Trash-Talk Chips Bar */}
          <div className="relative z-10 border-t border-[#2A3942] bg-[#1F2C34] px-3 py-2.5 flex flex-col gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
              <span className="text-[10px] font-bold text-[#8696A0] uppercase tracking-wider flex-shrink-0 mr-1">
                Quick Nudge:
              </span>
              {REACTION_CHIPS.map((chip) => (
                <button
                  key={chip}
                  type="button"
                  onClick={() => handleSendReaction(chip)}
                  className="flex-shrink-0 rounded-full border border-[#2A3942] bg-[#202C33] px-3 py-1 text-xs font-semibold text-[#E9EDEF] transition-all hover:bg-[#00A884] hover:text-white hover:border-[#00A884] active:scale-95"
                >
                  {chip}
                </button>
              ))}
            </div>

            {onSendWhatsAppChat && (
              <p className="text-[10px] text-center text-[#8696A0]">
                Tapping a reaction posts to match thread & offers 1-tap WhatsApp sync
              </p>
            )}
          </div>

          {/* Floating Minimizable Game Head Bubble in Bottom Right Corner */}
          <button
            type="button"
            onClick={() => setIsMinimized(false)}
            title="Expand Word Battle Arena"
            className={`fixed bottom-24 right-4 z-50 flex items-center gap-2.5 rounded-full p-2 pl-3 text-left shadow-2xl transition-all hover:scale-105 active:scale-95 ${
              myTurn
                ? 'bg-[#161D2F] border-2 border-[#00A884] shadow-[0_0_20px_rgba(0,168,132,0.4)] ring-4 ring-[#00A884]/30 animate-pulse'
                : 'bg-[#161D2F] border-2 border-[#F59E0B] shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-2 ring-[#F59E0B]/20'
            }`}
          >
            <div className="flex flex-col leading-none">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                {myTurn ? '🟢 YOUR TURN' : '⏳ WAITING'}
              </span>
              <span className="mt-1 text-xs font-black text-white">
                {myScore} - {opponentScore}
              </span>
            </div>

            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-tr from-[#6C38FF] to-[#1B76FF] font-black text-white text-xs shadow-md">
              ↗
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
