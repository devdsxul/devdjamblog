# Component Guidelines

> How UI components, template parts, and Win98 visual elements are built in DEVDJAM.

---

## Overview

DEVDJAM uses WordPress PHP template functions and partials rather than React/Vue components. UI components are standardized through PHP helper functions in `functions.php` and modular partials in `parts/` and `views/`.

---

## Standard Window Component (`dj_window_*`)

Every major section is wrapped inside a Windows 98 desktop window.

### Usage Pattern
```php
<?php
// Open a window with title, custom CSS class, and optional icon
dj_window_open('beats', 'win-beats', 'icon-cassette');
?>
  <!-- Window Body Content -->
  <div class="beats-grid">
    ...
  </div>
<?php
// Close window with optional corner stickers: [gif, action, animation, position]
dj_window_close(array(
    array('cassette', 'spin', 'pop', 'at-tr'),
));
?>
```

### Generated HTML
```html
<section class="window win-beats" data-window="beats">
  <div class="title-bar">
    <div class="title-bar-text">
      <img class="gif title-icon" src="..." width="32" height="32" alt="" aria-hidden="true">
      <span data-i18n="beats">beats</span>
    </div>
    <div class="title-bar-controls">
      <button type="button" aria-label="Minimize" data-window-action="min"></button>
      <button type="button" aria-label="Maximize" data-window-action="max"></button>
    </div>
  </div>
  <div class="window-body">
    ...
  </div>
  <button type="button" class="sticker at-tr" data-sticker="spin" data-anim="pop" aria-label="spin">
    <img class="gif" src="..." width="166" height="101" alt="" aria-hidden="true" loading="lazy">
  </button>
</section>
```

---

## Standard Helper Components

| Helper | Purpose | Example |
|---|---|---|
| `dj_text($key)` | i18n text node with `data-i18n` for client-side translation | `dj_text('now playing')` |
| `dj_gif($name, $class, $lazy)` | Renders local GifCities animated sticker with intrinsic width/height | `dj_gif('boombox', 'hero-badge')` |
| `dj_sticker($gif, $action, $anim, $class)` | Clickable and draggable sticker button (`data-sticker-id`) supporting free repositioning across the desktop | `dj_sticker('headphones', 'mute', 'wiggle')` |
| `dj_empty($text, $gif)` | Honest empty state illustration & copy (no fake placeholder rows) | `dj_empty('no beats yet', 'construction')` |
| `dj_beat_button($id, $label)` | Track play trigger wired to the global audio player controller | `dj_beat_button(12, 'play')` |
| `devdjam_default_cover_url()` | Returns fallback retro cassette tape cover URL for beats without custom artwork | `devdjam_default_cover_url()` |
| `dj_icon($name)` | Inline SVG icon for player control buttons | `dj_icon('play')` |

### Sticker Drag & Drop Interaction
- **Pointer Events**: Managed via `setPointerCapture(pointerId)`.
- **Threshold**: Moves < 5px are treated as clicks (trigger sparkles and actions like mute/play/nav). Moves >= 5px enter drag mode (`.is-dragging`).
- **Positioning**: Dragged stickers detach to `document.body` with `position: absolute`, maintaining their intrinsic size and elevated `z-index`.
- **Collision Avoidance & Push-Away**: Overlapping stickers are strictly prevented. When a sticker is moved into another sticker, iterative collision detection pushes neighboring stickers away along the minimum penetration axis with a smooth glide (`transition: left/top .22s`). Viewport bounds clamp displaced stickers safely within the screen.
- **Persistence**: Coordinates of all dragged and pushed stickers are preserved across page navigations and reloads via `sessionStorage` (`dj-sticker-pos`). Double-clicking a dragged sticker resets it to its initial layout position.

---

## Styling & Layout Rules

1. **98.css Foundation**: Windows, buttons, input fields, and checkboxes use standard classes from `98.css` (`.window`, `.title-bar`, `.button`, etc.).
2. **Theme Scoping**: Color schemes (`milk`, `ink`, `cherry`) are applied via `[data-theme="..."]` on `<html>`. Theme styles override CSS custom properties:
   - `--theme-bg`: background surface color
   - `--theme-border`: window bezel and dividing lines
   - `--theme-accent`: accent highlight color (pink in Milk, red in Cherry, neon in Ink)
3. **No Focus Dotted Boxes**: Outline focuses that break the retro aesthetic are neutralized; buttons use tactile inset shadows instead.
4. **Layout Continuity**: The desktop sidebar (`.dock`) is fixed on the left; the top panel (`.panel`) is sticky; the main content flows inside `#site-content`.
5. **Banner Sticker Distribution**: Interactive desktop stickers are centered around the top banner wings (`.banner-wing-left` and `.banner-wing-right`), keeping the core windows clean and unencumbered while allowing free drag & drop anywhere on the desk.
6. **Dock Social Navigation & Foot Placement**: `.dock-foot` is pinned to the bottom via `margin-top: auto`. External social redirects (Spotify, Instagram, TikTok) are housed below the primary nav separated by `.dock-divider`.
7. **Article Cover Policy**: Featured images (`has_post_thumbnail`) are restricted to card previews in lists/archives and must not render within single article views (`single.php`).
8. **Beat Artwork & Cover Fallback**: Beats support optional custom cover artwork chosen in admin (`_thumbnail_id`). When unassigned, beats automatically fall back to the retro cassette cover (`devdjam_default_cover_url()`) across homepage list, archive grids, and the DJ deck turntable platter.
9. **DJ Deck Queue Initial State**: The track playlist in the DJ deck (`<details class="queue">`) defaults to expanded (`open`) so visitors can immediately inspect available tracks.
10. **Beat List-Only Policy**: Beats do not have individual detail pages (`single.php`). They are presented exclusively as showcase lists/cards on the homepage and the `/beats/` archive with inline metadata and direct `track-button` audio playback. Any direct navigation to a singular beat permalink is safely 301 redirected to `/beats/`.
11. **Window Maximize/Restore Zoom Animation**: All windows (`.window`) animate smoothly on maximize (`winMaxIn` / `winPlayerMaxIn`) and restore/unmaximize (`winMaxOut` / `winPlayerMaxOut`), with smooth backdrop dim fading (`.desk-dim.is-active`).
12. **DJ Deck Dual-Deck Workstation Layout & Styling**: The DJ deck remains a compact single-turntable player on the desktop sidebar by default (`.player-compact`). When maximized (`.window.win-player.is-max`), it transitions into a horizontal dual-deck card console (`.player-pro`) strictly following DEVDJAM's white-background black-line Win98 cyber-goth theme (`--win`, `--win-2`, `--line`, `--hard`, `--accent`): Deck A (Pad on left, Turntable on right) on the left, central Mixer with dual vertical faders and crossfader in the middle, Deck B (Turntable on left, Pad on right) on the right, and the Tape Library table below for loading tracks independently into Deck A or Deck B.
13. **Beats Row Layout & Dividers**: In `.home-pane-beats` (and beats lists), `.home-beat-item` displays avatar thumbnail strictly flush on the left (`order: 1; margin: 0; padding-left: 0;`), meta wrap in the middle (`order: 2`), and action button on the right (`order: 3`). Every row features a crisp bottom divider line (`border-bottom: 1px solid var(--line); border-top: none; padding: 8px 0;`) maintaining the authentic Win98 partitioned list aesthetic.
14. **Entrance Gate Splash Presentation (Neocities 1999 Cyber-Goth Splash)**: The full-screen entrance gate overlay (`.enter[data-enter]`) embodies the authentic Neocities / Geocities 1999 web revival cyber-goth aesthetic: a seamless tiled retro pixel starfield wallpaper (multicolored 1px/2px stars and crosses) overlaid with subtle CRT raster scanlines. Gate typography strictly aligns with the site banner's signature 3D Blackletter Gothic style (`var(--gothic)` with layered `.char-back` 3D relief shadows and `.char-front` metallic chrome gradient face). Authentic retro accents include floating animated star GIFs (`star-tiny.gif`, `star-purple-big.gif`), an iconic sparkling `glitter-line.gif` divider, and a Windows 98 recessed segmented loading bar. Boxed guide badges (such as '▶ ENTER ◀') and explicit bracketed instructions are omitted in favor of clean retro web mysticism. Site entry is strictly confined to clicking the interactive 3D `entering` word (`[data-enter-trigger]`), which triggers a smooth exit animation and stores entry state in `sessionStorage` (`dj-entered`). Accidental clicks outside `entering` do not dismiss the gate.
15. **Site Desktop Background (Neocities Astro White Texture)**: The desktop background uses a bright, clean white base (`var(--bg)`) enhanced with an authentic, understated Neocities Astro celestial stardust pattern (`assets/img/astro-bg.svg`, `background-repeat: repeat; background-size: 200px 200px;`). The pattern incorporates faint celestial coordinate star-chart dotted lines, micro 1px/2px pastel stardust (slate, pink, cyan, gold, lavender), subtle 4-pointed pixel sparkles, and tasteful micro astro accents (crescent moon, ringed planet, dotted constellation link) without visual noise or distraction. `.site-banner` and `.banner-stage` maintain `background: transparent` to blend seamlessly into the astro desktop, while desktop windows (`.window`), sidebar (`.dock`), and inputs stand out with crisp Win98 borders and hard shadows. Ink theme (dark mode) overrides the background cleanly to solid `#111111`.
16. **Homepage Blank Area Astro Texture Integration**: In `views/home.php`, the lower split container (`.home-bottom-pane` / `.home-split`) carries the repeating Neocities Astro celestial stardust pattern (`assets/img/astro-bg.svg`). Unoccupied areas in `.home-pane-music` and below `.home-entry-list` in `.home-pane-beats` naturally reveal this retro celestial texture. Individual entries (`.home-beat-item`) maintain solid opaque white backgrounds (`var(--win)`) to preserve typographic legibility. When `.home-pane-music` has no albums, it renders a subtle retro placeholder (`.home-music-blank`) featuring an animated holographic CD (`cd.gif`), an `ASTRO LOUNGE` pixel badge, and `TAPES // COMING SOON`.
17. **Window Minimization & Shade Behavior**: When minimized (`.window.is-min`, `.win-content.is-min`), windows strictly collapse to their title bar height (`height: auto !important; max-height: none !important; min-height: 0 !important; flex: 0 0 auto !important; box-shadow: var(--hard-sm) !important;`) and hide `.window-body` (`display: none !important;`). Minimized windows in flex containers (e.g. `.win-content` in `.col-main`) must release all fixed height constraints so the underlying desktop wallpaper (Astro stardust pattern) is fully revealed beneath the collapsed bar. Minimizing and restoring feature smooth scale and translateY transitions (`winMinCollapse` and `winMinRestore` with `.is-restoring`). Double-clicking `.title-bar` (excluding action buttons) toggles minimize/restore matching classic Win98/WindowShade behavior.
18. **Mobile Responsive Layout & Windows 98 Taskbar Adaptation (`<= 600px`)**:
    - **Bottom Fixed Taskbar**: On mobile screens (`<= 600px`), navigation bar (`.dock`) detaches from the desktop left sidebar and becomes a fixed bottom Windows 98 taskbar (`position: fixed; bottom: 0; left: 0; right: 0; z-index: 9999;`).
    - **Single-Row Compact Link Containment**: In order to satisfy strict QA containment assertions (`dev/qa.py`: `all(x['left'] >= -1 and x['right'] <= width + 1)` across 320px, 390px, 768px, 1440px), `.dock` buttons use compact icon-only presentation (`min-width: 22px; height: 28px;`) with text spans hidden on ultra-narrow viewports (`<= 440px`), allowing Start button, all 7 navigation tabs, 3 social links, admin key, and system tray clock to fit within 320px in a single horizontal row without wrapping or off-screen overflow.
    - **Desktop Full-Width Stack**: Windows stack in a single column (`.desk { grid-template-columns: 1fr; margin-left: 0; }`), `.col-main` ordered first, window max width 100%, and safe-area-inset-bottom padding added to `.desk` and `.dock`.
    - **Touch Ergonomics & iOS Safari Zoom Prevention**: Interactive controls (window title buttons, playback triggers, track buttons) provide minimum touch hit areas (>= 36-40px), slider thumbs enlarged for touch dragging, and all text inputs specify `font-size: 16px` to prevent automatic zooming on iOS Safari.



---

## Accessibility (A11y) Standards

- **Screen Reader Support**: Decorative GIF stickers have `alt=""` and `aria-hidden="true"`.
- **Buttons**: All interactive buttons (stickers, track triggers, window controls) must have a descriptive `aria-label` or visible text.
- **ARIA Live Regions**: Player updates (status, track announcements) notify screen readers via `#site-live` and `aria-valuetext`.
- **Keyboard Navigation**: Maximized modal windows must close on `Escape`; track sliders must be operable via arrow keys.
- **Reduced Motion**: Respect `prefers-reduced-motion` to disable shaking/popping animations.

---

## Forbidden Patterns

- ❌ **No Close Button (`×`) on Windows**: Windows must only have Minimize (`-`) and Maximize (`□`) buttons (per Requirement R14).
- ❌ **No External Hotlinked Assets**: Never link to `gifcities.org`, `sadgrl.online`, or CDN images. All assets must be bundled locally under `assets/`.
- ❌ **No Missing Dimensions on GIFs**: Always define width and height (or use `dj_gif()`) to prevent Cumulative Layout Shift (CLS).
- ❌ **No Fake/Demo Content**: Empty states must render honest placeholders via `dj_empty()`; do not insert fake posts or fake follower counts.
- ❌ **No Duplicate GIF Instances**: Each GIF sticker must only appear in one semantic role across the site (Requirement R19).
