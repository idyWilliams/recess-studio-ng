import type { ReactNode } from 'react';

export type PresenceStatus = 'online' | 'in_game' | 'offline';
export type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface AvatarProps {
  username: string;
  avatarUrl?: string | null | undefined;
  size?: AvatarSize | undefined;
  presence?: PresenceStatus | undefined;
  className?: string | undefined;
}

const sizeClasses: Record<
  AvatarSize,
  { container: string; text: string; dot: string }
> = {
  xs: { container: 'h-6 w-6', text: 'text-[10px]', dot: 'h-2 w-2 ring-1' },
  sm: { container: 'h-8 w-8', text: 'text-xs', dot: 'h-2.5 w-2.5 ring-1.5' },
  md: { container: 'h-10 w-10', text: 'text-sm font-semibold', dot: 'h-3 w-3 ring-2' },
  lg: { container: 'h-14 w-14', text: 'text-lg font-bold', dot: 'h-3.5 w-3.5 ring-2' },
  xl: { container: 'h-18 w-18', text: 'text-2xl font-bold', dot: 'h-4 w-4 ring-2' },
};

const presenceClasses: Record<PresenceStatus, string> = {
  online: 'bg-recess-green ring-white',
  in_game: 'bg-recess-purple ring-white animate-pulse',
  offline: 'bg-neutral-300 ring-white',
};

// Deterministic vibrant gradient generator based on username characters
const gradientPalettes = [
  'from-purple-600 to-indigo-600',
  'from-blue-600 to-cyan-500',
  'from-emerald-500 to-teal-600',
  'from-amber-500 to-orange-600',
  'from-rose-500 to-pink-600',
  'from-violet-600 to-fuchsia-600',
];

function getGradient(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = (hash << 5) - hash + username.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % gradientPalettes.length;
  return gradientPalettes[index] ?? 'from-purple-600 to-indigo-600';
}

function getInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

export function Avatar({
  username,
  avatarUrl,
  size = 'md',
  presence,
  className = '',
}: AvatarProps) {
  const config = sizeClasses[size];
  const initials = getInitials(username);
  const gradient = getGradient(username);

  return (
    <div
      className={`relative inline-block flex-shrink-0 ${config.container} ${className}`}
    >
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={username}
          className="h-full w-full rounded-full object-cover ring-2 ring-white/80 shadow-sm"
        />
      ) : (
        <div
          className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-tr ${gradient} text-white shadow-sm ring-2 ring-white/80 select-none ${config.text}`}
          aria-label={username}
        >
          {initials}
        </div>
      )}

      {presence && (
        <span
          className={`absolute bottom-0 right-0 rounded-full ${config.dot} ${presenceClasses[presence]}`}
          title={`Status: ${presence.replace('_', ' ')}`}
          aria-label={`Player is ${presence.replace('_', ' ')}`}
        />
      )}
    </div>
  );
}

export interface PlayerBadgeProps {
  username: string;
  avatarUrl?: string | null | undefined;
  presence?: PresenceStatus | undefined;
  rating?: number | null | undefined;
  subtitle?: ReactNode | undefined;
  size?: AvatarSize | undefined;
  className?: string | undefined;
}

export function PlayerBadge({
  username,
  avatarUrl,
  presence,
  rating,
  subtitle,
  size = 'md',
  className = '',
}: PlayerBadgeProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <Avatar
        username={username}
        avatarUrl={avatarUrl}
        size={size}
        presence={presence}
      />
      <div className="flex flex-col min-w-0 text-left">
        <div className="flex items-center gap-1.5 truncate">
          <span className="truncate text-sm font-semibold text-recess-text-primary">
            {username}
          </span>
          {rating !== undefined && rating !== null && (
            <span className="rounded-md bg-recess-purple-light px-1.5 py-0.5 text-[11px] font-bold text-recess-purple">
              {rating}
            </span>
          )}
        </div>
        {subtitle && (
          <span className="truncate text-xs text-recess-text-secondary">
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
}
