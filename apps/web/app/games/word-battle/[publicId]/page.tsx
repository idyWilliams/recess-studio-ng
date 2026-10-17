'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

import { Button, PvPMatchup } from '@recess/ui';
import type { BoardTile } from '@recess/game-word-battle';

import { ApiClientError } from '@/lib/api-client';
import {
  getCountdownBadgeLabel,
  getHistoryEntries,
  getMatchStatus,
  getMatchupPair,
  getMoveFeedback,
  getRoundInfo,
  getSessionPlayers,
  getWordBattleState,
  isCountdownCritical,
  type MoveFeedback,
} from '@/lib/word-battle-view';
import { useCountdownRemainingMs } from '@/hooks/use-countdown';
import { useGameSession } from '@/hooks/use-game-session';
import { useIdentity } from '@/hooks/use-identity';
import { ArenaShell } from '@/components/games/word-battle/ArenaShell';
import { BoardGrid } from '@/components/games/word-battle/BoardGrid';
import { CountdownBadge } from '@/components/games/word-battle/CountdownBadge';
import { FeedbackBanner } from '@/components/games/word-battle/FeedbackBanner';
import { LivesRow } from '@/components/games/word-battle/LivesRow';
import { ResultOverlay } from '@/components/games/word-battle/ResultOverlay';
import { WaitingRoom } from '@/components/games/word-battle/WaitingRoom';
import { WordBar } from '@/components/games/word-battle/WordBar';
import { WordHistoryList } from '@/components/games/word-battle/WordHistoryList';
import { RegisterCard } from '@/components/identity/RegisterCard';

/**
 * Word Battle arena — the live match orchestrator for one session. All state comes
 * from the server (polled snapshots + mutation responses); the UI never predicts
 * scores, lives, turns, or the board. The countdown is display-only: the server
 * decides whether a turn has expired (ADR-007).
 */
export default function WordBattleArenaPage() {
  const params = useParams<{ publicId: string }>();
  const publicId = typeof params.publicId === 'string' ? params.publicId : '';

  const { sessionToken, profile, register } = useIdentity();
  const {
    session,
    sessionQuery,
    joinSession,
    submitMove,
    expireTurn,
    refreshSession,
  } = useGameSession(publicId);

  const [selectedTileIds, setSelectedTileIds] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<MoveFeedback | null>(null);
  const [flash, setFlash] = useState<'valid' | 'invalid' | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState(`/games/word-battle/${publicId}`);

  useEffect(() => {
    setShareUrl(`${window.location.origin}/games/word-battle/${publicId}`);
  }, [publicId]);

  // ── Derived server state ────────────────────────────────────────────────
  const myUserId = profile?.userId ?? null;
  const players = useMemo(() => (session ? getSessionPlayers(session) : []), [session]);
  const state = useMemo(() => (session ? getWordBattleState(session) : null), [session]);
  const isParticipant =
    myUserId !== null &&
    (session?.players.some((player) => player.userId === myUserId) ?? false);
  const myTurn =
    session?.status === 'active' && session.currentPlayerId === myUserId;
  const matchStatus = session ? getMatchStatus(session, myUserId) : null;
  const opponentName = players.find((player) => player.userId !== myUserId)?.username;

  const selectedTiles = useMemo<BoardTile[]>(() => {
    if (!state) return [];
    const tileById = new Map(state.board.flat().map((tile) => [tile.id, tile]));
    return selectedTileIds
      .map((id) => tileById.get(id))
      .filter((tile): tile is BoardTile => tile !== undefined);
  }, [state, selectedTileIds]);
  const word = selectedTiles.map((tile) => tile.letter).join('');

  const matchup = useMemo(
    () => getMatchupPair(players, state, session?.result),
    [players, state, session?.result],
  );
  const historyEntries = useMemo(
    () => (state ? getHistoryEntries(state, players) : []),
    [state, players],
  );

  const remainingMs = useCountdownRemainingMs(session?.turnDeadlineAt);

  // ── Selection lifecycle ─────────────────────────────────────────────────
  // A server-confirmed outcome flashes on the tiles that formed the word, then the
  // selection clears (consumed tiles / gravity / refill have already changed the board).
  useEffect(() => {
    if (!flash) return;
    const timerId = window.setTimeout(() => {
      setFlash(null);
      setSelectedTileIds([]);
    }, 900);
    return () => window.clearTimeout(timerId);
  }, [flash]);

  // Any other confirmed state change (opponent move, timeout sweep) invalidates the
  // selection immediately — it never survives a board the server has moved past.
  const stateVersion = session?.stateVersion;
  const hasFlash = flash !== null;
  useEffect(() => {
    if (hasFlash) return;
    setSelectedTileIds([]);
  }, [stateVersion, hasFlash]);

  // ── Turn expiry request (display-only countdown → server-verified call) ─
  // Fired at most once per observed state version; the server rejects premature or
  // already-handled requests (409 TURN_NOT_EXPIRED / STALE_GAME_STATE), which the
  // hook treats as benign and simply refreshes.
  const expireRequestedRef = useRef<string | null>(null);
  useEffect(() => {
    if (remainingMs === null || remainingMs > 0) return;
    if (!session || !sessionToken || session.status !== 'active') return;
    const requestKey = `${publicId}:${session.stateVersion}`;
    if (expireRequestedRef.current === requestKey) return;
    expireRequestedRef.current = requestKey;
    expireTurn.mutate({
      sessionToken,
      expectedStateVersion: session.stateVersion,
    });
  }, [remainingMs, session, sessionToken, publicId, expireTurn]);

  // ── Handlers ────────────────────────────────────────────────────────────
  const handleTileClick = useCallback(
    (tile: BoardTile) => {
      if (!myTurn || submitMove.isPending) return;
      setSelectedTileIds((previous) => {
        // Tap the last tile again = undo it.
        if (previous[previous.length - 1] === tile.id) {
          return previous.slice(0, -1);
        }
        return [...previous, tile.id];
      });
      setFeedback(null);
    },
    [myTurn, submitMove.isPending],
  );

  const handleClear = useCallback(() => {
    setSelectedTileIds([]);
    setFeedback(null);
  }, []);

  const handleMoveError = useCallback(
    (error: unknown, submittedVersion: number) => {
      if (!(error instanceof ApiClientError)) {
        setFeedback({
          type: 'invalid',
          message: 'Something went wrong — your word was not submitted.',
        });
        return;
      }

      switch (error.code) {
        case 'STALE_GAME_STATE':
          // Another confirmed transition won the race; refresh instead of resubmitting.
          setFeedback({
            type: 'info',
            message: 'The board changed — your word was not submitted.',
          });
          void refreshSession();
          return;
        case 'NOT_YOUR_TURN':
          setFeedback({ type: 'info', message: 'It is not your turn.' });
          void refreshSession();
          return;
        case 'GAME_NOT_ACTIVE':
          setFeedback({ type: 'info', message: 'This match has ended.' });
          void refreshSession();
          return;
        case 'UNAUTHORIZED':
        case 'PLAYER_NOT_IN_GAME':
          setFeedback({
            type: 'invalid',
            message: 'Your session could not be verified — sign in again.',
          });
          return;
        case 'NETWORK_ERROR': {
          // Ambiguous: the request may or may not have landed. Refresh and report
          // what the server confirms — never assume the move succeeded.
          setFeedback({
            type: 'info',
            message: 'Connection lost — checking whether your word landed…',
          });
          void refreshSession().then((result) => {
            if (result.data && result.data.stateVersion > submittedVersion) {
              setFeedback({
                type: 'info',
                message: 'Connection error — showing the latest confirmed state.',
              });
            } else {
              setFeedback({
                type: 'invalid',
                message:
                  'Your word was not submitted — connection error. Try again.',
              });
            }
          });
          return;
        }
        default:
          setFeedback({ type: 'invalid', message: error.message });
      }
    },
    [refreshSession],
  );

  const handleSubmit = useCallback(() => {
    if (
      !session ||
      !sessionToken ||
      !myTurn ||
      selectedTiles.length === 0 ||
      submitMove.isPending
    ) {
      return;
    }
    const submittedVersion = session.stateVersion;
    submitMove.mutate(
      {
        sessionToken,
        move: {
          type: 'word',
          word,
          path: selectedTiles.map((tile) => ({ row: tile.row, col: tile.col })),
        },
        expectedStateVersion: submittedVersion,
      },
      {
        onSuccess: (response) => {
          const moveFeedback = getMoveFeedback(response, myUserId);
          if (moveFeedback) {
            setFeedback(moveFeedback);
            setFlash(moveFeedback.type === 'invalid' ? 'invalid' : 'valid');
          } else {
            setFeedback({ type: 'info', message: 'Move recorded.' });
          }
        },
        onError: (error) => handleMoveError(error, submittedVersion),
      },
    );
  }, [
    session,
    sessionToken,
    myTurn,
    selectedTiles,
    word,
    submitMove,
    myUserId,
    handleMoveError,
  ]);

  const handleJoin = useCallback(() => {
    if (!sessionToken || joinSession.isPending) return;
    joinSession.mutate(sessionToken, {
      onSuccess: () => setJoinError(null),
      onError: (error) => {
        if (error instanceof ApiClientError) {
          if (error.code === 'GAME_NOT_ACTIVE') {
            setJoinError('Someone just took the last seat — showing the match.');
            void refreshSession();
            return;
          }
          setJoinError(error.message);
          return;
        }
        setJoinError('Could not join this match — try again.');
      },
    });
  }, [sessionToken, joinSession, refreshSession]);

  // ── Render ──────────────────────────────────────────────────────────────
  if (!session) {
    const isLoading = sessionQuery.isPending;
    const loadError = sessionQuery.error;
    return (
      <ArenaShell status={null}>
        <div
          className="mx-auto w-full max-w-sm self-center rounded-2xl p-6 text-center"
          style={{
            background: 'linear-gradient(160deg, #161D2F 0%, #0D111C 100%)',
            border: '1px solid rgba(108,56,255,0.25)',
          }}
        >
          {isLoading ? (
            <>
              <p className="text-sm font-bold text-white">Loading match…</p>
              <p className="mt-1 text-xs text-neutral-500">{publicId}</p>
            </>
          ) : (
            <>
              <h2 className="text-sm font-bold text-white">
                {loadError instanceof ApiClientError &&
                loadError.code === 'GAME_NOT_FOUND'
                  ? 'This match does not exist'
                  : 'Could not load the match'}
              </h2>
              <p className="mt-1 text-xs text-neutral-400">
                {loadError instanceof ApiClientError
                  ? loadError.message
                  : 'An unexpected error occurred.'}
              </p>
              <div className="mt-4 flex flex-col items-center gap-2">
                <Button size="md" onClick={() => void refreshSession()}>
                  Try Again
                </Button>
              </div>
            </>
          )}
        </div>
      </ArenaShell>
    );
  }

  const playerOne = players[0];
  const playerTwo = players[1];

  return (
    <ArenaShell status={matchStatus} opponentName={opponentName}>
      {/* Polling lost contact — last confirmed state stays on screen */}
      {sessionQuery.isError && (
        <div
          className="rounded-xl px-3 py-1.5 text-center text-[11px] font-bold text-amber-300"
          style={{
            background: 'rgba(245,158,11,0.12)',
            border: '1px solid rgba(245,158,11,0.3)',
          }}
          role="status"
        >
          Connection issues — retrying automatically…
        </div>
      )}

      {/* ── WAITING ROOM ──────────────────────────────────────────────── */}
      {session.status === 'waiting' && (
        <>
          <WaitingRoom
            matchupOne={matchup.one}
            matchupTwo={matchup.two}
            shareUrl={shareUrl}
            isParticipant={isParticipant}
            canJoin={sessionToken !== null}
            joinPending={joinSession.isPending}
            joinError={joinError}
            onJoin={handleJoin}
          />
          {!sessionToken && (
            <RegisterCard
              tone="dark"
              title="Create your player profile"
              description="Pick a gaming username to take the open seat — opponents never see private account details."
              isPending={register.isPending}
              error={
                register.error instanceof ApiClientError
                  ? register.error.message
                  : null
              }
              onRegister={(username) => register.mutate(username)}
            />
          )}
        </>
      )}

      {/* ── LIVE / FINISHED MATCH ─────────────────────────────────────── */}
      {state && playerOne && playerTwo && (
        <>
          <PvPMatchup
            isDark
            roundInfo={getRoundInfo(state)}
            playerOne={matchup.one}
            playerTwo={matchup.two}
          />

          {/* Lives HUD + countdown from the persisted server deadline */}
          <div
            className="flex items-center justify-between rounded-xl px-3 py-2 text-[11px] font-semibold"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <LivesRow
              label={playerOne.username}
              lives={state.lives[playerOne.userId] ?? 0}
              total={3}
            />
            <CountdownBadge
              label={getCountdownBadgeLabel(state, remainingMs)}
              danger={isCountdownCritical(remainingMs)}
            />
            <LivesRow
              label={playerTwo.username}
              lives={state.lives[playerTwo.userId] ?? 0}
              total={3}
              reverse
            />
          </div>

          {session.status === 'active' && !isParticipant && (
            <p
              className="rounded-xl px-3 py-2 text-center text-xs font-semibold text-recess-purple-light"
              style={{
                background: 'rgba(108,56,255,0.15)',
                border: '1px solid rgba(108,56,255,0.3)',
              }}
            >
              This match is already in progress — you are watching as a spectator.
            </p>
          )}

          {/* Server-authoritative board */}
          <BoardGrid
            tiles={state.board}
            selectedTileIds={selectedTileIds}
            flash={flash}
            onTileClick={handleTileClick}
          />

          <WordBar word={word} onClear={handleClear} />
          <FeedbackBanner feedback={feedback} />

          {/* Submit — enabled only on the viewer's confirmed turn; the pending
              mutation guards against duplicate submissions. */}
          {session.status === 'active' && isParticipant && myTurn && (
            <Button
              variant="primary"
              fullWidth
              size="lg"
              disabled={selectedTiles.length < 2 || submitMove.isPending}
              isLoading={submitMove.isPending}
              onClick={handleSubmit}
            >
              Submit Word
              {selectedTiles.length >= 2 ? ` — ${word.length} pts` : ''}
            </Button>
          )}

          {session.status === 'active' && isParticipant && !myTurn && (
            <p className="py-1 text-center text-[11px] font-semibold text-neutral-500">
              {opponentName ? `${opponentName} is thinking…` : 'Opponent is thinking…'}
            </p>
          )}

          <WordHistoryList entries={historyEntries} />

          {/* Final result — only from the server-confirmed result payload */}
          {session.status === 'completed' && session.result && (
            <ResultOverlay
              result={session.result}
              players={players}
              myUserId={myUserId}
            />
          )}
        </>
      )}
    </ArenaShell>
  );
}
