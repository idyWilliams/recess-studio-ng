'use client';

import { useState } from 'react';
import { Button } from '@recess/ui';

export function WhatsAppInviteCard() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText('https://recess.gg/join/wb-chidi-492');
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      aria-label="WhatsApp Invitation Panel"
      className="rounded-2xl border border-recess-cream-border bg-white p-5 shadow-card"
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 text-xl shadow-sm">
          💬
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-recess-text-primary">
            Instant WhatsApp Invitations
          </h3>
          <p className="mt-1 text-xs text-recess-text-secondary leading-relaxed">
            Invite anyone directly from WhatsApp. Your phone number is never exposed to
            opponents—all games run on verified Recess gaming profiles.
          </p>
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" size="md" fullWidth onClick={handleCopy}>
          {copied ? '✓ Link Copied' : 'Copy Invite Link'}
        </Button>
      </div>
    </div>
  );
}
