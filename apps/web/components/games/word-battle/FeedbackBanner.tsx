'use client';

import type { MoveFeedback } from '@/lib/word-battle-view';

interface FeedbackBannerProps {
  feedback: MoveFeedback | null;
}

export function FeedbackBanner({ feedback }: FeedbackBannerProps) {
  if (!feedback) return null;

  return (
    <div
      className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-center text-xs font-bold animate-fade-in ${
        feedback.type === 'valid'
          ? 'text-emerald-300'
          : feedback.type === 'invalid'
            ? 'text-rose-300'
            : 'text-recess-purple-light'
      }`}
      style={{
        background:
          feedback.type === 'valid'
            ? 'rgba(16,185,129,0.15)'
            : feedback.type === 'invalid'
              ? 'rgba(239,68,68,0.15)'
              : 'rgba(108,56,255,0.15)',
        border: `1px solid ${
          feedback.type === 'valid'
            ? 'rgba(16,185,129,0.30)'
            : feedback.type === 'invalid'
              ? 'rgba(239,68,68,0.30)'
              : 'rgba(108,56,255,0.30)'
        }`,
      }}
      role="status"
      aria-live="polite"
    >
      {feedback.type === 'valid' && (
        <img
          src="/assets/games/word-battle/effects/word-battle-sparkle.svg"
          alt=""
          aria-hidden="true"
          className="h-3.5 w-3.5"
        />
      )}
      {feedback.message}
    </div>
  );
}
