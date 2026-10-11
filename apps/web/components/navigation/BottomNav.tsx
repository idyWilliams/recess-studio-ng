'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/', icon: '🏠' },
  { label: 'Games', href: '/games', icon: '🎮' },
  { label: 'Friends', href: '/friends', icon: '👥' },
  { label: 'Profile', href: '/profile', icon: '👤' },
];

export function BottomNav() {
  const pathname = usePathname();

  // Hide navigation inside active game arena to give full immersion
  if (pathname.startsWith('/games/word-battle')) {
    return null;
  }

  return (
    <nav
      aria-label="Bottom Navigation"
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-recess-cream-border bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-lg"
    >
      <div className="mx-auto flex max-w-lg items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center rounded-xl px-4 py-1.5 transition-all select-none ${
                isActive
                  ? 'text-recess-purple font-bold'
                  : 'text-recess-text-secondary hover:text-recess-text-primary'
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span className="mt-1 text-[11px] leading-tight tracking-tight">
                {item.label}
              </span>
              {isActive && (
                <span className="mt-0.5 h-1 w-4 rounded-full bg-recess-purple" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
