'use client';

import { useState } from 'react';
import { shareMatchSnapshotToWhatsApp } from '@/lib/share-snapshot';
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
  creatorName = 'A friend',
  shareUrl,
  stateVersion = 0,
  title = 'Instant WhatsApp Invitations',
  description = 'Invite anyone directly from WhatsApp. Your phone number is never exposed to opponents — all games run on verified Recess gaming profiles.',
  tone = 'dark',
}: WhatsAppInviteCardProps) {
  const [copied, setCopied] = useState(false);
  const [isSharing, setIsSharing] = useState(false);

  const resolvedUrl =
    shareUrl ||
    (publicId
      ? getVersionedMatchUrl(publicId, stateVersion)
      : typeof window !== 'undefined'
      ? `${window.location.origin}/games/word-battle`
      : `${process.env.NEXT_PUBLIC_SITE_URL || 'https://recess.studio'}/games/word-battle`);

  const fallbackWaLink = publicId
    ? formatWhatsAppInviteUrl(publicId, creatorName)
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

  const handleShareToWhatsApp = async () => {
    setIsSharing(true);
    try {
      await shareMatchSnapshotToWhatsApp({
        snapshotOptions: {
          gameName: 'Recess Social Arcade',
          headline: `${creatorName} invites you to play!`,
          statusBadge: 'WHATSAPP MINI-APP MATCH',
          playerOne: {
            name: creatorName,
            score: 1420,
            isCurrentTurn: true,
          },
          playerTwo: {
            name: 'Friend',
            score: 1200,
            isCurrentTurn: false,
          },
        },
        shareTitle: 'Recess Studio — Casual Social Gaming on WhatsApp',
        shareText: `🎮 ${creatorName} invited you to play casual arcade games on Recess!\n\nTap to join in your browser (no app required):\n${resolvedUrl}`,
        shareUrl: resolvedUrl,
        fallbackUrl: fallbackWaLink,
      });
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div
      aria-label="WhatsApp Invitation Panel"
      className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-b from-[#1F2C34]/95 via-[#0B141A]/95 to-[#05070B]/95 p-5 text-white shadow-2xl backdrop-blur-2xl"
    >
      {/* Subtle ambient green glow */}
      <div className="pointer-events-none absolute -top-12 -right-12 h-32 w-32 rounded-full bg-[#00A884]/15 blur-2xl" />

      <div className="flex items-start gap-3.5">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-[#00A884]/20 text-[#00A884] shadow-glow-emerald">
          <img
            src="/assets/shared/icons/icon-whatsapp.svg"
            alt="WhatsApp"
            className="h-6 w-6"
          />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-black text-white">{title}</h3>
            <span className="rounded-full bg-[#00A884]/20 px-2 py-0.5 text-[9px] font-extrabold uppercase text-[#00A884]">
              Zero Install
            </span>
          </div>
          <p className="mt-1 text-xs leading-relaxed text-white/60">
            {description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
        <button
          type="button"
          onClick={handleShareToWhatsApp}
          disabled={isSharing}
          className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-[#00A884] hover:bg-[#008f6f] px-4 py-2.5 text-xs font-black text-white shadow-glow-emerald transition-all active:scale-95 disabled:opacity-60"
        >
          <img
            src="/assets/shared/icons/icon-whatsapp.svg"
            alt=""
            className="h-4 w-4"
          />
          <span>{isSharing ? 'Generating Preview...' : 'Share on WhatsApp'}</span>
        </button>

        <button
          type="button"
          onClick={handleCopy}
          className="rounded-xl border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] px-4 py-2.5 text-xs font-bold text-white transition-all active:scale-95"
        >
          {copied ? '✓ Link Copied' : 'Copy Link'}
        </button>
      </div>
    </div>
  );
}
