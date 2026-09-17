# Entrance splash Neocities style overhaul

## Goal

Overhaul the entrance gate to fully embody the authentic Neocities / Geocities 1999 web revival cyber-goth aesthetic, remove modern UI guide text boxes, and replace the background with a classic tiled retro starry sky with scanlines.

## Requirements

1. **Remove Boxed UI Guides**:
   - Completely remove the pink `▶ ENTER ◀` badge below "entering".
   - Completely remove the bottom `[ CLICK "ENTERING" TO ENTER ]` instruction text.
   - Keep "entering" as the sole interactive click trigger to enter the site.

2. **Authentic Neocities Background**:
   - Replace the modern flat dark gradient with an authentic tiled retro starfield (multi-colored pixel stars: white, cyan, pink, gold) and subtle CRT raster scanlines.
   - Pure late-90s web underground ambiance.

3. **Neocities Visual Accents**:
   - Add classic animated GIF decor: `glitter-line.gif` sparkling divider line below the typography, and twinkling pixel star GIFs (`star-tiny.gif`, `star-purple-big.gif`).
   - Classic Win98 beveled progress bar.
   - 3D Blackletter Gothic typography with metallic chrome gradients and specular highlights.

## Acceptance Criteria

- [x] Pink badge `▶ ENTER ◀` is removed.
- [x] Hint text `[ CLICK "ENTERING" TO ENTER ]` is removed.
- [x] Tiled retro starfield wallpaper with CRT scanlines renders across `.enter`.
- [x] Sparkling animated `glitter-line.gif` divider renders below title.
- [x] Clicking "entering" triggers smooth exit and sets session state.
- [x] Clicking outside "entering" does not trigger exit.
- [x] `npm run check` passes cleanly without errors or warnings.
