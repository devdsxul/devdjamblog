# Apply Neocities astro texture to home blank areas

## Goal

Apply the Neocities Astro celestial stardust and star-chart texture to the empty/blank areas on the home page, specifically the bottom section including the music pane and unoccupied area below the beats list.

## Requirements

1. **Music Pane Empty State & Query**:
   - Update `.home-pane-music` in `views/home.php` to query recent `dj_music` posts.
   - When no music posts exist, display a subtle, authentic Neocities retro placeholder (`.home-music-blank`) featuring an animated holographic CD (`cd.gif`), an `ASTRO LOUNGE` pixel tag, and `TAPES // COMING SOON`.
2. **Neocities Astro Background on Home Blank Space**:
   - In `assets/site.css`, apply `background-image: url("img/astro-bg.svg")` on `.home-bottom-pane`.
   - Ensure `.home-split` and `.home-pane` have transparent backgrounds so the astro stardust & grid texture flows across the empty spaces.
   - Set `.home-beat-item` to `background: var(--win)` so beat rows remain high-contrast and legible, with the astro texture filling the blank space below them.
3. **Featured Post Card Integrity**:
   - Keep `.home-hero` clean with `background: var(--win)` as a solid Win98 card.

## Acceptance Criteria

- [x] `.home-bottom-pane` displays the Neocities astro stardust texture in empty spaces.
- [x] `.home-pane-music` displays the astro texture and retro holographic CD lounge placeholder when empty.
- [x] Beats rows in `.home-pane-beats` remain legible on solid cards with astro texture showing beneath.
- [x] `npm run check` passes cleanly.
