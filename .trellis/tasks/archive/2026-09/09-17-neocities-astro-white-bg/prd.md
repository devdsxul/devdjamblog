# Neocities astro textured white desktop background

## Goal

Revert site background to a white base imbued with subtle Neocities astro celestial pixel stardust and star-chart grid texture without being exaggerated.

## Requirements

1. **Revert to White Base**:
   - Revert `html` background color to `var(--bg)` (`#ffffff`).
2. **Neocities Astro Celestial Texture**:
   - Introduce a subtle tiled vector texture (`assets/img/astro-bg.svg`, 200x200 seamless tile).
   - Texture features:
     - Faint celestial coordinate dotted star-chart lines (`stroke-opacity: 0.03`).
     - Tiny 1px and 2px pixel stardust (neutral slate, pastel pink, cyan, gold, lavender with gentle 0.25-0.45 opacities).
     - Micro 4-pointed pixel sparkles with crisp white center pixels.
     - Tasteful micro accents (crescent moon, ringed planet, dotted constellation link).
3. **Banner and Window Integrity**:
   - Header banner remains transparent, seamlessly sitting on top of the astro white desktop.
   - Desktop windows, dock, and controls retain authentic Win98 solid white/black card borders and drop shadows.
   - Ink theme (dark mode) overrides background to solid `#111111`.

## Acceptance Criteria

- [x] `astro-bg.svg` created in `assets/img/` with seamless 200x200 celestial stardust and coordinate grid pattern.
- [x] `html` background set to `var(--bg)` with repeating `astro-bg.svg`.
- [x] Desktop background is bright and white, with subtle, non-distracting Neocities astro texture.
- [x] Local dev server serves `astro-bg.svg` with HTTP 200 OK.
- [x] `npm run check` passes cleanly.
