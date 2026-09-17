# Entrance gate redesign with banner gothic typography and selective click

## Goal

Refactor the entrance splash overlay to adopt the site banner's 3D Gothic Blackletter typography, restrict entrance strictly to clicking the "entering" button, and replace the background with an authentic retro cyber-goth grid atmosphere.

## Requirements

1. **Banner Gothic Typography**:
   - Apply the site's signature Blackletter font (`var(--gothic)`) with layered 3D chrome/obsidian metallic styling matching `.banner-letters`.
   - Incorporate specular 3D text relief and cyber-goth specular accents.
   - Text layout: "YOU ARE NOW" / "ENTERING" / "DEVDJAM'S WORLD".

2. **Selective Entrance Click Restriction**:
   - Only clicking the "entering" word/trigger enters the site.
   - Clicking background, lead text ("YOU ARE NOW"), or trail text ("DEVDJAM'S WORLD") does NOT trigger entrance.
   - The "entering" trigger must have distinctive tactile hover/active states (hot pink / chrome glow, pointer cursor, micro-bounce).

3. **New Background**:
   - Replace the plain white background with an immersive retro cyber-goth dark grid pattern with CRT/mesh texture and ambient spotlight.
   - Ensure high contrast and retro aesthetic fidelity.

## Acceptance Criteria

- [x] Entrance screen renders using banner 3D Blackletter Gothic typography.
- [x] Clicking outside "entering" does not trigger site entrance.
- [x] Clicking "entering" triggers smooth fade-out exit and sets `sessionStorage('dj-entered')`.
- [x] New cyber-goth background displays with retro grid and atmospheric lighting.
- [x] `npm run check` passes cleanly without errors or warnings.
