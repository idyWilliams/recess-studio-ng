import { Avatar, Button } from '@recess/ui';

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
      <section className="flex flex-col items-center rounded-2xl border border-recess-cream-border bg-white p-6 shadow-card text-center">
        <Avatar
          username={profile.username}
          size="xl"
          presence="online"
          className="ring-4 ring-recess-purple/15"
        />

        <h1 className="mt-3 text-xl font-extrabold text-recess-text-primary">
          {profile.username}
        </h1>
        <p className="text-xs text-recess-text-secondary">Recess Gaming Profile</p>

        <div className="mt-3 flex items-center gap-2">
          <span className="rounded-full bg-recess-purple-light px-3 py-1 text-xs font-bold text-recess-purple">
            Rating: {profile.rating}
          </span>
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
            🔥 {profile.currentStreak} Streak
          </span>
        </div>
      </section>

      {/* Match Statistics Grid */}
      <section aria-label="Player Statistics" className="space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-recess-text-muted">
          Platform Statistics
        </h2>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-2xl border border-recess-cream-border bg-white p-3.5 shadow-card text-center">
            <span className="text-xs text-recess-text-secondary">Games</span>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-recess-text-primary">
              {profile.gamesPlayed}
            </p>
          </div>

          <div className="rounded-2xl border border-recess-cream-border bg-white p-3.5 shadow-card text-center">
            <span className="text-xs text-recess-text-secondary">Win Rate</span>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-recess-green">
              {winRate}%
            </p>
          </div>

          <div className="rounded-2xl border border-recess-cream-border bg-white p-3.5 shadow-card text-center">
            <span className="text-xs text-recess-text-secondary">Wins</span>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-recess-text-primary">
              {profile.wins}
            </p>
          </div>

          <div className="rounded-2xl border border-recess-cream-border bg-white p-3.5 shadow-card text-center">
            <span className="text-xs text-recess-text-secondary">Best Streak</span>
            <p className="mt-1 text-xl font-extrabold tabular-nums text-recess-gold">
              {profile.bestStreak}
            </p>
          </div>
        </div>

        {/* Record Breakdown */}
        <div className="rounded-2xl border border-recess-cream-border bg-white p-4 shadow-card">
          <div className="flex items-center justify-between text-xs font-semibold text-recess-text-secondary">
            <span>Wins: {profile.wins}</span>
            <span>Losses: {profile.losses}</span>
            <span>Draws: {profile.draws}</span>
          </div>
          <div className="mt-2.5 flex h-2.5 w-full overflow-hidden rounded-full bg-neutral-100">
            <div
              style={{ width: `${(profile.wins / profile.gamesPlayed) * 100}%` }}
              className="bg-recess-green"
              title="Wins"
            />
            <div
              style={{ width: `${(profile.losses / profile.gamesPlayed) * 100}%` }}
              className="bg-rose-400"
              title="Losses"
            />
            <div
              style={{ width: `${(profile.draws / profile.gamesPlayed) * 100}%` }}
              className="bg-neutral-300"
              title="Draws"
            />
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="pt-2">
        <Button variant="secondary" size="md" fullWidth>
          Edit Gaming Avatar
        </Button>
      </section>
    </main>
  );
}
