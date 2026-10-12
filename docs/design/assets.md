# Asset and media standards

This document governs the creation, naming, storage, and use of assets (artwork, icons, audio, animation) in Recess Studio.

The existing asset inventory lives in [apps/web/public/assets/README.md](../../apps/web/public/assets/README.md). This document defines the standards that inventory must follow.

---

## Directory ownership

```text
apps/web/public/assets/
├── games/<game-slug>/      # Game-specific artwork (owned by the game)
│   ├── backgrounds/
│   ├── boards/
│   ├── tiles/
│   ├── icons/
│   └── effects/
└── shared/                 # Platform-wide assets (owned by the platform)
    ├── avatars/
    └── icons/
```

- **Game-specific assets** live under `games/<game-slug>/`. They may only be referenced by that game's UI.
- **Shared assets** live under `shared/`. They are reusable across games and platform chrome.
- Do not place game-specific artwork in `shared/`, and do not reference another game's assets.

---

## Naming conventions

- Lowercase, kebab-case: `word-battle-tile-selected.svg`, `icon-home.svg`.
- Prefix game assets with the game slug: `word-battle-*`.
- Shared platform icons use `icon-*` prefix.
- Avatars use `avatar-<name>.svg`.
- Descriptive state suffixes for variants: `-active`, `-selected`, `-valid`, `-invalid`, `-disabled`, `-hover`.
- No spaces, no camelCase, no version numbers in filenames unless explicitly versioned (e.g., `v2`).

---

## Approved formats

| Type | Format | Notes |
|------|--------|-------|
| Icons, illustrations, tiles, boards | SVG | Preferred for scalability and theming |
| Photographic or complex raster art | WebP, then PNG | Use WebP with PNG fallback |
| Background images | WebP, compressed | Avoid large unoptimized backgrounds |
| Audio (when implemented) | MP3 / AAC | Provide compressed, mobile-friendly bitrates |
| Animation | SVG `<animate>` / CSS / Lottie | Prefer CSS/SVG over heavy video |

SVG is the default for game artwork because it scales cleanly on high-DPI mobile screens and can be themed with `currentColor`.

---

## Optimization expectations

- SVGs must be minified (no editor metadata, no unused groups).
- Raster images must be compressed (WebP quality ≤ 80, PNG optimized).
- No asset larger than necessary. Target: icons < 5 KB, tiles < 10 KB, backgrounds < 200 KB.
- Use `loading="lazy"` for below-the-fold images.
- Do not commit raw, unoptimized exports from design tools.

---

## How assets are referenced

- Use root-relative paths from the web app public directory: `/assets/games/word-battle/icons/word-battle-sword.svg`.
- For CSS backgrounds, use `url('/assets/...')`.
- Dynamic content (letter characters, scores) should be rendered as HTML/SVG text over tile artwork, not baked into the image — this preserves i18n, accessibility, and dynamic state.

---

## Production vs. placeholder assets

Every asset must be classified:

| Status | Meaning |
|--------|---------|
| Production artwork | Final, optimized, approved for live use |
| Placeholder | Temporary stand-in; must be replaced before launch |
| Default starter avatar | Pre-defined avatar set for onboarding; real player avatars override these |

The asset inventory README must list the status of each asset. Do not ship placeholder artwork to production without marking it.

---

## Generated concept art

Generative concept art is a starting point, not a finished asset. To make it usable:

1. Break concept art into individual components (tiles, icons, backgrounds, effects).
2. Recreate or trace each component as clean SVG.
3. Optimize and name per the conventions above.
4. Integrate each asset into the UI and verify it renders.

A folder full of concept-art PNGs does not count as a delivered asset set.

---

## Accessibility

- Decorative images use `alt=""` or `aria-hidden="true"`.
- Meaningful images (avatars, game pieces) have descriptive `alt` text.
- Color is never the sole signal; pair status colors with icons or text.
- Animated assets must not flash more than three times per second.

---

## Licensing and provenance

- Track the source of every asset: original artwork, generated, licensed, or placeholder.
- Do not commit assets with unclear or incompatible licenses.
- Generated assets must be reviewed for intellectual-property concerns before production use.

---

## Loading, caching, and mobile performance

- Cache static assets with long `max-age` and content-hash filenames where the framework supports it.
- Serve appropriately sized images for the viewport (use `srcset` for raster art).
- Defer offscreen assets.
- Verify asset load times on a mobile connection (throttle to 3G in devtools) — critical game assets should load within 2 seconds.

---

## Asset verification and replacement

Before declaring an asset task complete:

1. Confirm the asset file exists at the declared path.
2. Confirm it is referenced and actually renders in the UI.
3. Confirm it loads without 404s in the browser network tab.
4. Confirm it follows naming and format conventions.
5. Confirm its status (production / placeholder) is recorded in the inventory README.

To replace a placeholder: add the new asset, update all references, remove the old asset, and update the inventory. Do not leave orphaned assets.
