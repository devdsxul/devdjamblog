# Fix pro platter oval aspect ratio deformation

## Goal

Ensure the vinyl platter, label, and XY pad in the pro dual-deck workstation console remain perfect 1:1 squares and circles, preventing flexbox horizontal compression from squishing the turntable into an ellipse.

## Requirements

1. Eliminate `max-width: 48%` and `max-width: 46%` which caused horizontal squishing against fixed heights.
2. Enforce `width: 140px; height: 140px; aspect-ratio: 1 / 1; flex-shrink: 0;` on `.pro-platter-wrap` and `.pro-platter`.
3. Set `minmax(310px, 1fr)` on `.pro-console` grid columns so decks have ample room and never compress their contents.
4. Set `.pro-pad` to `width: 110px; height: 110px; aspect-ratio: 1 / 1; flex-shrink: 0;`.

## Acceptance Criteria

- [x] Platter is a 100% circle and never an ellipse.
- [x] Turntable center label is a perfect circle.
- [x] Tonearm rests naturally on the circle perimeter.
- [x] `npm run check` passes with 0 errors.
