# Recess Studio — Asset Library

This directory is the centralized, organized asset repository for Recess Studio, housing game artwork, board frames, letter tiles, avatars, and HUD/action icons.

## Directory Structure

```text
apps/web/public/assets/
├── games/
│   └── word-battle/
│       ├── backgrounds/
│       │   ├── word-battle-bg-midnight.svg   # Primary game arena background with subtle grid & cosmic dust
│       │   └── word-battle-bg-arena.svg      # Alternate arena stage background with glowing concentric rings
│       ├── boards/
│       │   ├── word-battle-board-frame.svg   # Beveled physical board casing with drop shadow & corner rivets
│       │   └── word-battle-board-pattern.svg # Tactile dot-matrix background pattern for play area
│       ├── tiles/
│       │   ├── word-battle-tile-default.svg  # Tactile beveled tile base with specular highlight
│       │   ├── word-battle-tile-selected.svg # Active purple selection glow & high-contrast border
│       │   ├── word-battle-tile-valid.svg    # Emerald green valid-word path highlight
│       │   └── word-battle-tile-invalid.svg  # Red shake/rejection feedback border
│       ├── icons/
│       │   ├── word-battle-life-active.svg   # Vibrant glowing heart indicator
│       │   ├── word-battle-life-lost.svg     # Depleted/broken dark-navy heart indicator
│       │   ├── word-battle-sword.svg         # Crossed duel swords (replaces raw emoji)
│       │   ├── word-battle-crown.svg         # Victory gold crown (replaces raw emoji)
│       │   └── word-battle-turn-jewel.svg    # Glowing status/turn jewel
│       └── effects/
│           ├── word-battle-sparkle.svg       # 4-point gold starburst celebration particle
│           └── word-battle-combo-burst.svg   # Radiant combo ripple indicator
└── shared/
    ├── avatars/
    │   ├── avatar-chidi.svg                  # Player avatar - Chidi
    │   ├── avatar-tunde.svg                  # Player avatar - Tunde
    │   ├── avatar-amina.svg                  # Player avatar - Amina
    │   └── avatar-efe.svg                    # Player avatar - Efe
    └── icons/
        ├── icon-home.svg                     # Primary navigation: Home
        ├── icon-gamepad.svg                  # Primary navigation: Games
        ├── icon-users.svg                    # Primary navigation: Friends/Social
        ├── icon-profile.svg                  # Primary navigation: Profile
        ├── icon-whatsapp.svg                 # Social share & WhatsApp invite icon
        └── icon-trophy.svg                   # Leaderboard & rank trophy
```

## Formats and Technical Specifications

- **Format**: Scalable Vector Graphics (SVG) optimized for sharp rendering on all screen pixel densities (Retina, high-DPI mobile devices).
- **Styling & Theming**:
  - Primary Game Color Scheme: Deep Navy (`#0A0E1A`), Midnight (`#101524`), Electric Violet (`#6C38FF`), Neon Cyan (`#1B76FF`), Victory Emerald (`#10B981`), Warning/Error Red (`#EF4444`), Gold (`#F59E0B`).
  - Icons use `currentColor` strokes or vector paths where contextual coloring applies.
  - Tiles and board assets are modular vector templates designed to underlay dynamic text and interaction states in React/CSS.

## Asset Status: Finished vs. Placeholder

| Asset | Status | Notes |
|---|---|---|
| `word-battle-bg-midnight.svg` | **Production Artwork** | Scalable SVG ambient backdrop with restrained stars & deep navy gradient. |
| `word-battle-bg-arena.svg` | **Production Artwork** | Scalable arena alternate for duel/high-stakes matches. |
| `word-battle-board-frame.svg` | **Production Artwork** | Fully beveled casing with subtle highlights and corner rivets. |
| `word-battle-board-pattern.svg` | **Production Artwork** | Seamless dot grid pattern. |
| `word-battle-tile-*.svg` | **Production Artwork** | Beveled, tactile tile backgrounds with state-specific glows. |
| `word-battle-life-*.svg` | **Production Artwork** | Custom vector game hearts replacing generic symbols. |
| `word-battle-sword.svg`, `word-battle-crown.svg` | **Production Artwork** | High-definition duel & victory emblems replacing raw unicode emoji. |
| `shared/avatars/*.svg` | **Default Starter Avatars** | Distinct illustrated avatars for onboarding and placeholder representation. Real player accounts use user profile pictures when provided. |
| `shared/icons/*.svg` | **Production Artwork** | Unified 24x24 navigation and studio utility icons. |

## Consumption Guidelines

In Next.js frontend code:
- Reference static assets using root-relative path `/assets/...`
- Example: `<img src="/assets/games/word-battle/icons/word-battle-sword.svg" alt="Duel" />`
- Or use CSS background: `style={{ backgroundImage: "url('/assets/games/word-battle/backgrounds/word-battle-bg-midnight.svg')" }}`
- Letter tile content (characters, scores) should be rendered dynamically as HTML/SVG text over tile artwork, maintaining internationalization, accessibility, and dynamic state reactivity.
