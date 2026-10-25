import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const alt = 'Recess Studio — WhatsApp Social Arcade';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          backgroundColor: '#05070B',
          padding: '60px 70px',
          fontFamily: 'sans-serif',
          position: 'relative',
        }}
      >
        {/* Ambient Glows */}
        <div
          style={{
            position: 'absolute',
            top: '-80px',
            left: '200px',
            width: '500px',
            height: '400px',
            borderRadius: '50%',
            background: 'rgba(108, 56, 255, 0.28)',
            filter: 'blur(90px)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '-60px',
            right: '150px',
            width: '450px',
            height: '350px',
            borderRadius: '50%',
            background: 'rgba(0, 168, 132, 0.22)',
            filter: 'blur(90px)',
          }}
        />

        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, #6C38FF 0%, #1B76FF 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#FFFFFF',
                fontSize: '28px',
                fontWeight: 900,
                boxShadow: '0 0 25px rgba(108, 56, 255, 0.5)',
              }}
            >
              R
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span
                style={{
                  fontSize: '13px',
                  fontWeight: 900,
                  letterSpacing: '3px',
                  color: '#A78BFA',
                  textTransform: 'uppercase',
                }}
              >
                Recess Studio
              </span>
              <span
                style={{
                  fontSize: '24px',
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.5px',
                }}
              >
                Social Gaming Arcade
              </span>
            </div>
          </div>

          {/* WhatsApp Badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              borderRadius: '999px',
              backgroundColor: 'rgba(0, 168, 132, 0.15)',
              border: '1.5px solid rgba(0, 168, 132, 0.5)',
            }}
          >
            <div
              style={{
                width: '10px',
                height: '10px',
                borderRadius: '50%',
                backgroundColor: '#00A884',
                boxShadow: '0 0 10px #00A884',
              }}
            />
            <span
              style={{
                fontSize: '14px',
                fontWeight: 800,
                color: '#34D399',
                letterSpacing: '1px',
              }}
            >
              WHATSAPP MINI-APP COMPANION
            </span>
          </div>
        </div>

        {/* Center Main Headline */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            zIndex: 10,
          }}
        >
          <div
            style={{
              fontSize: '56px',
              fontWeight: 900,
              color: '#FFFFFF',
              lineHeight: 1.1,
              letterSpacing: '-1.5px',
            }}
          >
            Play Premium Casual Games <br />
            <span
              style={{
                background: 'linear-gradient(90deg, #A78BFA, #38BDF8, #34D399)',
                backgroundClip: 'text',
                color: 'transparent',
              }}
            >
              Directly with Friends on WhatsApp
            </span>
          </div>
          <div
            style={{
              fontSize: '20px',
              fontWeight: 600,
              color: 'rgba(255, 255, 255, 0.65)',
              maxWidth: '900px',
            }}
          >
            Instant asynchronous duels • No app downloads required • Server-authoritative moves & live rating ladders
          </div>
        </div>

        {/* Bottom Cartridge Badges */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingTop: '24px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 10,
          }}
        >
          <div style={{ display: 'flex', gap: '14px' }}>
            {[
              { name: '⚔️ Word Battle', color: '#6C38FF' },
              { name: '🪨 Mancala Royale', color: '#F59E0B' },
              { name: '🃏 Whot! Naija', color: '#10B981' },
              { name: '🎲 Ludo Arena', color: '#EC4899' },
            ].map((game) => (
              <div
                key={game.name}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.12)',
                  color: '#FFFFFF',
                  fontSize: '15px',
                  fontWeight: 800,
                }}
              >
                {game.name}
              </div>
            ))}
          </div>

          <div
            style={{
              fontSize: '15px',
              fontWeight: 700,
              color: '#94A3B8',
            }}
          >
            recess.studio
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=0, s-maxage=300, must-revalidate',
        'Access-Control-Allow-Origin': '*',
      },
    },
  );
}
