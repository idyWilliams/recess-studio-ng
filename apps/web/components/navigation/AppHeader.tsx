'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function AppHeader() {
  const pathname = usePathname();

  // Don't show the standard header inside an active fullscreen game arena
  if (pathname.startsWith('/games/word-battle')) {
    return null;
  }

  return (
    <header className="sticky top-0 z-30 border-b border-recess-cream-border bg-recess-cream/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-lg items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 transition-transform active:scale-95"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-recess-purple to-recess-blue text-white shadow-glow-purple select-none">
            <span className="text-base font-black tracking-tight">R</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-recess-text-muted leading-none">
              Studio
            </p>
            <h2 className="text-base font-extrabold tracking-tight text-recess-text-primary leading-tight">
              Recess
            </h2>
          </div>
        </Link>

        <Link
          href="/profile"
          className="flex items-center gap-2 rounded-full border border-recess-cream-border bg-white py-1 pl-1.5 pr-3 text-xs font-semibold text-recess-text-primary shadow-sm transition-all hover:border-recess-purple"
        >
          <img
            src="/assets/shared/avatars/avatar-chidi.svg"
            alt="Chidi"
            className="h-5 w-5 rounded-full"
          />
          <span>Chidi</span>
          <span className="rounded bg-recess-purple-light px-1 text-[10px] font-bold text-recess-purple">
            1420
          </span>
        </Link>
      </div>
    </header>
  );
}
