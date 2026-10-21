import type { WordBattleSession } from './api-client';

export interface MatchCardData {
  publicId: string;
  session: WordBattleSession | null;
}

/**
 * Pure Satori-compatible React component rendering the 1200x630 dynamic OpenGraph preview card.
 * Uses exact inline CSS (Flexbox, gradients, box-shadows) supported by Satori.
 */
export function MatchPreviewCard({ publicId, session }: MatchCardData) {
  const p1 = session?.players[0];
  const p2 = session?.players[1];

  const p1Name = p1?.username ?? 'Player 1';
  const p2Name = p2?.username ?? 'Waiting for Opponent';

  const p1Initial = p1Name.charAt(0).toUpperCase();
  const p2Initial = p2 ? p2Name.charAt(0).toUpperCase() : '?';

  const state = session?.state;
  const p1Score = (p1 && state?.scores?.[p1.userId]) ?? 0;
  const p2Score = (p2 && state?.scores?.[p2.userId]) ?? 0;

  const p1Lives = (p1 && state?.lives?.[p1.userId]) ?? 3;
  const p2Lives = (p2 && state?.lives?.[p2.userId]) ?? 3;

  const status = session?.status ?? 'waiting';
  const isWaiting = status === 'waiting';
  const isCompleted = status === 'completed';

  // Last move summary
  let moveSummary = '⚔️ 15-second turn casual word duel — play directly in WhatsApp';
  if (isWaiting) {
    moveSummary = '⏳ Seat open! Tap to join the match and take the opening turn';
  } else if (isCompleted && session?.result) {
    const winner = session.players.find((p) => p.userId === session.result?.winnerId);
    if (session.result.isDraw) {
      moveSummary = `🤝 Tie game! Both players scored ${p1Score} pts`;
    } else if (winner) {
      moveSummary = `🏆 ${winner.username} takes the victory with ${session.result.scores[winner.userId] ?? p1Score} pts!`;
    }
  } else if (state?.history && state.history.length > 0) {
    const last = state.history[state.history.length - 1];
    if (last) {
      const actor = session?.players.find((p) => p.userId === last.playerId)?.username ?? 'Player';
      if (last.penalty) {
        moveSummary = `⚠️ ${actor}: ${last.penalty === 'TIMEOUT' ? 'Time ran out' : 'Penalty'} (−1 life)`;
      } else {
        moveSummary = `⚡ ${actor} played "${last.word}" (+${last.score} pts)`;
      }
    }
  }

  // Active status badge label
  let statusBadge = 'LIVE DUEL';
  let statusBadgeColor = '#10B981';
  if (isWaiting) {
    statusBadge = 'WAITING ROOM';
    statusBadgeColor = '#F59E0B';
  } else if (isCompleted) {
    statusBadge = 'FINAL RECAP';
    statusBadgeColor = '#8B5CF6';
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '1200px',
        height: '630px',
        backgroundColor: '#0A0E1A',
        backgroundImage:
          'radial-gradient(ellipse 70% 55% at 15% 10%, rgba(108,56,255,0.40) 0%, transparent 70%), radial-gradient(ellipse 60% 45% at 88% 18%, rgba(27,118,255,0.30) 0%, transparent 65%), radial-gradient(ellipse 80% 40% at 50% 105%, rgba(108,56,255,0.25) 0%, transparent 60%)',
        color: '#FFFFFF',
        padding: '36px 44px',
        justifyContent: 'space-between',
        fontFamily: 'sans-serif',
        boxSizing: 'border-box',
        border: '3px solid rgba(108,56,255,0.45)',
      }}
    >
      {/* ── Top Header ────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #6C38FF 0%, #1B76FF 100%)',
              fontWeight: '900',
              fontSize: '20px',
            }}
          >
            R
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span
              style={{
                fontSize: '11px',
                fontWeight: '700',
                letterSpacing: '3px',
                color: '#A78BFA',
                textTransform: 'uppercase',
              }}
            >
              RECESS STUDIO
            </span>
            <span style={{ fontSize: '22px', fontWeight: '800', color: '#FFFFFF' }}>
              WORD BATTLE
            </span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.15)',
            padding: '8px 18px',
            borderRadius: '24px',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '5px',
              backgroundColor: statusBadgeColor,
            }}
          />
          <span
            style={{
              fontSize: '13px',
              fontWeight: '800',
              letterSpacing: '1px',
              color: '#F3F4F6',
            }}
          >
            {statusBadge}
          </span>
        </div>
      </div>

      {/* ── Center Matchup ────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginTop: '6px',
        }}
      >
        {/* Player 1 Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '430px',
            background: 'linear-gradient(160deg, rgba(22,29,47,0.85) 0%, rgba(13,17,28,0.95) 100%)',
            border: '1.5px solid rgba(108,56,255,0.4)',
            borderRadius: '20px',
            padding: '24px 20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '76px',
              height: '76px',
              borderRadius: '38px',
              background: 'linear-gradient(135deg, #6C38FF 0%, #1B76FF 100%)',
              border: '3px solid rgba(167,139,250,0.6)',
              fontSize: '34px',
              fontWeight: '900',
              color: '#FFFFFF',
              boxShadow: '0 0 20px rgba(108,56,255,0.6)',
            }}
          >
            {p1Initial}
          </div>

          <span
            style={{
              fontSize: '26px',
              fontWeight: '800',
              color: '#FFFFFF',
              marginTop: '12px',
            }}
          >
            {p1Name}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
            }}
          >
            <span style={{ fontSize: '20px', fontWeight: '800', color: '#FBBF24' }}>
              {p1Score} PTS
            </span>
          </div>

          {/* Lives bar */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '32px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: i < p1Lives ? '#10B981' : '#374151',
                }}
              />
            ))}
          </div>
        </div>

        {/* Center VS Emblem */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '68px',
            height: '68px',
            borderRadius: '34px',
            background: 'linear-gradient(135deg, rgba(108,56,255,0.4) 0%, rgba(27,118,255,0.4) 100%)',
            border: '2px solid rgba(167,139,250,0.7)',
            fontSize: '22px',
            fontWeight: '900',
            color: '#EDE9FE',
            boxShadow: '0 0 24px rgba(108,56,255,0.5)',
          }}
        >
          VS
        </div>

        {/* Player 2 Card */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            width: '430px',
            background: 'linear-gradient(160deg, rgba(22,29,47,0.85) 0%, rgba(13,17,28,0.95) 100%)',
            border: p2 ? '1.5px solid rgba(27,118,255,0.4)' : '1.5px dashed rgba(255,255,255,0.2)',
            borderRadius: '20px',
            padding: '24px 20px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '76px',
              height: '76px',
              borderRadius: '38px',
              background: p2
                ? 'linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%)'
                : 'rgba(255,255,255,0.08)',
              border: p2
                ? '3px solid rgba(236,72,153,0.6)'
                : '2px dashed rgba(255,255,255,0.3)',
              fontSize: '34px',
              fontWeight: '900',
              color: p2 ? '#FFFFFF' : '#9CA3AF',
            }}
          >
            {p2Initial}
          </div>

          <span
            style={{
              fontSize: '26px',
              fontWeight: '800',
              color: p2 ? '#FFFFFF' : '#9CA3AF',
              marginTop: '12px',
            }}
          >
            {p2Name}
          </span>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
            }}
          >
            <span
              style={{
                fontSize: '20px',
                fontWeight: '800',
                color: p2 ? '#FBBF24' : '#6B7280',
              }}
            >
              {p2 ? `${p2Score} PTS` : 'Open Seat'}
            </span>
          </div>

          {/* Lives bar */}
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  width: '32px',
                  height: '8px',
                  borderRadius: '4px',
                  backgroundColor: p2 ? (i < p2Lives ? '#10B981' : '#374151') : '#374151',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Last Move / Turn Status Summary ───────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          padding: '12px 24px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: '14px',
        }}
      >
        <span
          style={{
            fontSize: '17px',
            fontWeight: '600',
            color: '#E0E7FF',
          }}
        >
          {moveSummary}
        </span>
      </div>

      {/* ── Bottom CTA Banner ─────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          paddingTop: '8px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span style={{ fontSize: '13px', fontWeight: '700', color: '#9CA3AF' }}>
            15s per turn • Server-authoritative • Instant WhatsApp sync
          </span>
          <span style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>
            Match #{publicId}
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            background: 'linear-gradient(90deg, #6C38FF 0%, #1B76FF 100%)',
            padding: '14px 32px',
            borderRadius: '16px',
            boxShadow: '0 0 25px rgba(108,56,255,0.7)',
          }}
        >
          <span
            style={{
              fontSize: '18px',
              fontWeight: '900',
              letterSpacing: '1px',
              color: '#FFFFFF',
            }}
          >
            ▶ {isWaiting ? 'TAP TO TAKE OPEN SEAT' : 'TAP TO PLAY YOUR TURN'}
          </span>
        </div>
      </div>
    </div>
  );
}
