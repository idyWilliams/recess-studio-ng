'use client';

import { useState } from 'react';
import { Button } from '@recess/ui';

import {
  formatWhatsAppDeepLink,
  formatWhatsAppInviteUrl,
  getVersionedMatchUrl,
} from '@/lib/whatsapp';

export interface WhatsAppInviteCardProps {
  publicId?: string | undefined;
  creatorName?: string | undefined;
  shareUrl?: string | undefined;
  stateVersion?: number | undefined;
  title?: string | undefined;
  description?: string | undefined;
  tone?: 'light' | 'dark' | undefined;
}

export function WhatsAppInviteCard({
  publicId,
  creatorName,
  shareUrl,
  stateVersion = 0,
  title = 'Instant WhatsApp Invitations',
  description = 'Invite anyone directly from WhatsApp. Your phone number is never exposed to opponents — all games run on verified Recess gaming profiles.',
  tone = 'light',
}: WhatsAppInviteCardProps) {
  const [copied, setCopied] = useState(false);

  const resolvedUrl =
    shareUrl ||
    (publicId
      ? getVersionedMatchUrl(publicId, stateVersion)
      : typeof window !== 'undefined'
      ? `${window.location.origin}/games/word-battle`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio'}/games/word-battle`);

  const waLink = publicId
    ? formatWhatsAppInviteUrl(publicId, creatorName ?? 'A friend')
    : formatWhatsAppDeepLink(
        `🎮 Play games with me on Recess!\n\nJoin directly in your browser:\n${resolvedUrl}`,
      );

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      void navigator.clipboard.writeText(resolvedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isDark = tone === 'dark';

  return (
    <div
      aria-label="WhatsApp Invitation Panel"
      className={`rounded-2xl p-5 ${
        isDark
          ? 'border border-white/10 bg-[#161D2F] text-white shadow-xl'
          : 'border border-recess-cream-border bg-white text-recess-text-primary shadow-card'
      }`}
    >
      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 shadow-sm">
          <img
            src="/assets/shared/icons/icon-whatsapp.svg"
            alt="WhatsApp"
            className="h-6 w-6 text-emerald-600"
          />
        </div>
        <div className="min-w-0">
          <h3
            className={`text-sm font-bold ${
              isDark ? 'text-white' : 'text-recess-text-primary'
            }`}
          >
            {title}
          </h3>
          <p
            className={`mt-1 text-xs leading-relaxed ${
              isDark ? 'text-neutral-400' : 'text-recess-text-secondary'
            }`}
          >
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2">
        {(() => {
          const isNative = waLink.startsWith('whatsapp://');
          return (
            <a
              href={waLink}
              target={isNative ? undefined : '_blank'}
              rel={isNative ? undefined : 'noopener noreferrer'}
              className="flex-1"
            >
              <Button
                variant="primary"
                size="md"
                fullWidth
                className="!bg-emerald-600 hover:!bg-emerald-500 !border-emerald-500 text-white font-bold"
              >
                <span className="flex items-center justify-center gap-2">
                  <img
                    src="/assets/shared/icons/icon-whatsapp.svg"
                    alt=""
                    className="h-4 w-4 filter invert"
                  />
                  Share on WhatsApp
                </span>
              </Button>
            </a>
          );
        })()}

        <Button
          variant={isDark ? 'secondary' : 'secondary'}
          size="md"
          onClick={handleCopy}
          className={isDark ? '!bg-white/10 !text-white !border-white/15' : ''}
        >
          {copied ? '✓ Link Copied' : 'Copy Invite Link'}
        </Button>
      </div>
    </div>
  );
}
