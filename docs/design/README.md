# Design direction

Recess Studio's visual identity is built on the principle **"quiet platform, loud game."** The platform chrome stays calm and minimal so the game surface can own the energy, color, and motion during play.

This document defines the visual and interaction principles. For asset standards, see [assets.md](./assets.md). For quality verification, see [docs/engineering/quality-standards.md](../engineering/quality-standards.md).

---

## North-star reactions

A Recess screen should make a player feel:

1. *That looks beautiful.*
2. *I immediately understand this.*
3. *I want to touch that.*
4. *This feels like a real game.*
5. *Send me another one.*

---

## Quiet platform, loud game

| Platform chrome (quiet) | Game surface (loud) |
|--------------------------|---------------------|
| Muted background, restrained color | Game-specified palette, high contrast |
| Minimal motion | Purposeful animation for game events |
| One primary action per screen | Rich interaction within the play area |
| Consistent across the app | Each game owns its visual identity |
| Readable, accessible typography | Expressive, game-specific typography |

The platform should never compete with the game for attention.

---

## Visual hierarchy

- **One focal point per screen.** If everything shouts, nothing is heard.
- Use scale, contrast, and color to direct the eye to the primary action.
- Secondary actions are visually de-emphasized but still reachable.
- Negative space is a feature, not wasted space.

## Typography

- Body text must be readable at mobile sizes (≥ 14px).
- Game titles and scores may use expressive typefaces, but never at the cost of legibility.
- Maintain clear hierarchy: title > heading > body > caption.
- Do not use more than two typefaces per surface unless the game design justifies it.

## Color

Approved tokens in active use (defined in `apps/web/tailwind.config.ts` and asset SVGs):

| Token | Value | Usage |
|-------|-------|-------|
| Purple (primary) | `#6C38FF` | Primary actions, brand, selection glow |
| Blue (accent) | `#1B76FF` | Secondary accent, links |
| Navy (dark surface) | `#0D111C` | Game surfaces, dark mode backgrounds |
| Cream (light surface) | `#FAF9F5` | Platform backgrounds |
| Green (success) | `#10B981` | Valid moves, online presence, wins |
| Gold (victory) | `#F59E0B` | Winners, streaks, rewards |
| Red (error) | `#EF4444` | Invalid moves, errors, lost lives |
| Text primary | `#111827` | Primary text on light surfaces |
| Text light | `#F9FAFB` | Primary text on dark surfaces |

These tokens are **established** because they are used in the codebase. Do not introduce new tokens without design approval. Color is never the sole means of conveying information — pair it with icons or labels.

## Spacing and layout

- Use a consistent spacing scale (the project uses Tailwind's default scale with custom radii: `recess-card` 1.25rem, `recess-control` 0.875rem).
- Mobile-first: design at 375px width, then enhance for larger screens.
- Content width should be constrained (e.g., `max-w-lg`) for readability on desktop.
- Touch targets must be at least 44×44 px.

## Depth and surfaces

- Use subtle shadows for elevation (see `boxShadow.card`, `boxShadow.card-hover` in tailwind config).
- Game surfaces may use stronger glows (`glow-purple`, `glow-gold`, `glow-green`) for feedback.
- Avoid heavy glassmorphism, excessive blur, or layered gradients that obscure content.

## Motion

- Motion must reinforce meaning: turn change, valid move, game over.
- Durations: 150–300 ms, ease out.
- Respect `prefers-reduced-motion`: disable non-essential animation.
- Avoid infinite loops, screen-wide parallax, or motion that could trigger vestibular discomfort.

---

## Responsive and mobile-first behavior

- Core screens must work at 375px width without horizontal scroll.
- Fixed/sticky elements must not obscure the primary action.
- On larger screens, content should be centered and constrained, not stretched.
- The game surface should fill the viewport on mobile while keeping controls reachable.

---

## Accessibility

- All interactive elements have accessible names.
- Color is never the sole information channel.
- Focus states are visible and logical.
- `prefers-reduced-motion` is respected.
- Text contrast meets WCAG AA (4.5:1 for body text).

---

## Shared components vs. game identity

- `packages/ui` provides shared primitives (buttons, avatars, cards, turn indicators) that maintain platform consistency.
- Games may override styling within their play surface to establish their own identity, but platform navigation and shared UI must remain consistent.
- Do not make every game look identical; do not let every game break the platform's visual language either.

---

## Visual anti-patterns

Avoid:

- Generic SaaS dashboard patterns (endless stat cards, KPI grids) during gameplay.
- Casino or crypto aesthetics (neon overload, fake scarcity, spinning counters).
- Esports-dashboard clones or childish cartoon styling unless the game specifically calls for it.
- Discord or WhatsApp cloning — Recess has its own identity.
- Excessive pills, badges, and motion that add noise without meaning.
- Glassmorphism used everywhere as a crutch.

---

## Measurable quality criteria

A screen passes visual review when:

1. The primary action is obvious within 1 second.
2. No text is clipped or unreadable.
3. No horizontal scroll at 375px.
4. Touch targets are ≥ 44×44 px.
5. Color is not the sole signal for any status.
6. Animation respects `prefers-reduced-motion`.
7. The layout is stable across loading, empty, and error states.

---

## Current state

The design system is partially implemented. `packages/ui` holds shared primitives; `apps/web` implements the platform shell and the Word Battle arena. Exact design-token values are defined in `apps/web/tailwind.config.ts` and referenced from assets. No formal Figma or design-token pipeline exists yet — tokens are source-of-truth in code.
