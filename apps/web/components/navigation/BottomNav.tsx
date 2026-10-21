'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Arcade', href: '/', icon: '/assets/shared/icons/icon-home.svg' },
  { label: 'Games', href: '/games', icon: '/assets/shared/icons/icon-gamepad.svg' },
  { label: 'Friends', href: '/friends', icon: '/assets/shared/icons/icon-users.svg' },
  { label: 'Leaderboard', href: '/leaderboard', icon: '/assets/shared/icons/icon-trophy.svg' },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide navigation inside active game arena to give full immersion
  if (pathname.startsWith('/games/word-battle/') || pathname.startsWith('/games/mancala/')) {
    return null;
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.08] bg-[#05070B]/85 backdrop-blur-2xl pb-[env(safe-area-inset-bottom)] shadow-2xl"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center justify-center rounded-2xl px-4 py-1.5 transition-all select-none active:scale-95 ${
                isActive
                  ? 'text-recess-purple-light font-extrabold'
                  : 'text-white/50 hover:text-white'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-5 w-5 transition-colors ${
                  isActive
                    ? 'bg-gradient-to-t from-recess-purple to-pink-400'
                    : 'bg-white/50 group-hover:bg-white'
                }`}
                style={{
                  maskImage: `url(${item.icon})`,
                  WebkitMaskImage: `url(${item.icon})`,
                  maskSize: 'contain',
                  WebkitMaskSize: 'contain',
                  maskRepeat: 'no-repeat',
                  WebkitMaskRepeat: 'no-repeat',
                  maskPosition: 'center',
                  WebkitMaskPosition: 'center',
                  display: 'inline-block',
                }}
              />
              <span className="mt-1 text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="mt-0.5 h-1 w-4 rounded-full bg-recess-purple shadow-glow-purple" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
