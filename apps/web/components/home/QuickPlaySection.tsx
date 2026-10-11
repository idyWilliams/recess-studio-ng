import Link from 'next/link';
import { Button } from '@recess/ui';

export function QuickPlaySection() {
  return (
    <section aria-label="Quick Actions" className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-recess-text-muted">
          Quick Play
        </h2>
        <Link
          href="/games"
          className="text-xs font-semibold text-recess-purple hover:underline"
        >
          View all games &rarr;
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/games/word-battle" className="block">
          <div className="flex h-full flex-col justify-between rounded-2xl border border-recess-cream-border bg-white p-4 shadow-card transition-all hover:border-recess-purple hover:shadow-card-hover active:scale-[0.98]">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-recess-purple to-recess-blue text-white shadow-glow-purple">
                <span className="text-lg">⚔️</span>
              </div>
              <h3 className="mt-3 text-sm font-bold text-recess-text-primary">
                Word Battle
              </h3>
              <p className="mt-0.5 text-xs text-recess-text-secondary line-clamp-2">
                Vocabulary duels with friends.
              </p>
            </div>
            <div className="mt-3 pt-2">
              <Button variant="primary" size="sm" fullWidth>
                Play Now
              </Button>
            </div>
          </div>
        </Link>

        <Link href="/friends" className="block">
          <div className="flex h-full flex-col justify-between rounded-2xl border border-recess-cream-border bg-white p-4 shadow-card transition-all hover:border-emerald-500 hover:shadow-card-hover active:scale-[0.98]">
            <div>
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-lg">
                💬
              </div>
              <h3 className="mt-3 text-sm font-bold text-recess-text-primary">
                Invite a Friend
              </h3>
              <p className="mt-0.5 text-xs text-recess-text-secondary line-clamp-2">
                Share an instant game link.
              </p>
            </div>
            <div className="mt-3 pt-2">
              <Button variant="secondary" size="sm" fullWidth>
                Share Link
              </Button>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
