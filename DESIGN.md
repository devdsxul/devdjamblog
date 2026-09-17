---
name: DEVDJAM Design System
version: alpha
description: Retro Windows 98 desktop environment infused with Japanese Harajuku street fashion (jfashion), cyber-goth blackletter accents, and an analog dual-deck DJ workstation.
colors:
  primary: "#111111"
  on-primary: "#ffffff"
  secondary: "#6b6b6b"
  on-secondary: "#ffffff"
  tertiary: "#ff3d8a"
  on-tertiary: "#111111"
  tertiary-hover: "#e02674"
  background: "#ffffff"
  on-background: "#111111"
  surface: "#ffffff"
  on-surface: "#111111"
  surface-dim: "#fafafa"
  surface-bright: "#ffffff"
  surface-container: "#fafafa"
  surface-container-high: "#f0f0f0"
  outline: "#111111"
  outline-variant: "#d0d0d0"
  accent-pink: "#ff3d8a"
  accent-yellow: "#ffd400"
  on-accent-yellow: "#111111"
  lcd-background: "#111111"
  lcd-text: "#ffffff"
typography:
  headline-gothic:
    fontFamily: OldEnglish, "Old English Text MT", UnifrakturMaguntia, serif
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: 0em
  headline-window:
    fontFamily: "Pixelated MS Sans Serif", SimSun, "Microsoft YaHei", Arial, sans-serif
    fontSize: 12px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 1px
  body-ui:
    fontFamily: "Pixelated MS Sans Serif", SimSun, "Microsoft YaHei", Arial, sans-serif
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: 0em
  mono-track:
    fontFamily: "Courier New", SimSun, monospace
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 0.05em
  display-enter:
    fontFamily: OldEnglish, "Old English Text MT", UnifrakturMaguntia, serif
    fontSize: 64px
    fontWeight: 700
    lineHeight: 1.1
    letterSpacing: 0.02em
rounded:
  none: 0px
  sm: 0px
  md: 0px
  lg: 0px
  full: 9999px
spacing:
  unit: 2px
  xs: 2px
  sm: 4px
  md: 8px
  lg: 12px
  xl: 16px
  xxl: 24px
  gutter: 12px
  dock-width: 116px
components:
  window-frame:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
  window-titlebar:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    typography: "{typography.headline-window}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
    height: 24px
  button-retro:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.mono-track}"
    rounded: "{rounded.none}"
    padding: 10px
    height: 23px
  button-retro-hover:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.tertiary}"
  dock-item:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-ui}"
    rounded: "{rounded.none}"
    padding: 6px
  dock-item-active:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.none}"
    padding: 6px
  deck-platter:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.full}"
    size: 160px
  lcd-display:
    backgroundColor: "{colors.lcd-background}"
    textColor: "{colors.lcd-text}"
    typography: "{typography.mono-track}"
    rounded: "{rounded.none}"
    padding: "{spacing.sm}"
---

## Overview

DEVDJAM evokes the intimate digital sanctuary of a late-1990s Japanese cyber-goth producer's customized Windows 98 workstation. It marries the utilitarian, unadorned structural discipline of classic 16-bit GUI design (`98.css`) with the expressive underground rebellion of Shibuya street culture (jfashion), Cloud Rap cassette tape trading, and authentic Neocities/Geocities web mysticism.

The experience is centered around a living vinyl DJ deck that streams underground beat tapes without interruption as visitors navigate between music archives, beat drops, raw journal entries, and guestbook discussions.

Rather than sterile corporate retro-chic, the interface feels hand-assembled and physical: high-contrast black ink outlines, tactile isometric hard-pixel shadows, hot-pink interactive flourishes, and draggable GifCities animated decals that behave like actual stickers slapped onto the side of a flight case.

## Colors

The visual identity is founded upon a crisp, monochrome high-contrast bedrock, energized by deliberate neon accents:

- **Primary (`#111111`)**: Deepest black ink (`{colors.primary}`). Used for window frames, title bar fills, hard drop-shadows, typography headers, and vinyl turntable records.
- **Background (`#ffffff`)**: Pure white desktop foundation (`{colors.background}`). Overlaid with a subtle, repeating Neocities Astro celestial stardust pattern (`assets/img/astro-bg.svg`) featuring microscopic pastel star clusters and celestial coordinate crosshairs.
- **Surface (`#ffffff`)**: Opaque window pane and card canvas (`{colors.surface}`). Maintains clean readability against the wallpaper texture.
- **Secondary (`#6b6b6b`)**: Muted pencil slate (`{colors.secondary}`). Reserved for secondary metadata, track timestamps, file sizes, and inactive window captions.
- **Tertiary / Accent Pink (`#ff3d8a`)**: Radiant Harajuku hot pink (`{colors.tertiary}`). The primary interactive beacon—ignites active navigation badges, hover borders, vinyl pitch indicators, and animated sparkles.
- **Accent Yellow (`#ffd400`)**: Cautionary cyber-gold (`{colors.accent-yellow}`). Employed for keyboard skip links, emergency audio cue markers, and high-priority notices.
- **LCD Background (`#111111`) & Text (`#ffffff`)**: High-contrast monochrome terminal palette for DJ deck readouts, track telemetry, and fader displays.
- **Theme Variations**: The design supports an alternate **Ink** dark mode (`html[data-theme="ink"]`, `#111111` canvas with `#f2f2f2` borders) and a **Cherry** mode (`html[data-theme="cherry"]`, ruby crimson accents).

## Typography

Three distinct typographic voices construct DEVDJAM's world:

1. **Gothic Blackletter (`{typography.headline-gothic}`)**:
   - Fonts: `OldEnglish`, `Old English Text MT`, `UnifrakturMaguntia`, serif.
   - Purpose: Brand authority and subcultural reverence. Expresses the full-screen Neocities 1999 entry gate logo and the top header banner with 3D relief layering (`.char-back` and `.char-front`).
2. **Pixelated System UI (`{typography.body-ui}` & `{typography.headline-window}`)**:
   - Fonts: `Pixelated MS Sans Serif`, `SimSun`, `Microsoft YaHei`, Arial, sans-serif.
   - Purpose: Authentic operating system chrome. Drives window title bars, dock navigation items, post excerpts, and system menus. Rendered with sharp aliasing (`-webkit-font-smoothing: none`).
3. **Monospace Telemetry (`{typography.mono-track}`)**:
   - Fonts: `Courier New`, `SimSun`, monospace.
   - Purpose: Tactile hardware readouts and track details (BPM, Musical Key, durations, audio fader percentages, button labels).

## Layout

The desktop environment is framed within a fixed 100vh viewport simulating a complete personal computing screen:

- **Dock Sidebar (`116px`)**: Pinned flush to the left, housing the site mascot GIF, primary section links, and social redirects (`.dock-foot`).
- **Main Workspace (`#site-content`)**: Fluid multi-window flex layout accommodating independent, movable, and resizable Win98 windows (`.window`).
- **DJ Deck Console (`.win-player`)**:
  - Compact Mode: A single turntable platter and quick-play track queue embedded conveniently on the sidebar.
  - Dual-Deck Workstation Mode: When maximized, transitions into a full horizontal twin-deck mixing console: Deck A on the left, central dual-fader DJ mixer with crossfader in the center, Deck B on the right, and the full cassette crate table below.
- **Entrance Gate (`.enter[data-enter]`)**: A full-screen immersive cyber-goth threshold featuring CRT scanlines, 3D chrome blackletter lettering, and a Win98 segmented loading bar before granting entrance.
- **Responsive Mobile Flow**: Stacks the persistent left dock into a collapsible drawer, expands post lists into single-column cards, and docks the audio player to an accessible sticky bottom sheet.

## Elevation & Depth

True to 1990s desktop operating systems, elevation is created through directional light and pixel displacement rather than modern diffused Gaussian blurs:

- **Hard Isometric Drop Shadow**: Solid `3px 3px 0 #111111` on windows and cards; `2px 2px 0 #111111` on buttons and chips (`--hard`, `--hard-sm`).
- **Mechanical Tactile Depress**: Active interactive elements physically translate `(2px, 2px)` on pointer press with `box-shadow: none`, emulating the click of a physical spring-loaded microswitch.
- **Sunken Well Inset**: Form inputs, textareas, and LCD meters feature an inset bevel shadow (`inset 2px 2px 0 #d0d0d0`), creating the sensation of recessed plastic cutouts.
- **Window Shades**: Minimized windows collapse down cleanly to their title bar height with small hard shadows, leaving the underlying astro desktop wallpaper visible.

## Shapes

- **Zero Border Radius (`{rounded.none}`)**: All windows, dialogs, buttons, list rows, and input boxes possess strictly sharp `0px` rectangular corners. Rounded corners on structural chrome are forbidden.
- **Full Circular Platters (`{rounded.full}`)**: `9999px` border radii are reserved exclusively for vinyl records, rotating turntable platters, and turntable tonearm pivots.
- **Sticker Rotation**: Active navigation badges and sticker decals carry slight imperfect analog rotations (e.g., `-2.5deg` to `-3.5deg`), imparting a physical zine/scrapbook collage aesthetic.

## Components

- **Windows 98 Window (`.window`, `dj_window_open`)**:
  - Composition: 1px black outline, 3px solid drop shadow, gradient title bar with pixelated icon, and minimize (`-`) / maximize (`□`) control buttons.
  - Rule: Explicitly lacks a close (`×`) button to preserve window state in the desktop session. Double-clicking the title bar toggles window shade minimization.
- **Retro Sticker Buttons (`button`, `.button`)**:
  - High-contrast white background, black monospace text, tactile drop shadow.
  - Hover triggers bright hot pink outline and text; click depresses by `2px`.
- **Draggable Interactive Stickers (`dj_sticker`)**:
  - Local GifCities animated clips (`assets/gif/`) with pointer capture drag-and-drop.
  - Features collision push-away physics so stickers glide away rather than stacking clumsily on top of one another. Positions persist across page changes via `sessionStorage`.
- **Continuous Audio Player (DJ Turntable)**:
  - Powered by a persistent `HTMLAudioElement`.
  - Seamless SPA-style PJAX page transitions guarantee music keeps spinning without interruption while visitors read articles or browse beats.
- **Honest Empty States (`dj_empty`)**:
  - No synthetic placeholder articles or fake follower counters. Empty sections render honest retro illustrations (e.g., cassette tape, construction shovel) and clear inviting copy.

## Do's and Don'ts

### Do's
- **DO** use sharp `0px` corners on all window containers, cards, and buttons.
- **DO** use solid pixel drop shadows (`box-shadow: 2px 2px 0 #111111`) instead of blurry shadows.
- **DO** preserve continuous audio playback across internal navigation links.
- **DO** bundle all GIF stickers and font files locally in `assets/` to ensure offline resilience and zero remote tracking.
- **DO** respect `prefers-reduced-motion` by disabling turntable spinning and sticker jitter animations.
- **DO** pair `{colors.on-surface}` (`#111111`) on `{colors.surface}` (`#ffffff`) for maximum WCAG AA (18.8:1) accessibility.

### Don'ts
- **DON'T** apply modern soft blur shadows (`box-shadow: 0 10px 25px rgba(0,0,0,0.1)`).
- **DON'T** add close (`×`) buttons to standard desktop windows.
- **DON'T** hotlink remote images from GifCities or external CDNs.
- **DON'T** use rounded borders (e.g., `border-radius: 8px` or `12px`) on windows, cards, or buttons.
- **DON'T** auto-play audio with unmuted sound before the visitor explicitly interacts with the entrance gate or player.
- **DON'T** fabricate mock posts, fake stream counts, or placeholder tracks.
