'use client';

import { useState, type FormEvent } from 'react';

import { Button } from '@recess/ui';

interface RegisterCardProps {
  title: string;
  description: string;
  tone?: 'light' | 'dark';
  isPending: boolean;
  error: string | null;
  onRegister: (username: string) => void;
}

/**
 * Minimal player-identity form (username → POST /auth/register). Presentation only —
 * the parent owns the mutation and error mapping. The server validates usernames
 * authoritatively; the input attributes here are light-touch hints.
 */
export function RegisterCard({
  title,
  description,
  tone = 'light',
  isPending,
  error,
  onRegister,
}: RegisterCardProps) {
  const [username, setUsername] = useState('');
  const dark = tone === 'dark';

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length > 0 && !isPending) {
      onRegister(trimmed);
    }
  };

  return (
    <section
      className={`rounded-2xl p-5 ${dark ? 'text-white' : 'border border-recess-cream-border bg-white shadow-card'}`}
      style={
        dark
          ? {
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
            }
          : undefined
      }
      aria-label={title}
    >
      <h2 className={`text-sm font-bold ${dark ? 'text-white' : 'text-recess-text-primary'}`}>
        {title}
      </h2>
      <p className={`mt-1 text-xs ${dark ? 'text-neutral-400' : 'text-recess-text-secondary'}`}>
        {description}
      </p>

      <form onSubmit={handleSubmit} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="Choose a username"
          aria-label="Username"
          autoComplete="off"
          spellCheck={false}
          minLength={3}
          maxLength={32}
          disabled={isPending}
          className={`min-w-0 flex-1 rounded-xl px-3 py-2.5 text-sm font-semibold outline-none transition-colors focus:ring-2 focus:ring-recess-purple ${
            dark
              ? 'border border-white/10 bg-white/10 text-white placeholder:text-neutral-500'
              : 'border border-recess-cream-border bg-recess-cream text-recess-text-primary placeholder:text-recess-text-muted'
          }`}
        />
        <Button type="submit" size="md" isLoading={isPending} disabled={isPending}>
          Create Profile
        </Button>
      </form>

      {error && (
        <p
          className={`mt-2 text-xs font-semibold ${dark ? 'text-rose-300' : 'text-recess-error'}`}
          role="alert"
        >
          {error}
        </p>
      )}
    </section>
  );
}
