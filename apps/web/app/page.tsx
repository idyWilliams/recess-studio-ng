import { Button, GameCard, PlayerBadge, PvPMatchup, TurnIndicator } from '@recess/ui';

export default function HomePage() {
  return (
    <div className="min-h-dvh bg-recess-cream text-recess-text-primary">
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-20 border-b border-recess-cream-border bg-recess-cream/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-recess-purple to-recess-blue text-white shadow-glow-purple select-none">
              <span className="text-base font-black tracking-tight">R</span>
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-recess-text-muted">
                Studio
              </p>
              <h2 className="text-base font-extrabold tracking-tight text-recess-text-primary leading-none">
                Recess
              </h2>
            </div>
          </div>

          <PlayerBadge username="Chidi" rating={1420} presence="online" size="sm" />
        </div>
      </header>

      {/* Main Container */}
      <main className="mx-auto flex max-w-lg flex-col px-4 py-6 space-y-6 sm:px-6">
        {/* Brand Hero Heading */}
        <section className="text-left">
          <h1 className="text-3xl font-extrabold tracking-tight text-recess-text-primary sm:text-4xl">
            Recess
          </h1>
          <p className="mt-1 text-base font-semibold text-recess-purple">
            Play. Connect. Compete.
          </p>
          <p className="mt-2 text-xs leading-relaxed text-recess-text-secondary">
            Social multiplayer gaming inspired by the energy of Lagos. Real people,
            great games, instant fun.
          </p>
        </section>

        {/* Live Match Card */}
        <section aria-label="Active Game Session" className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-recess-text-muted">
              Current Game
            </h2>
            <TurnIndicator status="your_turn" />
          </div>

          <PvPMatchup
            roundInfo="Word Battle • Round 4 of 5"
            playerOne={{
              id: 'p1',
              username: 'Chidi',
              score: 18,
              presence: 'online',
              isCurrentTurn: true,
            }}
            playerTwo={{
              id: 'p2',
              username: 'Tunde',
              score: 15,
              presence: 'in_game',
            }}
          />

          <div className="flex gap-2">
            <Button variant="primary" fullWidth size="md">
              Submit Word
            </Button>
            <Button variant="secondary" size="md">
              Chat
            </Button>
          </div>
        </section>

        {/* Game Directory Card */}
        <section aria-label="Featured Games" className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-recess-text-muted">
            Available Games
          </h2>

          <GameCard
            id="word-battle"
            name="Word Battle"
            tagline="Turn-based vocabulary showdown. Build words, outscore your opponent, and take the crown."
            badge="Live"
            playersLabel="2 Players • Async"
            playLabel="Start Word Battle"
            artworkIcon={<span className="text-xl">⚔️</span>}
          />
        </section>

        {/* Seamless WhatsApp Invitation Doorway */}
        <section
          aria-label="WhatsApp Invitation Flow"
          className="rounded-2xl border border-recess-cream-border bg-white p-4 shadow-card"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg">
              💬
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-recess-text-primary">
                Instant WhatsApp Invites
              </h3>
              <p className="mt-0.5 text-xs text-recess-text-secondary leading-relaxed">
                Invite friends via a one-tap link on WhatsApp. No passwords, no phone
                numbers exposed—just instant social gaming.
              </p>
            </div>
          </div>
          <div className="mt-3">
            <Button variant="secondary" size="sm" fullWidth>
              Copy Invite Link
            </Button>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-4 text-center text-xs text-recess-text-muted">
          <p>Real People. Great Games. Instant Fun.</p>
          <p className="mt-1 text-[11px]">Recess Studio &copy; 2026</p>
        </footer>
      </main>
    </div>
  );
}
