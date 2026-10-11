import { ActiveTurnHero } from '@/components/home/ActiveTurnHero';
import { QuickPlaySection } from '@/components/home/QuickPlaySection';

export default function HomePage() {
  return (
    <main className="mx-auto flex max-w-lg flex-col px-4 py-6 space-y-6 sm:px-6">
      {/* Brand & Greeting Section */}
      <section className="text-left">
        <h1 className="text-3xl font-extrabold tracking-tight text-recess-text-primary sm:text-4xl">
          Recess
        </h1>
        <p className="mt-1 text-base font-semibold text-recess-purple">
          Play. Connect. Compete.
        </p>
        <p className="mt-1 text-xs text-recess-text-secondary">
          Welcome back,{' '}
          <span className="font-semibold text-recess-text-primary">Chidi</span>. You
          have 1 game waiting for your turn.
        </p>
      </section>

      {/* Primary Action: Active Game Turn */}
      <ActiveTurnHero />

      {/* Quick Play & Action Cards */}
      <QuickPlaySection />
    </main>
  );
}
