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
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/[0.06] bg-[#0A0A0B]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] shadow-2xl"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`group flex flex-col items-center justify-center rounded-xl px-4 py-1.5 transition-all select-none active:scale-95 ${
                isActive
                  ? 'text-[#F4F4F0] font-medium'
                  : 'text-[#636366] hover:text-[#8E8E93]'
              }`}
            >
              <span
                aria-hidden="true"
                className={`h-4.5 w-4.5 transition-colors ${
                  isActive
                    ? 'bg-[#F4F4F0]'
                    : 'bg-[#636366] group-hover:bg-[#8E8E93]'
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
              {isActive ? (
                <span className="mt-1 h-1 w-1 rounded-full bg-[#C8B28A]" />
              ) : (
                <span className="mt-1 h-1 w-1" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
