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
│   │       │   ├── site.css         # Site shell stylesheet (themes, layout, windows, footer, animations)
│   │       │   ├── deck.css         # DJ deck styles: sidebar compact player + maximized DDJ controller
│   │       │   ├── deck-worklet.js  # DSP core (DeckCore): AudioWorklet module AND plain-script fallback
│   │       │   ├── audio-engine.js  # Audio engine: decks, mixer, BEAT FX, sampler (no DOM)
│   │       │   ├── track-analysis.js # BPM / beat grid / waveform / key detection, shared by the deck and wp-admin (no DOM)
│   │       │   ├── site.js          # UI controller: players/console views, SPA, windows, stickers
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
│           └── admin.js             # wp-admin: media pickers + BPM / key auto-detect (editor and control-room batch)
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
- Single IIFE UI controller managing:
  - Player views: sidebar compact player (= Deck 1, the site playlist) and the maximized DDJ console (screen, decks, mixer, BEAT FX, tape library). Views never touch Web Audio nodes directly — they call the engine and render its state.
  - Param store: `defineParam` / `setParam` — one source of truth per control value, several views (native range inputs in the compact player, custom knobs/faders in the console).
  - `Router`: SPA link clicks, prefetching on hover/touch, in-memory page cache.
  - `WindowManager`: Min/max window states saved in `sessionStorage`.
  - `Preferences`: Theme (`milk` / `ink` / `cherry`) and language (`zh` / `en`) saved in `localStorage`.
  - `FX`: Particle trail, animated sticker clicks, visitor counter.

### 3a. Audio Engine (`assets/audio-engine.js`) and DSP core (`assets/deck-worklet.js`)
- Script order (functions.php): inline config (`Object.assign` onto `window.DEVDJAM`) → `deck-worklet.js` + `track-analysis.js` → `audio-engine.js` → `site.js`. Asset version is the single `DEVDJAM_ASSET_VER` constant.
- `track-analysis.js` is registered on `init` as `devdjam-analysis` (front end **and** wp-admin) and exports `DEVDJAM.analysis = { checkpoint, decodeAudio, analyzeBuffer, detectKey }`. The deck and the devdjam-core admin auto-detect both use it — never copy the analysis into the plugin. The plugin shows detect UI only when `wp_script_is('devdjam-analysis', 'registered')`.
- Key strings are DJ short names (`Am`, `F#m`, `C`, `Bb`). Relative major / minor (`Am` vs `C`) is the known ambiguity of profile matching; the owner can overwrite the field.
- `audio-engine.js` has no DOM knowledge. It exposes `DEVDJAM.createEngine({ elements, workletUrl })` and `DEVDJAM.audioConstants`; site.js stores the instance at `DEVDJAM.engine` (debugging / automated acceptance).
- `deck-worklet.js` defines `DeckCore` once. In an AudioWorklet scope it registers the `devdjam-deck` processor; as a normal page script it exports `DEVDJAM.DeckCore` for the ScriptProcessor fallback. Never fork the DSP into two copies.

### 4. Core Content Plugin (`devdjam-core.php`)
- Declares data models independently of the theme:
  - `dj_music`: Underground music reviews and notes with tag taxonomy.
  - `dj_beat`: Self-produced beats with audio attachment ID, BPM, and musical key.
  - REST endpoints: `/wp-json/devdjam/v1/tracks` and `/wp-json/devdjam/v1/hits`.
