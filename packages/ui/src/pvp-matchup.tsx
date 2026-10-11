import { Avatar, type PresenceStatus } from './avatar.js';

export interface MatchupPlayer {
  id: string;
  username: string;
  avatarUrl?: string | null | undefined;
  score?: number | undefined;
  presence?: PresenceStatus | undefined;
  isCurrentTurn?: boolean | undefined;
  isWinner?: boolean | undefined;
}

export interface PvPMatchupProps {
  playerOne: MatchupPlayer;
  playerTwo?: MatchupPlayer | null | undefined;
  roundInfo?: string | undefined;
  isDark?: boolean | undefined;
  className?: string | undefined;
}

export function PvPMatchup({
  playerOne,
  playerTwo,
  roundInfo,
  isDark = false,
  className = '',
}: PvPMatchupProps) {
  const containerBg = isDark
    ? 'bg-recess-navy-card text-white border-recess-navy-border'
    : 'bg-white text-recess-text-primary border-recess-cream-border';

  return (
    <div
      className={`rounded-2xl border p-4 shadow-card transition-all ${containerBg} ${className}`}
    >
      {roundInfo && (
        <div className="mb-3 text-center">
          <span
            className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider ${
              isDark
                ? 'bg-recess-navy-border text-neutral-300'
                : 'bg-recess-cream-muted text-recess-text-secondary'
            }`}
          >
            {roundInfo}
          </span>
        </div>
      )}

      <div className="flex items-center justify-between gap-3">
        {/* Player One */}
        <div className="flex flex-1 items-center gap-2.5 min-w-0">
          <div
            className={`relative rounded-full transition-all ${
              playerOne.isCurrentTurn
                ? 'ring-2 ring-recess-green ring-offset-2 ring-offset-white'
                : ''
            }`}
          >
            <Avatar
              username={playerOne.username}
              avatarUrl={playerOne.avatarUrl}
              size="md"
              presence={playerOne.presence}
            />
            {playerOne.isWinner && (
              <span
                className="absolute -top-2 -right-1.5 select-none"
                title="Winner"
              >
                <img
                  src="/assets/games/word-battle/icons/word-battle-crown.svg"
                  alt="Winner"
                  className="h-4 w-4 drop-shadow-sm"
                />
              </span>
            )}
          </div>

          <div className="flex flex-col min-w-0 text-left">
            <span className="truncate text-xs font-semibold sm:text-sm">
              {playerOne.username}
            </span>
            {playerOne.isCurrentTurn && (
              <span className="text-[10px] font-bold text-recess-green">Turn</span>
            )}
          </div>
        </div>

        {/* Center Scores / VS */}
        <div className="flex flex-col items-center justify-center px-2 text-center">
          {playerOne.score !== undefined && playerTwo?.score !== undefined ? (
            <div className="flex items-baseline gap-1.5 font-bold tabular-nums">
              <span
                className={`text-xl sm:text-2xl ${
                  playerOne.isWinner ? 'text-recess-gold' : ''
                }`}
              >
                {playerOne.score}
              </span>
              <span className="text-xs text-neutral-400 font-normal">:</span>
              <span
                className={`text-xl sm:text-2xl ${
                  playerTwo?.isWinner ? 'text-recess-gold' : ''
                }`}
              >
                {playerTwo?.score}
              </span>
            </div>
          ) : (
            <span className="rounded-md bg-recess-purple-light px-2 py-0.5 text-xs font-bold text-recess-purple">
              VS
            </span>
          )}
        </div>

        {/* Player Two */}
        <div className="flex flex-1 items-center justify-end gap-2.5 min-w-0 text-right">
          {playerTwo ? (
            <>
              <div className="flex flex-col min-w-0 text-right">
                <span className="truncate text-xs font-semibold sm:text-sm">
                  {playerTwo.username}
                </span>
                {playerTwo.isCurrentTurn && (
                  <span className="text-[10px] font-bold text-recess-green">Turn</span>
                )}
              </div>

              <div
                className={`relative rounded-full transition-all ${
                  playerTwo.isCurrentTurn
                    ? 'ring-2 ring-recess-green ring-offset-2 ring-offset-white'
                    : ''
                }`}
              >
                <Avatar
                  username={playerTwo.username}
                  avatarUrl={playerTwo.avatarUrl}
                  size="md"
                  presence={playerTwo.presence}
                />
                {playerTwo.isWinner && (
                  <span
                    className="absolute -top-2 -right-1.5 select-none"
                    title="Winner"
                  >
                    <img
                      src="/assets/games/word-battle/icons/word-battle-crown.svg"
                      alt="Winner"
                      className="h-4 w-4 drop-shadow-sm"
                    />
                  </span>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <div className="flex flex-col text-right">
                <span className="text-xs text-neutral-400">Waiting...</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-neutral-300 text-xs text-neutral-400">
                ?
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
