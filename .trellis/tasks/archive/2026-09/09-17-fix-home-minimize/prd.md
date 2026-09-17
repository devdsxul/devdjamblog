# Fix home window minimize collapse and animation

## Goal

Fix window minimization so `.win-content` (home area) properly collapses to title bar height with smooth animation instead of staying a full-height blank white box.

## Requirements

1. **Window Collapse CSS Fix**:
   - In `assets/site.css`, define `.window.is-min` and `.win-content.is-min` with `height: auto !important`, `max-height: none !important`, `min-height: 0 !important`, `flex: 0 0 auto !important`, and `.window.is-min > .window-body { display: none !important; }`.
   - Prevent `.win-content`'s `height: 100%` from keeping the window stretched as a full-height empty box when minimized.
2. **Minimize & Restore Animations**:
   - Add `@keyframes winMinCollapse` and `@keyframes winMinRestore` for smooth visual feedback when collapsing and expanding.
   - Update `site.js` to handle `is-restoring` during transition back to `open` state.
3. **Double-Click Title Bar Interaction**:
   - Add double-click on window `.title-bar` to toggle window shade (minimize/restore).

## Acceptance Criteria

- [x] `.win-content.is-min` collapses to title bar height.
- [x] Desktop background shows below the minimized home title bar.
- [x] Minimize and restore trigger smooth animations without jumping.
- [x] Double-clicking the title bar toggles minimize and restore.
- [x] `npm run check` passes cleanly.
