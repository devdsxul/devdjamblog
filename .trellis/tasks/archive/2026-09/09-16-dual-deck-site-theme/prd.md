# Restyle dual-deck console to match site retro Win98 theme

## Goal

Restyle maximized dual-deck console to strictly use DEVDJAM white-background black-line Win98 cyber-goth aesthetic while preserving the reference layout.

## Requirements

1. **Strict Site Theme Palette & Typography**:
   - The maximized player window must use `--win` (pure white) background with `--line` (pure black 1px border) and `--hard` (`8px 8px 0 var(--line)`) drop shadow.
   - All text, labels, and borders must follow DEVDJAM's jfashion / cyber-goth Win98 design system (`var(--ink)`, `var(--line)`, `var(--muted)`).
   - Accents must use `--accent` (hot pink `#ff3d8a`) and `--accent-2` (yellow `#ffd400`).
   - Remove all third-party dark midnight blue palettes (`#141727`, `#171a2d`).

2. **Preserve Exact Reference Layout (Horizontal Dual-Deck)**:
   - Left: Deck A (XY Pad left, Turntable right; bottom: pro, FX, loop, play)
   - Center: Mixer (BPM LCD display, Channel A knobs | dual vertical volume faders | Channel B knobs, horizontal Crossfader)
   - Right: Deck B (Turntable left, XY Pad right; bottom: play, loop, FX, pro)
   - Bottom: Tape Library table with `[LOAD A]` and `[LOAD B]`

3. **Compact Mode Unaltered**:
   - Sidebar compact player continues to show only single turntable platter.

## Acceptance Criteria

- [x] Maximized window uses `var(--win)` white background and `var(--line)` borders.
- [x] Turntables, tonearms, knobs, faders, and buttons follow DEVDJAM's exact visual guidelines.
- [x] Dark blue palette completely purged.
- [x] Syntax check passes (`npm run check`).
