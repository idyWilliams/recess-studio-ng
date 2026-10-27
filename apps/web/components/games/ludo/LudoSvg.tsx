'use client';

import React from 'react';

export type LudoColor = 'red' | 'green' | 'yellow' | 'blue';

export interface LudoTokenInfo {
  id: string;
  color: LudoColor;
  index: number;
  step: number; // -1 = yard, 0..50 = track, 51..55 = stretch, 56 = home
  isHome: boolean;
  trackSquare?: number | null;
  isSafe?: boolean;
}

export interface LudoBoardProps {
  tokens: Record<LudoColor, LudoTokenInfo[]>;
  activeColor: LudoColor;
  myColor?: LudoColor;
  turnPhase: 'roll' | 'move';
  diceRoll: number | null;
  validTokenIndices?: number[];
  onRollDice?: () => void;
  onSelectToken?: (tokenIndex: number) => void;
  isMyTurn?: boolean;
  disabled?: boolean;
}

export const LUDO_COLOR_MAP: Record<LudoColor, {
  name: string;
  fill: string;
  dark: string;
  light: string;
  accent: string;
}> = {
  red: {
    name: 'Crimson Flame',
    fill: '#EF4444',
    dark: '#991B1B',
    light: '#FCA5A5',
    accent: '#B91C1C',
  },
  green: {
    name: 'Naija Emerald',
    fill: '#00A884',
    dark: '#065F46',
    light: '#6EE7B7',
    accent: '#047857',
  },
  yellow: {
    name: 'Royal Gold',
    fill: '#F59E0B',
    dark: '#92400E',
    light: '#FDE68A',
    accent: '#B45309',
  },
  blue: {
    name: 'Electric Indigo',
    fill: '#6366F1',
    dark: '#3730A3',
    light: '#A5B4FC',
    accent: '#4338CA',
  },
};

/**
 * 3D Bevelled Ludo Token Pawn SVG
 */
export const LudoPawnSvg: React.FC<{
  color: LudoColor;
  size?: number;
  isSelectable?: boolean;
  onClick?: () => void;
}> = ({ color, size = 28, isSelectable = false, onClick }) => {
  const c = LUDO_COLOR_MAP[color];
  return (
    <g
      className={isSelectable ? 'cursor-pointer group' : ''}
      onClick={isSelectable ? onClick : undefined}
    >
      {isSelectable && (
        <circle r={size * 0.75} fill="none" stroke="#FDE047" strokeWidth="2.5" className="animate-ping opacity-75" />
      )}
      {/* Token Drop Shadow */}
      <ellipse cx="0" cy={size * 0.4} rx={size * 0.45} ry={size * 0.2} fill="#000000" fillOpacity="0.4" />
      {/* Base Pedestal */}
      <ellipse cx="0" cy={size * 0.25} rx={size * 0.4} ry={size * 0.16} fill={c.dark} />
      <ellipse cx="0" cy={size * 0.22} rx={size * 0.38} ry={size * 0.14} fill={c.fill} />
      {/* Body Stem */}
      <path
        d={`M ${-size * 0.25} ${size * 0.2} Q ${-size * 0.12} ${-size * 0.05} ${-size * 0.18} ${-size * 0.15} L ${size * 0.18} ${-size * 0.15} Q ${size * 0.12} ${-size * 0.05} ${size * 0.25} ${size * 0.2} Z`}
        fill={`url(#pawn-grad-${color})`}
      />
      {/* Collar Ring */}
      <ellipse cx="0" cy={-size * 0.15} rx={size * 0.22} ry={size * 0.08} fill="#FEF08A" stroke={c.dark} strokeWidth="0.5" />
      {/* Head Sphere with 3D Specular */}
      <circle cx="0" cy={-size * 0.35} r={size * 0.22} fill={c.fill} stroke={c.dark} strokeWidth="0.75" />
      <ellipse cx={-size * 0.06} cy={-size * 0.42} rx={size * 0.09} ry={size * 0.06} fill="#FFFFFF" fillOpacity="0.65" />
    </g>
  );
};

/**
 * 3D Animated Ludo Dice SVG
 */
export const LudoDiceSvg: React.FC<{
  value: number | null;
  isRolling?: boolean;
  canRoll?: boolean;
  onRoll?: () => void;
  size?: number;
}> = ({ value, isRolling = false, canRoll = false, onRoll, size = 64 }) => {
  const pips: Record<number, Array<[number, number]>> = {
    1: [[0, 0]],
    2: [[-14, -14], [14, 14]],
    3: [[-14, -14], [0, 0], [14, 14]],
    4: [[-14, -14], [14, -14], [-14, 14], [14, 14]],
    5: [[-14, -14], [14, -14], [0, 0], [-14, 14], [14, 14]],
    6: [[-14, -16], [14, -16], [-14, 0], [14, 0], [-14, 16], [14, 16]],
  };

  const activePips = value && pips[value] ? pips[value] : [];

  return (
    <div
      onClick={canRoll ? onRoll : undefined}
      className={`relative inline-flex items-center justify-center select-none transition-transform duration-200 ${
        canRoll ? 'cursor-pointer active:scale-90 hover:scale-105' : ''
      }`}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 72 72" className="w-full h-full drop-shadow-xl overflow-visible">
        <defs>
          <linearGradient id="dice-face" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#FFFFFF" />
            <stop offset="70%" stop-color="#F4F4F5" />
            <stop offset="100%" stop-color="#E4E4E7" />
          </linearGradient>
          <radialGradient id="pip-recess" cx="40%" cy="35%" r="65%">
            <stop offset="0%" stop-color="#18181B" />
            <stop offset="100%" stop-color="#09090B" />
          </radialGradient>
        </defs>

        {/* Outer Dice Shell */}
        <rect
          x="4"
          y="4"
          width="64"
          height="64"
          rx="14"
          ry="14"
          fill="url(#dice-face)"
          stroke="#D4D4D8"
          strokeWidth="1.5"
        />

        {/* Dice Bevel Inset */}
        <rect
          x="7"
          y="7"
          width="58"
          height="58"
          rx="11"
          ry="11"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.2"
        />

        {/* Dice Pips */}
        {value ? (
          <g transform="translate(36, 36)">
            {activePips.map(([px, py], idx) => (
              <g key={idx} transform={`translate(${px}, ${py})`}>
                <circle r="4.8" fill="url(#pip-recess)" />
                <circle cx="-1" cy="-1" r="1.2" fill="#71717A" fillOpacity="0.4" />
              </g>
            ))}
          </g>
        ) : (
          <g transform="translate(36, 36)">
            <text
              x="0"
              y="6"
              fontFamily="'Impact', 'Arial Black', sans-serif"
              fontSize="20"
              fill="#71717A"
              textAnchor="middle"
            >
              ?
            </text>
          </g>
        )}
      </svg>
    </div>
  );
};

/**
 * Bespoke Precision Vector Ludo Cross Board SVG
 */
export const LudoBoardSvg: React.FC<LudoBoardProps> = ({
  tokens,
  activeColor,
  myColor,
  turnPhase,
  diceRoll,
  validTokenIndices = [],
  onRollDice,
  onSelectToken,
  isMyTurn = false,
  disabled = false,
}) => {
  // Grid size: 15 x 15 cells. Board dimension: 600 x 600 px (40px per cell).
  const cellSize = 40;

  // Track coordinates for 52 main loop squares (in cell units 0..14)
  // Standard Ludo track clockwise mapping starting from Red's entry square (col 1, row 6)
  const trackSquareCoords: Array<[number, number]> = [
    // Red quadrant outgoing (0..4)
    [1, 6], [2, 6], [3, 6], [4, 6], [5, 6],
    // Turning up into Green quadrant (5..10)
    [6, 5], [6, 4], [6, 3], [6, 2], [6, 1], [6, 0],
    // Green top crest (11..12)
    [7, 0], [8, 0],
    // Green coming down (13..17) - 13 is Green start!
    [8, 1], [8, 2], [8, 3], [8, 4], [8, 5],
    // Turning right into Yellow (18..23)
    [9, 6], [10, 6], [11, 6], [12, 6], [13, 6], [14, 6],
    // Yellow right crest (24..25)
    [14, 7], [14, 8],
    // Yellow going left (26..30) - 26 is Yellow start!
    [13, 8], [12, 8], [11, 8], [10, 8], [9, 8],
    // Turning down into Blue (31..36)
    [8, 9], [8, 10], [8, 11], [8, 12], [8, 13], [8, 14],
    // Blue bottom crest (37..38)
    [7, 14], [6, 14],
    // Blue going up (39..43) - 39 is Blue start!
    [6, 13], [6, 12], [6, 11], [6, 10], [6, 9],
    // Turning left toward Red (44..49)
    [5, 8], [4, 8], [3, 8], [2, 8], [1, 8], [0, 8],
    // Red left crest (50..51)
    [0, 7], [0, 6],
  ];

  // Home stretch coordinates (5 cells each)
  const homeStretchCoords: Record<LudoColor, Array<[number, number]>> = {
    red: [[1, 7], [2, 7], [3, 7], [4, 7], [5, 7]],
    green: [[7, 1], [7, 2], [7, 3], [7, 4], [7, 5]],
    yellow: [[13, 7], [12, 7], [11, 7], [10, 7], [9, 7]],
    blue: [[7, 13], [7, 12], [7, 11], [7, 10], [7, 9]],
  };

  // Safe squares where stars are drawn (indices on track 0..51)
  const safeSquares = [0, 8, 13, 21, 26, 34, 39, 47];

  // Yard center coordinates for the 4 corner home bases
  const yardCenters: Record<LudoColor, { x: number; y: number }> = {
    red: { x: 120, y: 120 },
    green: { x: 480, y: 120 },
    yellow: { x: 480, y: 480 },
    blue: { x: 120, y: 480 },
  };

  // Yard pocket offsets for the 4 tokens in each yard
  const yardPockets = [
    { dx: -45, dy: -45 },
    { dx: 45, dy: -45 },
    { dx: -45, dy: 45 },
    { dx: 45, dy: 45 },
  ];

  return (
    <div className="w-full max-w-xl mx-auto select-none">
      <svg
        viewBox="0 0 600 600"
        className="w-full h-auto drop-shadow-2xl rounded-2xl overflow-hidden bg-stone-900 border-2 border-stone-800"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gradients for pawns */}
          {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((c) => (
            <linearGradient key={c} id={`pawn-grad-${c}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stop-color={LUDO_COLOR_MAP[c].light} />
              <stop offset="60%" stop-color={LUDO_COLOR_MAP[c].fill} />
              <stop offset="100%" stop-color={LUDO_COLOR_MAP[c].dark} />
            </linearGradient>
          ))}
        </defs>

        {/* 1. Track Base Grid Squares */}
        {trackSquareCoords.map(([col, row], sqIdx) => {
          const x = col * cellSize;
          const y = row * cellSize;
          const isSafe = safeSquares.includes(sqIdx);

          // Start square colors
          let fill = '#1C1917'; // Neutral dark track
          if (sqIdx === 0) fill = LUDO_COLOR_MAP.red.fill;
          if (sqIdx === 13) fill = LUDO_COLOR_MAP.green.fill;
          if (sqIdx === 26) fill = LUDO_COLOR_MAP.yellow.fill;
          if (sqIdx === 39) fill = LUDO_COLOR_MAP.blue.fill;

          return (
            <g key={sqIdx}>
              <rect
                x={x + 1}
                y={y + 1}
                width={cellSize - 2}
                height={cellSize - 2}
                rx={4}
                fill={fill}
                stroke="#292524"
                strokeWidth="1"
              />
              {/* Star on Safe Squares */}
              {isSafe && (
                <text
                  x={x + cellSize / 2}
                  y={y + cellSize / 2 + 5}
                  fontSize="16"
                  fill="#FDE047"
                  textAnchor="middle"
                >
                  ★
                </text>
              )}
            </g>
          );
        })}

        {/* 2. Colored Home Stretches */}
        {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((colKey) =>
          homeStretchCoords[colKey].map(([col, row], sIdx) => {
            const x = col * cellSize;
            const y = row * cellSize;
            return (
              <rect
                key={`${colKey}-stretch-${sIdx}`}
                x={x + 1}
                y={y + 1}
                width={cellSize - 2}
                height={cellSize - 2}
                rx={4}
                fill={LUDO_COLOR_MAP[colKey].fill}
                stroke="#292524"
                strokeWidth="1"
              />
            );
          })
        )}

        {/* 3. Four Home Base Yards (6x6 cells each = 240x240px) */}
        {/* Red Yard (Top Left: 0..240, 0..240) */}
        <g transform="translate(0, 0)">
          <rect width="240" height="240" fill={LUDO_COLOR_MAP.red.fill} stroke="#1C1917" strokeWidth="2" />
          <rect x="30" y="30" width="180" height="180" rx="20" fill="#18181B" stroke="#FCA5A5" strokeWidth="2" />
          {yardPockets.map((p, i) => (
            <circle key={i} cx={120 + p.dx} cy={120 + p.dy} r="22" fill={LUDO_COLOR_MAP.red.fill} opacity="0.3" stroke="#FCA5A5" strokeWidth="1.5" />
          ))}
        </g>

        {/* Green Yard (Top Right: 360..600, 0..240) */}
        <g transform="translate(360, 0)">
          <rect width="240" height="240" fill={LUDO_COLOR_MAP.green.fill} stroke="#1C1917" strokeWidth="2" />
          <rect x="30" y="30" width="180" height="180" rx="20" fill="#18181B" stroke="#6EE7B7" strokeWidth="2" />
          {yardPockets.map((p, i) => (
            <circle key={i} cx={120 + p.dx} cy={120 + p.dy} r="22" fill={LUDO_COLOR_MAP.green.fill} opacity="0.3" stroke="#6EE7B7" strokeWidth="1.5" />
          ))}
        </g>

        {/* Yellow Yard (Bottom Right: 360..600, 360..600) */}
        <g transform="translate(360, 360)">
          <rect width="240" height="240" fill={LUDO_COLOR_MAP.yellow.fill} stroke="#1C1917" strokeWidth="2" />
          <rect x="30" y="30" width="180" height="180" rx="20" fill="#18181B" stroke="#FDE68A" strokeWidth="2" />
          {yardPockets.map((p, i) => (
            <circle key={i} cx={120 + p.dx} cy={120 + p.dy} r="22" fill={LUDO_COLOR_MAP.yellow.fill} opacity="0.3" stroke="#FDE68A" strokeWidth="1.5" />
          ))}
        </g>

        {/* Blue Yard (Bottom Left: 0..240, 360..600) */}
        <g transform="translate(0, 360)">
          <rect width="240" height="240" fill={LUDO_COLOR_MAP.blue.fill} stroke="#1C1917" strokeWidth="2" />
          <rect x="30" y="30" width="180" height="180" rx="20" fill="#18181B" stroke="#A5B4FC" strokeWidth="2" />
          {yardPockets.map((p, i) => (
            <circle key={i} cx={120 + p.dx} cy={120 + p.dy} r="22" fill={LUDO_COLOR_MAP.blue.fill} opacity="0.3" stroke="#A5B4FC" strokeWidth="1.5" />
          ))}
        </g>

        {/* 4. Central 4-Triangle Finish Zone (cols 6..8, rows 6..8 = 240..360) */}
        <g transform="translate(240, 240)">
          {/* Base square */}
          <rect width="120" height="120" fill="#18181B" />
          {/* Red Left Triangle */}
          <polygon points="0,0 60,60 0,120" fill={LUDO_COLOR_MAP.red.fill} />
          {/* Green Top Triangle */}
          <polygon points="0,0 120,0 60,60" fill={LUDO_COLOR_MAP.green.fill} />
          {/* Yellow Right Triangle */}
          <polygon points="120,0 120,120 60,60" fill={LUDO_COLOR_MAP.yellow.fill} />
          {/* Blue Bottom Triangle */}
          <polygon points="0,120 120,120 60,60" fill={LUDO_COLOR_MAP.blue.fill} />
          {/* Center Crown Ring */}
          <circle cx="60" cy="60" r="16" fill="#18181B" stroke="#FEF08A" strokeWidth="2" />
          <text x="60" y="65" fontSize="14" fill="#FEF08A" textAnchor="middle">👑</text>
        </g>

        {/* 5. Render Tokens */}
        {(['red', 'green', 'yellow', 'blue'] as LudoColor[]).map((colKey) => {
          const colorTokens = tokens[colKey] ?? [];
          return colorTokens.map((t, tIdx) => {
            let cx = 0;
            let cy = 0;

            if (t.step === -1) {
              // Token in Yard pocket
              const base = yardCenters[colKey];
              const pocket = yardPockets[t.index % yardPockets.length]!;
              cx = base.x + pocket.dx;
              cy = base.y + pocket.dy;
            } else if (t.isHome || t.step === 56) {
              // Token in Home Center
              cx = 300;
              cy = 300;
            } else if (t.step >= 51 && t.step <= 55) {
              // In Home stretch
              const stretchIdx = t.step - 51;
              const [col, row] = homeStretchCoords[colKey][stretchIdx]!;
              cx = col * cellSize + cellSize / 2;
              cy = row * cellSize + cellSize / 2;
            } else if (t.trackSquare !== undefined && t.trackSquare !== null && trackSquareCoords[t.trackSquare]) {
              // On Track
              const [col, row] = trackSquareCoords[t.trackSquare]!;
              cx = col * cellSize + cellSize / 2;
              cy = row * cellSize + cellSize / 2;
            }

            const isSelectable =
              !disabled &&
              isMyTurn &&
              activeColor === colKey &&
              turnPhase === 'move' &&
              validTokenIndices.includes(t.index);

            return (
              <g key={t.id} transform={`translate(${cx}, ${cy})`}>
                <LudoPawnSvg
                  color={colKey}
                  size={26}
                  isSelectable={isSelectable}
                  onClick={() => isSelectable && onSelectToken?.(t.index)}
                />
              </g>
            );
          });
        })}
      </svg>
    </div>
  );
};
