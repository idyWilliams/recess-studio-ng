import { PlayerMedallion } from '@/components/ui/PlayerMedallion';

export default function ProfilePage() {
  const profile = {
    username: 'Chidi',
    rating: 1420,
    currentStreak: 4,
    bestStreak: 7,
    gamesPlayed: 28,
    wins: 19,
    losses: 7,
    draws: 2,
    knockouts: 12,
  };

  const winRate = Math.round((profile.wins / profile.gamesPlayed) * 100);

  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 space-y-6 sm:px-6">
      {/* Player Identity Hero */}
      <section className="flex flex-col items-center rounded-2xl border border-white/[0.06] bg-[#121214] p-6 text-center">
        <PlayerMedallion
          username={profile.username}
          size="xl"
          isOnline={true}
        />

        <h1 className="mt-3 text-xl font-medium tracking-tight text-[#F4F4F0]">
          @{profile.username}
        </h1>
        <p className="text-xs text-[#8E8E93]">Member Profile</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-lg bg-[#18181B] border border-white/[0.08] px-3 py-1 text-xs font-medium tabular-nums text-[#C8B28A]">
            Rating {profile.rating}
          </span>
          <span className="rounded-lg bg-[#18181B] border border-white/[0.08] px-3 py-1 text-xs font-medium tabular-nums text-[#8E8E93]">
            {profile.currentStreak} Streak
          </span>
        </div>
      </section>

      {/* Match Statistics Grid */}
      <section aria-label="Player Statistics" className="space-y-3">
        <h2 className="text-[10px] font-medium uppercase tracking-widest text-[#52525B]">
          Performance Record
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-3.5 text-center">
            <span className="text-xs text-[#8E8E93]">Matches</span>
            <p className="mt-1 text-xl font-medium tabular-nums text-[#F4F4F0]">
              {profile.gamesPlayed}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-3.5 text-center">
            <span className="text-xs text-[#8E8E93]">Win Rate</span>
            <p className="mt-1 text-xl font-medium tabular-nums text-[#34D399]">
              {winRate}%
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-3.5 text-center">
            <span className="text-xs text-[#8E8E93]">Victories</span>
            <p className="mt-1 text-xl font-medium tabular-nums text-[#F4F4F0]">
              {profile.wins}
            </p>
          </div>

          <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-3.5 text-center">
            <span className="text-xs text-[#8E8E93]">Peak Streak</span>
            <p className="mt-1 text-xl font-medium tabular-nums text-[#C8B28A]">
              {profile.bestStreak}
            </p>
          </div>
        </div>

        {/* Record Breakdown */}
        <div className="rounded-2xl border border-white/[0.06] bg-[#121214] p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-medium text-[#8E8E93] tabular-nums">
            <span>Wins {profile.wins}</span>
            <span>Losses {profile.losses}</span>
            <span>Draws {profile.draws}</span>
          </div>
          <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#18181B]">
            <div
              style={{ width: `${(profile.wins / profile.gamesPlayed) * 100}%` }}
              className="bg-[#34D399]"
              title="Wins"
            />
            <div
              style={{ width: `${(profile.losses / profile.gamesPlayed) * 100}%` }}
              className="bg-rose-400"
              title="Losses"
            />
            <div
              style={{ width: `${(profile.draws / profile.gamesPlayed) * 100}%` }}
              className="bg-[#52525B]"
              title="Draws"
            />
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="pt-2">
        <button
          type="button"
          className="w-full py-3 rounded-xl border border-white/[0.08] bg-[#1A1A1E] hover:bg-[#222227] text-[#E4E4E0] font-medium text-sm transition-colors"
        >
          Preferences
        </button>
      </section>
    </main>
  );
}
