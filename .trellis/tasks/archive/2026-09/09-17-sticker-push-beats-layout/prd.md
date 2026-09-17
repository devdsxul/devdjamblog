# Sticker collision push-away and beats row dividers

## Goal

Prevent sticker overlap by pushing neighbors away on collision, and align beat avatar to left with top and bottom divider borders.

## Requirements

1. **Sticker Collision Repulsion**:
   - Multiple stickers must not occupy the same space or overlap each other.
   - When dragging a sticker or releasing it, detect AABB bounding box collision with all other stickers.
   - When collision occurs, calculate the displacement vector and push the colliding sticker away smoothly so it slides out of the way.
   - Confine displaced stickers within viewport bounds.
   - Persist any displaced sticker positions in `sessionStorage` (`dj-sticker-pos`).

2. **Beats Row Layout & Dividers**:
   - In `.home-pane-beats` (and beats list), ensure `.home-beat-item` displays avatar thumbnail on the left (`order: 1` or standard flex order).
   - Ensure clear top and bottom divider lines on beat rows (`border-top: 1px solid var(--line); border-bottom: 1px solid var(--line);` with seamless row stacking).
   - Maintain cyber-goth Win98 aesthetic (`--win`, `--line`, `--accent`).

## Acceptance Criteria

- [x] Dragging any sticker into another sticker pushes the other sticker away without glitching.
- [x] Multiple chain collisions or displacements resolve cleanly without stacking.
- [x] Double-click reset or refresh maintains valid non-overlapping coordinates in `sessionStorage`.
- [x] Beats list items have their artwork/avatar on the left, track meta in middle, play button on right.
- [x] Beats list rows have distinct top and bottom border divider lines.
- [x] `npm run check` passes cleanly without errors or warnings.
