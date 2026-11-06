'use client';

import React from 'react';

export interface PlayerMedallionProps {
  username?: string | null | undefined;
  displayName?: string | null | undefined;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | undefined;
  countryFlag?: string | null | undefined;
  showFlag?: boolean | undefined;
  isOnline?: boolean | undefined;
  className?: string | undefined;
}

export function getPlayerInitials(name?: string | null): string {
  if (!name) return '•';
  const clean = name.replace(/^@/, '').trim();
  if (!clean) return '•';
  const parts = clean.split(/[_\s.-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return clean.slice(0, 2).toUpperCase();
}

const SIZE_STYLES = {
  xs: {
    container: 'h-6 w-6 text-[10px]',
    flag: 'text-[9px] -bottom-0.5 -right-0.5',
    dot: 'h-1.5 w-1.5 -bottom-0.5 -right-0.5',
  },
  sm: {
    container: 'h-8 w-8 text-xs',
    flag: 'text-[10px] -bottom-0.5 -right-0.5',
    dot: 'h-2 w-2 -bottom-0.5 -right-0.5',
  },
  md: {
    container: 'h-10 w-10 text-sm',
    flag: 'text-xs -bottom-1 -right-1',
    dot: 'h-2.5 w-2.5 -bottom-0.5 -right-0.5',
  },
  lg: {
    container: 'h-12 w-12 text-base',
    flag: 'text-xs -bottom-1 -right-1',
    dot: 'h-3 w-3 -bottom-0.5 -right-0.5',
  },
  xl: {
    container: 'h-16 w-16 text-xl',
    flag: 'text-sm -bottom-1 -right-1',
    dot: 'h-3.5 w-3.5 -bottom-0.5 -right-0.5',
  },
};

export function PlayerMedallion({
  username,
  displayName,
  size = 'md',
  countryFlag,
  showFlag = false,
  isOnline,
  className = '',
}: PlayerMedallionProps) {
  const label = displayName || username || 'Player';
  const initials = getPlayerInitials(label);
  const styles = SIZE_STYLES[size] ?? SIZE_STYLES.md;

  return (
    <div
      className={`relative inline-flex flex-shrink-0 items-center justify-center rounded-full bg-[#18181B] border border-white/10 select-none ${styles.container} ${className}`}
      aria-label={label}
    >
      <span className="font-semibold tracking-wider text-[#F4F4F0] antialiased">
        {initials}
      </span>

      {showFlag && countryFlag && (
        <span
          className={`absolute flex items-center justify-center leading-none pointer-events-none ${styles.flag}`}
          title={countryFlag}
        >
          {countryFlag}
        </span>
      )}

      {isOnline !== undefined && !showFlag && (
        <span
          className={`absolute rounded-full border-2 border-[#121214] ${
            isOnline ? 'bg-[#34D399]' : 'bg-[#52525B]'
          } ${styles.dot}`}
        />
      )}
    </div>
  );
}
