import Link from 'next/link';
import { GameCard } from '@recess/ui';

export default function GamesPage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 space-y-6 sm:px-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-recess-text-primary sm:text-3xl">
          Games
        </h1>
        <p className="text-xs text-recess-text-secondary">
          Pick a title, challenge friends, or jump into asynchronous turn duels.
        </p>
      </header>

      {/* Game Catalog */}
      <section aria-label="Game Catalog" className="space-y-4">
        <Link href="/games/word-battle" className="block">
          <GameCard
            id="word-battle"
            name="Word Battle"
            tagline="Turn-based vocabulary showdown. Build words, outscore your opponent, and take the crown."
            badge="Featured • Live"
            playersLabel="2 Players • Async"
            playLabel="Enter Word Battle Arena"
            artworkIcon={<span className="text-2xl">⚔️</span>}
          />
        </Link>

        {/* Future Titles Teaser */}
        <div className="rounded-2xl border border-dashed border-recess-cream-border bg-white/60 p-5 text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-neutral-100 text-neutral-400 text-lg">
            🎲
          </div>
          <h3 className="mt-2 text-sm font-bold text-recess-text-primary">
            More Games in Studio
          </h3>
          <p className="mt-0.5 text-xs text-recess-text-secondary">
            New board and puzzle games are currently being forged for Recess.
          </p>
        </div>
      </section>
    </main>
  );
}
