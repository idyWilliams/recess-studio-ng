'use client';

import { useState, type FormEvent } from 'react';

interface RegisterCardProps {
  title: string;
  description: string;
  tone?: 'light' | 'dark';
  isPending: boolean;
  error: string | null;
  onRegister: (username: string) => void;
}

export function RegisterCard({
  title,
  description,
  isPending,
  error,
  onRegister,
}: RegisterCardProps) {
  const [username, setUsername] = useState('');

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = username.trim();
    if (trimmed.length > 0 && !isPending) {
      onRegister(trimmed);
    }
  };

  return (
    <section
      className="rounded-2xl border border-white/[0.08] bg-[#121214] p-5 text-[#F4F4F0]"
      aria-label={title}
    >
      <h2 className="text-sm font-medium text-[#F4F4F0]">
        {title}
      </h2>
      <p className="mt-1 text-xs text-[#8E8E93]">
        {description}
      </p>

      <form onSubmit={handleSubmit} className="mt-3.5 flex flex-col gap-2 sm:flex-row">
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
          className="min-w-0 flex-1 rounded-xl border border-white/[0.08] bg-[#18181B] px-3.5 py-2.5 text-sm text-[#F4F4F0] placeholder-[#52525B] outline-none transition-colors focus:border-white/30"
        />
        <button
          type="submit"
          disabled={isPending}
          className="rounded-xl bg-[#F4F4F0] hover:bg-white text-[#0A0A0B] text-xs font-medium px-5 py-2.5 transition-all active:scale-95 disabled:opacity-50"
        >
          {isPending ? 'Registering...' : 'Create Profile'}
        </button>
      </form>

      {error && (
        <p className="mt-2 text-xs text-rose-400" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
