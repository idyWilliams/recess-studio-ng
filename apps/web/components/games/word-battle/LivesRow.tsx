'use client';

interface LivesRowProps {
  label: string;
  lives: number;
  total: number;
  reverse?: boolean;
}

export function LivesRow({ label, lives, total, reverse = false }: LivesRowProps) {
  return (
    <div className={`flex items-center gap-1.5 ${reverse ? 'flex-row-reverse' : ''}`}>
      <span className="text-neutral-500">{label}:</span>
      <div className={`flex items-center gap-0.5 ${reverse ? 'flex-row-reverse' : ''}`}>
        {Array.from({ length: total }).map((_, i) => (
          <Heart key={i} active={i < lives} />
        ))}
      </div>
    </div>
  );
}

function Heart({ active }: { active: boolean }) {
  return (
    <svg
      viewBox="0 0 16 16"
      className="h-3.5 w-3.5"
      aria-hidden="true"
    >
      <path
        d="M8 14s-6-3.9-6-8.5C2 3 3.5 2 5 2c1 0 2.1.6 3 1.6C8.9 2.6 10 2 11 2c1.5 0 3 1 3 3.5C14 10.1 8 14 8 14z"
        fill={active ? '#EF4444' : 'rgba(255,255,255,0.12)'}
        stroke={active ? '#FF6B6B' : 'rgba(255,255,255,0.15)'}
        strokeWidth="0.5"
        style={active ? { filter: 'drop-shadow(0 0 4px rgba(239,68,68,0.5))' } : undefined}
      />
    </svg>
  );
}
