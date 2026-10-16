'use client';

interface CountdownBadgeProps {
  label: string;
  danger: boolean;
}

/**
 * Lives-HUD center badge: server turn counter plus the live countdown from the
 * persisted server deadline. Ticks to the danger color in the final seconds —
 * display-only; the server decides whether the turn has expired.
 */
export function CountdownBadge({ label, danger }: CountdownBadgeProps) {
  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider ${
        danger ? 'text-recess-red' : 'text-recess-gold'
      }`}
      role="timer"
      aria-label={`Turn progress: ${label} remaining`}
    >
      <span
        className={`h-2 w-2 rounded-full animate-pulse ${
          danger ? 'bg-recess-red' : 'bg-recess-green'
        }`}
        aria-hidden="true"
      />
      {label}
    </div>
  );
}
