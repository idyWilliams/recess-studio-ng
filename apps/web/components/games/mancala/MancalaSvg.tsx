'use client';

import React from 'react';

export interface MancalaBoardProps {
  pits: number[]; // Array of 14 numbers: 0..5 (P0 pits), 6 (P0 store), 7..12 (P1 pits), 13 (P1 store) or engine shape
  activePlayerIndex: number; // 0 or 1
  isMyTurn: boolean;
  myPlayerIndex: number; // 0 or 1
  onSelectPit?: (pitIndex: number) => void;
  lastSownPit?: number | null;
  disabled?: boolean;
}

/**
 * Bespoke Carved Mahogany / Ayoayo Mancala Board SVG
 * Features rich polished wood grain, recessed brass inlay rims,
 * and realistic 3D gloss Nickernuts (Ayo seeds) and golden cowrie shells.
 */
export const MancalaBoardSvg: React.FC<MancalaBoardProps> = ({
  pits,
  activePlayerIndex,
  isMyTurn,
  myPlayerIndex,
  onSelectPit,
  lastSownPit,
  disabled = false,
}) => {
  // Normalize pits array (14 slots: 0..5 p0, 6 p0 store, 7..12 p1, 13 p1 store)
  const safePits = pits.length === 14 ? pits : Array(14).fill(4);

  // Render Ayo Seed Cluster inside a pit or store
  const renderSeedCluster = (count: number, isStore: boolean = false) => {
    if (count === 0) return null;

    // Organic cluster offsets
    const maxVisibleSeeds = isStore ? 18 : 12;
    const displayCount = Math.min(count, maxVisibleSeeds);
    const seeds = [];

    // Precomputed natural distribution inside pit/store
    const seedOffsets = isStore
      ? [
          { x: 0, y: -40 }, { x: -8, y: -25 }, { x: 8, y: -22 },
          { x: -12, y: -5 }, { x: 0, y: 0 }, { x: 12, y: 3 },
          { x: -6, y: 18 }, { x: 7, y: 22 }, { x: -2, y: 38 },
          { x: -10, y: -15 }, { x: 10, y: -12 }, { x: -5, y: 8 },
          { x: 6, y: 12 }, { x: 0, y: -30 }, { x: 0, y: 28 },
          { x: -11, y: 25 }, { x: 9, y: 32 }, { x: 0, y: -10 }
        ]
      : [
          { x: 0, y: 0 }, { x: -10, y: -8 }, { x: 10, y: -7 },
          { x: -8, y: 10 }, { x: 9, y: 9 }, { x: -14, y: 0 },
          { x: 14, y: 2 }, { x: 0, y: -14 }, { x: 0, y: 14 },
          { x: -6, y: -6 }, { x: 7, y: 6 }, { x: -6, y: 6 }
        ];

    for (let i = 0; i < displayCount; i++) {
      const pos = seedOffsets[i % seedOffsets.length]!;
      const isCowrie = i % 4 === 3; // Every 4th seed is a golden Cowrie shell!
      seeds.push(
        <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
          {isCowrie ? (
            // Golden Cowrie Shell
            <g transform="rotate(25)">
              <ellipse rx="7.5" ry="4.5" fill="url(#cowrie-gold)" stroke="#78350F" strokeWidth="0.6" filter="url(#seed-shadow)" />
              <line x1="-5" y1="0" x2="5" y2="0" stroke="#451A03" strokeWidth="1.2" strokeLinecap="round" />
              <line x1="-3" y1="-1.5" x2="-3" y2="1.5" stroke="#78350F" strokeWidth="0.5" />
              <line x1="0" y1="-1.5" x2="0" y2="1.5" stroke="#78350F" strokeWidth="0.5" />
              <line x1="3" y1="-1.5" x2="3" y2="1.5" stroke="#78350F" strokeWidth="0.5" />
            </g>
          ) : (
            // Glossy 3D Nickernut / Ayo Seed (Grey-Greenish Ivory with specular highlight)
            <g>
              <ellipse rx="6.5" ry="6" fill="url(#nickernut-grad)" stroke="#27272A" strokeWidth="0.5" filter="url(#seed-shadow)" />
              {/* Specular 3D Reflection */}
              <ellipse cx="-2" cy="-2" rx="2.5" ry="1.8" fill="#FFFFFF" fillOpacity="0.45" />
            </g>
          )}
        </g>
      );
    }

    return (
      <g>
        {seeds}
        {/* Count Badge in center */}
        <g transform={`translate(0, ${isStore ? 48 : 22})`}>
          <circle r="9" fill="#18181B" fillOpacity="0.85" stroke="#F59E0B" strokeWidth="1" />
          <text
            x="0"
            y="3.2"
            fontFamily="'Helvetica Neue', 'Arial', sans-serif"
            fontWeight="900"
            fontSize="10"
            fill="#FEF3C7"
            textAnchor="middle"
          >
            {count}
          </text>
        </g>
      </g>
    );
  };

  // Top row pits (Player 1): pits 12, 11, 10, 9, 8, 7 (rendered left to right)
  const topRowPitIndices = [12, 11, 10, 9, 8, 7];
  // Bottom row pits (Player 0): pits 0, 1, 2, 3, 4, 5 (rendered left to right)
  const bottomRowPitIndices = [0, 1, 2, 3, 4, 5];

  const p1StoreIndex = 13; // Left store (Player 1)
  const p0StoreIndex = 6;  // Right store (Player 0)

  return (
    <div className="w-full max-w-2xl mx-auto select-none">
      <svg
        viewBox="0 0 680 260"
        className="w-full h-auto drop-shadow-2xl rounded-3xl overflow-hidden"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* 3D Board and Seed Shadows */}
          <filter id="board-bevel" x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#090503" floodOpacity="0.8" />
          </filter>
          <filter id="pit-recess" x="-10%" y="-10%" width="120%" height="120%">
            <feOffset dx="0" dy="3" />
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite operator="out" in="SourceGraphic" in2="blur" result="inverse" />
            <feFlood floodColor="#000000" floodOpacity="0.75" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>
          <filter id="seed-shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0.5" dy="1.5" stdDeviation="1.5" floodColor="#050302" floodOpacity="0.65" />
          </filter>

          {/* Mahogany Board Texture Gradient */}
          <linearGradient id="mahogany-base" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#451A03" />
            <stop offset="30%" stop-color="#2D1204" />
            <stop offset="70%" stop-color="#3F1703" />
            <stop offset="100%" stop-color="#1F0B02" />
          </linearGradient>

          {/* Brass Inlay Inset */}
          <linearGradient id="brass-rim" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#FDE68A" />
            <stop offset="50%" stop-color="#D97706" />
            <stop offset="100%" stop-color="#92400E" />
          </linearGradient>

          {/* Recessed Pit Interior */}
          <radialGradient id="pit-interior" cx="45%" cy="40%" r="65%">
            <stop offset="0%" stop-color="#261005" />
            <stop offset="60%" stop-color="#140702" />
            <stop offset="100%" stop-color="#080201" />
          </radialGradient>

          {/* Ayo Seed Gradient (Nickernut) */}
          <radialGradient id="nickernut-grad" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#E2E8F0" />
            <stop offset="35%" stop-color="#94A3B8" />
            <stop offset="75%" stop-color="#475569" />
            <stop offset="100%" stop-color="#1E293B" />
          </radialGradient>

          {/* Golden Cowrie Gradient */}
          <linearGradient id="cowrie-gold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FEF08A" />
            <stop offset="50%" stop-color="#F59E0B" />
            <stop offset="100%" stop-color="#B45309" />
          </linearGradient>
        </defs>

        {/* Main Carved Mahogany Board Shell */}
        <rect
          x="8"
          y="8"
          width="664"
          height="244"
          rx="40"
          ry="40"
          fill="url(#mahogany-base)"
          stroke="#1F0B02"
          strokeWidth="3"
        />

        {/* Carved Outer Rim Chamfer */}
        <rect
          x="14"
          y="14"
          width="652"
          height="232"
          rx="34"
          ry="34"
          fill="none"
          stroke="url(#brass-rim)"
          strokeWidth="1.2"
          strokeOpacity="0.45"
        />

        {/* Decorative Carved Center Line Divider */}
        <line x1="100" y1="130" x2="580" y2="130" stroke="#1F0B02" strokeWidth="2.5" />
        <line x1="100" y1="131" x2="580" y2="131" stroke="url(#brass-rim)" strokeWidth="0.6" strokeOpacity="0.3" />

        {/* LEFT STORE (Player 1 Kalah Store) */}
        <g transform="translate(60, 130)">
          {/* Brass Bevel Rim */}
          <rect
            x="-32"
            y="-94"
            width="64"
            height="188"
            rx="30"
            ry="30"
            fill="url(#brass-rim)"
          />
          {/* Recessed Pit Interior */}
          <rect
            x="-29"
            y="-91"
            width="58"
            height="182"
            rx="27"
            ry="27"
            fill="url(#pit-interior)"
            filter="url(#pit-recess)"
          />
          <text
            x="0"
            y="-72"
            fontFamily="'Helvetica Neue', sans-serif"
            fontWeight="800"
            fontSize="8"
            fill="#D97706"
            textAnchor="middle"
            letterSpacing="1"
          >
            P1 STORE
          </text>
          {renderSeedCluster(safePits[p1StoreIndex] ?? 0, true)}
        </g>

        {/* RIGHT STORE (Player 0 Kalah Store) */}
        <g transform="translate(620, 130)">
          {/* Brass Bevel Rim */}
          <rect
            x="-32"
            y="-94"
            width="64"
            height="188"
            rx="30"
            ry="30"
            fill="url(#brass-rim)"
          />
          {/* Recessed Pit Interior */}
          <rect
            x="-29"
            y="-91"
            width="58"
            height="182"
            rx="27"
            ry="27"
            fill="url(#pit-interior)"
            filter="url(#pit-recess)"
          />
          <text
            x="0"
            y="-72"
            fontFamily="'Helvetica Neue', sans-serif"
            fontWeight="800"
            fontSize="8"
            fill="#D97706"
            textAnchor="middle"
            letterSpacing="1"
          >
            P0 STORE
          </text>
          {renderSeedCluster(safePits[p0StoreIndex] ?? 0, true)}
        </g>

        {/* TOP ROW PITS (Player 1: 12, 11, 10, 9, 8, 7) */}
        {topRowPitIndices.map((pitIdx, i) => {
          const cx = 150 + i * 76;
          const cy = 72;
          const isSelectable =
            !disabled &&
            isMyTurn &&
            myPlayerIndex === 1 &&
            activePlayerIndex === 1 &&
            (safePits[pitIdx] ?? 0) > 0;
          const isLastSown = lastSownPit === pitIdx;

          return (
            <g
              key={pitIdx}
              transform={`translate(${cx}, ${cy})`}
              className={isSelectable ? 'cursor-pointer group' : ''}
              onClick={() => isSelectable && onSelectPit?.(pitIdx)}
            >
              {/* Outer Selection / Active Glow */}
              {isSelectable && (
                <circle
                  r="37"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}
              {isLastSown && (
                <circle
                  r="36"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              )}

              {/* Brass Rim */}
              <circle r="34" fill="url(#brass-rim)" />
              {/* Recessed Interior */}
              <circle r="31" fill="url(#pit-interior)" filter="url(#pit-recess)" />

              {/* Pit Index Label */}
              <text
                x="0"
                y="-18"
                fontFamily="'Helvetica Neue', sans-serif"
                fontWeight="700"
                fontSize="7.5"
                fill="#78350F"
                textAnchor="middle"
              >
                #{pitIdx}
              </text>

              {/* Seeds inside Pit */}
              {renderSeedCluster(safePits[pitIdx] ?? 0, false)}
            </g>
          );
        })}

        {/* BOTTOM ROW PITS (Player 0: 0, 1, 2, 3, 4, 5) */}
        {bottomRowPitIndices.map((pitIdx, i) => {
          const cx = 150 + i * 76;
          const cy = 188;
          const isSelectable =
            !disabled &&
            isMyTurn &&
            myPlayerIndex === 0 &&
            activePlayerIndex === 0 &&
            (safePits[pitIdx] ?? 0) > 0;
          const isLastSown = lastSownPit === pitIdx;

          return (
            <g
              key={pitIdx}
              transform={`translate(${cx}, ${cy})`}
              className={isSelectable ? 'cursor-pointer group' : ''}
              onClick={() => isSelectable && onSelectPit?.(pitIdx)}
            >
              {/* Outer Selection / Active Glow */}
              {isSelectable && (
                <circle
                  r="37"
                  fill="none"
                  stroke="#10B981"
                  strokeWidth="2.5"
                  className="animate-pulse"
                />
              )}
              {isLastSown && (
                <circle
                  r="36"
                  fill="none"
                  stroke="#F59E0B"
                  strokeWidth="2"
                  strokeDasharray="4,2"
                />
              )}

              {/* Brass Rim */}
              <circle r="34" fill="url(#brass-rim)" />
              {/* Recessed Interior */}
              <circle r="31" fill="url(#pit-interior)" filter="url(#pit-recess)" />

              {/* Pit Index Label */}
              <text
                x="0"
                y="-18"
                fontFamily="'Helvetica Neue', sans-serif"
                fontWeight="700"
                fontSize="7.5"
                fill="#78350F"
                textAnchor="middle"
              >
                #{pitIdx}
              </text>

              {/* Seeds inside Pit */}
              {renderSeedCluster(safePits[pitIdx] ?? 0, false)}
            </g>
          );
        })}
      </svg>
    </div>
  );
};
