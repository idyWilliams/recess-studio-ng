'use client';

import React from 'react';

export type WhotSuit = 'circle' | 'triangle' | 'cross' | 'square' | 'star' | 'whot';

export interface WhotCardSvgProps {
  suit: WhotSuit;
  number: number;
  faceDown?: boolean | undefined;
  isPlayable?: boolean | undefined;
  isSelected?: boolean | undefined;
  isSmall?: boolean | undefined;
  badge?: string | undefined;
  onClick?: (() => void) | undefined;
  className?: string | undefined;
  id?: string | undefined;
}

/**
 * Bespoke Nigerian Whot Card SVG Suite
 * Rendered with cream linen surface, precise geometric vectors,
 * authentic maroon/crimson styling, and royal gold accents for 20.
 */
export const WhotCardSvg: React.FC<WhotCardSvgProps> = ({
  suit,
  number,
  faceDown = false,
  isPlayable = false,
  isSelected = false,
  isSmall = false,
  badge,
  onClick,
  className = '',
  id,
}) => {
  // If card is face down, render the card back
  if (faceDown) {
    return (
      <div
        id={id}
        onClick={onClick}
        className={`relative inline-block transition-transform duration-200 select-none ${
          onClick ? 'cursor-pointer active:scale-95' : ''
        } ${isSmall ? 'w-12 h-[72px]' : 'w-20 h-28 sm:w-24 sm:h-36'} ${className}`}
      >
        <img
          src="/assets/games/whot/card-back.svg"
          alt="Whot Market Card Back"
          className="w-full h-full object-contain drop-shadow-md rounded-xl"
          draggable={false}
        />
        {badge && (
          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-stone-950 border border-amber-300 shadow">
            {badge}
          </span>
        )}
      </div>
    );
  }

  // Color scheme: Classic Nigerian Crimson/Maroon `#7A1C24` for standard suits,
  // Obsidian `#18181B` & Gold `#D97706` for Whot 20.
  const isWhot20 = suit === 'whot' || number === 20;
  const isSpecial = number === 1 || number === 2 || number === 5 || number === 8 || number === 14;
  const primaryColor = isWhot20 ? '#B45309' : '#7A1C24';
  const secondaryColor = isWhot20 ? '#1C1917' : '#991B1B';
  const accentGold = '#D4AF37';

  // Render Suit Emblem
  const renderEmblem = (size: number) => {
    switch (suit) {
      case 'circle':
        return (
          <g>
            <circle cx="0" cy="0" r={size * 0.45} fill="none" stroke={primaryColor} strokeWidth={size * 0.1} />
            <circle cx="0" cy="0" r={size * 0.28} fill="none" stroke={secondaryColor} strokeWidth={size * 0.05} strokeDasharray="3,3" />
            <circle cx="0" cy="0" r={size * 0.16} fill={primaryColor} />
          </g>
        );
      case 'triangle':
        return (
          <g>
            <polygon
              points={`0,${-size * 0.48} ${size * 0.45},${size * 0.42} ${-size * 0.45},${size * 0.42}`}
              fill={primaryColor}
              stroke={secondaryColor}
              strokeWidth={size * 0.04}
            />
            <polygon
              points={`0,${-size * 0.22} ${size * 0.22},${size * 0.25} ${-size * 0.22},${size * 0.25}`}
              fill="#FAF6EE"
            />
            <circle cx="0" cy={size * 0.1} r={size * 0.08} fill={primaryColor} />
          </g>
        );
      case 'cross':
        return (
          <g>
            <path
              d={`
                M ${-size * 0.15} ${-size * 0.48} 
                H ${size * 0.15} 
                V ${-size * 0.15} 
                H ${size * 0.48} 
                V ${size * 0.15} 
                H ${size * 0.15} 
                V ${size * 0.48} 
                H ${-size * 0.15} 
                V ${size * 0.15} 
                H ${-size * 0.48} 
                V ${-size * 0.15} 
                H ${-size * 0.15} 
                Z
              `}
              fill={primaryColor}
              stroke={secondaryColor}
              strokeWidth={size * 0.04}
            />
            <circle cx="0" cy="0" r={size * 0.09} fill="#FAF6EE" />
          </g>
        );
      case 'square':
        return (
          <g>
            <rect
              x={-size * 0.42}
              y={-size * 0.42}
              width={size * 0.84}
              height={size * 0.84}
              rx={size * 0.06}
              fill={primaryColor}
              stroke={secondaryColor}
              strokeWidth={size * 0.04}
            />
            <polygon
              points={`0,${-size * 0.28} ${size * 0.28},0 0,${size * 0.28} ${-size * 0.28},0`}
              fill="#FAF6EE"
            />
            <rect
              x={-size * 0.12}
              y={-size * 0.12}
              width={size * 0.24}
              height={size * 0.24}
              fill={primaryColor}
            />
          </g>
        );
      case 'star':
        return (
          <g>
            <polygon
              points={`
                0,${-size * 0.48}
                ${size * 0.15},${-size * 0.16}
                ${size * 0.48},${-size * 0.14}
                ${size * 0.23},${size * 0.1}
                ${size * 0.31},${size * 0.44}
                0,${size * 0.25}
                ${-size * 0.31},${size * 0.44}
                ${-size * 0.23},${size * 0.1}
                ${-size * 0.48},${-size * 0.14}
                ${-size * 0.15},${-size * 0.16}
              `}
              fill={primaryColor}
              stroke={secondaryColor}
              strokeWidth={size * 0.04}
            />
            <circle cx="0" cy="0" r={size * 0.12} fill="#FAF6EE" />
            <circle cx="0" cy="0" r={size * 0.06} fill={primaryColor} />
          </g>
        );
      case 'whot':
        return (
          <g>
            {/* 4 Corner miniature suit watermarks */}
            <circle cx="-28" cy="-28" r="4.5" fill="#B45309" opacity="0.3" />
            <polygon points="28,-33 33,-24 23,-24" fill="#B45309" opacity="0.3" />
            <rect x="-32" y="24" width="8" height="8" fill="#B45309" opacity="0.3" />
            <polygon points="28,24 30,29 35,29 31,32 33,37 28,34 23,37 25,32 21,29 26,29" fill="#B45309" opacity="0.3" />

            {/* Royal Crest Shield & Crown */}
            <path
              d="M -22 -16 L -16 2 L 16 2 L 22 -16 L 8 -8 L 0 -24 L -8 -8 Z"
              fill={accentGold}
              stroke="#78350F"
              strokeWidth="1.2"
            />
            <circle cx="0" cy="-24" r="2.2" fill="#FEF08A" />
            <circle cx="-22" cy="-16" r="1.8" fill="#FEF08A" />
            <circle cx="22" cy="-16" r="1.8" fill="#FEF08A" />

            {/* WHOT! Banner text */}
            <rect x="-34" y="6" width="68" height="24" rx="4" fill="#1C1917" stroke={accentGold} strokeWidth="1" />
            <text
              x="0"
              y="23"
              fontFamily="'Impact', 'Arial Black', sans-serif"
              fontWeight="900"
              fontSize="16"
              fill={accentGold}
              textAnchor="middle"
              letterSpacing="1.2"
            >
              WHOT!
            </text>
          </g>
        );
      default:
        return null;
    }
  };

  return (
    <div
      id={id}
      onClick={isPlayable || onClick ? onClick : undefined}
      className={`relative inline-block transition-all duration-200 select-none ${
        onClick || isPlayable ? 'cursor-pointer active:scale-95' : ''
      } ${isSelected ? '-translate-y-3 shadow-2xl ring-4 ring-amber-400 rounded-xl' : ''} ${
        isPlayable && !isSelected ? 'hover:-translate-y-1.5 ring-2 ring-emerald-400/80 shadow-lg rounded-xl' : ''
      } ${isSmall ? 'w-12 h-[72px]' : 'w-20 h-28 sm:w-24 sm:h-36'} ${className}`}
    >
      <svg
        viewBox="0 0 100 144"
        className="w-full h-full drop-shadow-md overflow-hidden rounded-xl"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id={`card-inner-shadow-${suit}-${number}`} x="-5%" y="-5%" width="110%" height="110%">
            <feOffset dx="0" dy="1" />
            <feGaussianBlur stdDeviation="1" result="offset-blur" />
            <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse" />
            <feFlood floodColor="black" floodOpacity="0.2" result="color" />
            <feComposite operator="in" in="color" in2="inverse" result="shadow" />
            <feComposite operator="over" in="shadow" in2="SourceGraphic" />
          </filter>

          {/* Subtle Linen Texture Pattern */}
          <pattern id={`linen-pat-${suit}-${number}`} width="6" height="6" patternUnits="userSpaceOnUse">
            <rect width="6" height="6" fill="#FAF6EE" />
            <line x1="0" y1="3" x2="6" y2="3" stroke="#E8E0D0" strokeWidth="0.5" strokeOpacity="0.5" />
            <line x1="3" y1="0" x2="3" y2="6" stroke="#E8E0D0" strokeWidth="0.5" strokeOpacity="0.5" />
          </pattern>
        </defs>

        {/* Card Face Background */}
        <rect
          x="1"
          y="1"
          width="98"
          height="142"
          rx="7"
          ry="7"
          fill={`url(#linen-pat-${suit}-${number})`}
          stroke="#D6CEBE"
          strokeWidth="1.2"
        />

        {/* Inner Inset Border Trim */}
        <rect
          x="5"
          y="5"
          width="90"
          height="134"
          rx="5"
          ry="5"
          fill="none"
          stroke={isWhot20 ? accentGold : '#C2B8A3'}
          strokeWidth={isWhot20 ? 1 : 0.75}
          strokeOpacity={isWhot20 ? 0.9 : 0.6}
        />

        {/* Top-Left Corner Index */}
        <g transform="translate(11, 19)">
          <text
            x="0"
            y="0"
            fontFamily="'Helvetica Neue', 'Arial', sans-serif"
            fontWeight="900"
            fontSize="14"
            fill={primaryColor}
            textAnchor="start"
          >
            {number}
          </text>
          <g transform="translate(4, 9)">{renderEmblem(11)}</g>
        </g>

        {/* Center Suit Emblem */}
        <g transform="translate(50, 72)">
          {renderEmblem(isWhot20 ? 56 : 52)}
        </g>

        {/* Bottom-Right Inverted Corner Index */}
        <g transform="translate(89, 125) rotate(180)">
          <text
            x="0"
            y="0"
            fontFamily="'Helvetica Neue', 'Arial', sans-serif"
            fontWeight="900"
            fontSize="14"
            fill={primaryColor}
            textAnchor="start"
          >
            {number}
          </text>
          <g transform="translate(4, 9)">{renderEmblem(11)}</g>
        </g>

        {/* Special Power Card Badge Bar */}
        {isSpecial && (
          <g transform="translate(50, 131)">
            <rect
              x="-28"
              y="-6"
              width="56"
              height="10"
              rx="3"
              fill={primaryColor}
              opacity="0.88"
            />
            <text
              x="0"
              y="1.5"
              fontFamily="'Helvetica Neue', sans-serif"
              fontWeight="800"
              fontSize="5.2"
              fill="#FAF6EE"
              textAnchor="middle"
              letterSpacing="0.5"
            >
              {number === 1
                ? 'HOLD ON'
                : number === 2
                ? 'PICK TWO'
                : number === 5
                ? 'PICK THREE'
                : number === 8
                ? 'SUSPENSION'
                : number === 14
                ? 'GO GEN!'
                : ''}
            </text>
          </g>
        )}
      </svg>

      {/* Floating Badge (e.g. pending defense, play recommendation) */}
      {badge && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 text-[10px] font-black rounded-full bg-emerald-500 text-stone-950 border border-emerald-300 shadow">
          {badge}
        </span>
      )}
    </div>
  );
};
