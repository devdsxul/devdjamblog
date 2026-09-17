# Directory Structure

> Architecture layout and file organization for the DEVDJAM frontend and WordPress theme/plugin system.

---

## Overview

DEVDJAM is a self-hosted WordPress music and beat blog featuring a retro Windows 98 aesthetic. It does not use heavy JS frameworks (React/Vue) or build-step bundlers. Instead, it combines:
- A custom WordPress PHP theme with template parts and views.
- Pure Vanilla JavaScript (ES2022) with in-memory SPA-style page navigation, audio deck playback, and window management.
- Pure CSS built on top of `98.css` with modular theme definitions (Milk, Ink, Cherry).
- A companion core plugin handling custom post types, audio metadata, and REST API endpoints.

---

## Directory Layout

```text
c:/Users/Administrator/Desktop/devdjamblog/
├── wp-content/
│   ├── themes/
│   │   └── devdjam/                  # Primary visual theme
│   │       ├── assets/
│   │       │   ├── 98/              # 98.css library and MS Sans Serif webfonts
│   │       │   │   ├── 98.css
│   │       │   │   └── ms_sans_serif*
│   │       │   ├── fonts/           # Display & Gothic fonts (UnifrakturMaguntia)
│   │       │   ├── gif/             # Packaged GifCities retro GIF stickers
│   │       │   ├── site.css         # Main stylesheet (themes, layout, animations)
│   │       │   ├── site.js          # Main client controller (player, SPA, windows)
│   │       │   └── favicon.svg
│   │       ├── parts/
│   │       │   └── player.php       # Persistent DJ Deck audio player component
│   │       ├── views/               # Content views loaded into #site-content
│   │       │   ├── home.php         # Home portal view
│   │       │   ├── archive.php      # Archive / list view (Music, Beats, Blog)
│   │       │   ├── single.php       # Single post/music/beat reading view
│   │       │   └── not-found.php    # 404 error window view
│   │       ├── comments.php         # Win98 Guestbook comment form & list
│   │       ├── functions.php        # Theme setup, assets enqueue, PHP UI helpers
│   │       ├── index.php            # Main outer layout shell (Dock, Player, Shell)
│   │       └── style.css            # WordPress theme header definition
│   │
│   └── plugins/
│       └── devdjam-core/            # Core backend content & REST plugin
│           ├── devdjam-core.php     # CPTs (dj_music, dj_beat), meta, REST API
│           ├── admin.css            # Custom styling for wp-admin beat editors
│           └── admin.js             # Media library audio picker script for wp-admin
│
├── dev/                             # Local development & verification toolchain
│   ├── server.mjs                   # WordPress Playground local runner (Node.js)
│   ├── check.mjs                    # PHP & JavaScript syntax validation script
│   ├── qa.py                        # Automated regression and inspection suite
│   └── package.py                   # Production zip packaging script
│
├── docs/                            # Documentation
│   ├── OWNER-GUIDE.md               # User manual for content management
│   ├── DEPLOYMENT.md                # Server deployment & backup procedures
│   └── ASSETS.md                    # Attribution and origins of visual assets
│
├── package.json                     # Development dependencies & scripts
└── compose.yaml                     # Production Docker Compose specification
```

---

## Module Boundaries

### 1. Theme Outer Shell (`index.php`)
- Renders the non-reloading root container.
- Keeps persistent components outside the dynamic content swap area:
  - Permanent dock navigation (`.dock`)
  - Top status bar and control panel (`.panel`)
  - Continuous audio player element (`#devdjam-audio` and `.dj-deck`)
  - Modal backdrop (`[data-dim]`) and entrance gate (`.entrance-gate`)
- Hosts the `#site-content` container which is swapped dynamically during SPA transitions.

### 2. View Templates (`views/`)
- Pure PHP view partials that render only what belongs inside `#site-content`.
- Swapped both on server-side initial page loads and on client-side fetch transitions.
- References:
  - `views/home.php`: Welcome window, updates marquee, recent beats/music shortcuts.
  - `views/archive.php`: Grid of cards or row list for posts, beats, and music tracks.
  - `views/single.php`: Article/music detail reading view with meta details and back links.

### 3. Client Controller (`assets/site.js`)
- Single monolithic IIFE controller managing:
  - `AudioPlayer`: Web Audio API, HTML5 Audio, queue, track switching, pitch/EQ.
  - `Router`: SPA link clicks, prefetching on hover/touch, in-memory page cache.
  - `WindowManager`: Min/max window states saved in `sessionStorage`.
  - `Preferences`: Theme (`milk` / `ink` / `cherry`) and language (`zh` / `en`) saved in `localStorage`.
  - `FX`: Particle trail, animated sticker clicks, visitor counter.

### 4. Core Content Plugin (`devdjam-core.php`)
- Declares data models independently of the theme:
  - `dj_music`: Underground music reviews and notes with tag taxonomy.
  - `dj_beat`: Self-produced beats with audio attachment ID, BPM, and musical key.
  - REST endpoints: `/wp-json/devdjam/v1/tracks` and `/wp-json/devdjam/v1/hits`.
