# State Management

> State layers, storage mechanisms, and runtime data flow in DEVDJAM.

---

## Overview

DEVDJAM coordinates state across four clearly scoped layers:
1. **Persistent Client Preferences (`localStorage`)**: Theme, language, and animation settings.
2. **Session Window & Navigation State (`sessionStorage` & `history.state`)**: Window minimize/maximize states, scroll offsets, entrance gate dismissal.
3. **In-Memory Runtime State (JS Closures)**: Audio playback, active track index, Web Audio filters, in-memory page cache.
4. **Server Data (REST & WordPress DB)**: Published tracks, visitor hit counts, posts, and media.

---

## State Layers Breakdown

### 1. Persistent User Preferences (`localStorage`)

Managed via a safe storage abstraction wrapped in `try ... catch` to guard against restricted browser contexts (e.g. private browsing or disabled storage):

```javascript
const storage = {
  get(key) { try { return localStorage.getItem(key); } catch { return null; } },
  set(key, value) { try { localStorage.setItem(key, value); } catch {} },
};
```

| Key | Values | Description |
|---|---|---|
| `dj-lang` | `'zh'` \| `'en'` | Interface localization dictionary key |
| `dj-theme` | `'milk'` \| `'ink'` \| `'cherry'` | Visual color palette applied to `data-theme` |
| `devdjam-effects` | `'on'` \| `'off'` | Particle and sticker motion animations toggle |
| `devdjam-volume` | `'0'`…`'1'` | MASTER level. The compact `vol` slider and the console MASTER knob are two views of the same param |
| `dj-cues` | `JSON { "t<trackId>": { cue, hot: [8 × seconds\|null], grid: { bpm, offset }\|null } }` | Memory CUE, hot cues A–H and optional TAP grid override per track; newest 60 tracks kept (key prefix keeps insertion order) |

### 2. Session UI State (`sessionStorage`)

Controls transient UI states that should not persist across browser sessions:

| Key | Format | Description |
|---|---|---|
| `dj-entered` | `'1'` | Set once user clicks through the entrance gate |
| `dj-windows` | `JSON.stringify({ [id]: 'open' \| 'min' \| 'max' })` | Per-window open/minimized/maximized state |

### 3. In-Memory Runtime State

Held in memory inside the `site.js` closure:

```javascript
const state = {
  tracks: [],            // Array of fetched beat track objects
  index: -1,             // Currently active track index (-1 = none)
  queueController: null, // AbortController for track fetching
  error: null,           // Current audio error message key
  shuffle: false,        // Shuffle toggle
};

// In-Memory Page Cache (SPA)
const pages = new Map(); // key: normalized URL string, value: { doc, title, at: timestamp }
```

### 4. Server State (REST API)

Beat/content authoring uses authenticated WordPress operations. The public frontend reads the track list and has a separate visitor-counter write endpoint:
- `GET /wp-json/devdjam/v1/tracks`: Fetches published beats with valid audio attachments.
  - Returns `[{ id, title, url, duration, bpm, key, cover }]`.
- `GET /wp-json/devdjam/v1/hits`: Reads the count; `POST` increments and returns it. Browser-side visit bookkeeping limits normal daily submissions; the endpoint itself does not prove unique people.

---

## State Synchronization Patterns

### Theme & Language Synchronization
- When `lang` or `theme` changes, update `localStorage` immediately.
- Reflect attributes on `document.documentElement` (`data-theme`, `data-lang`).
- Query all `[data-i18n]` nodes and replace text content with localized dictionary matches.
- Early FOUC inline script in `wp_head` mirrors this state before first paint.

### SPA View Swapping & Cache Invalidation
- Navigating to a page checks `pages.get(pageKey(url))`.
- If cached, renders instantly. If the cached entry is older than 60 seconds (`Date.now() - cached.at > 60000`), fetches fresh HTML in the background and re-renders if content changed.
- If uncached, shows `aria-busy="true"` on `#site-content` while fetching, then stores in `pages`.

### Continuous Audio Playback
- Audio elements `#devdjam-audio` (Deck 1) / `#devdjam-audio-b` (Deck 2) and the player container live strictly outside `#site-content`.
- Swapping page views NEVER reloads the audio player or clears playback buffers. This also holds in buffer mode: the engine (AudioContext + deck voices) lives in the persistent shell.

### Controller Orientation (derived UI state)
- CSS media queries decide phone rotation; there is no persisted orientation preference or native orientation lock.
- `syncConsole()` derives `html.has-player-max` from the maximized controller state; CSS uses it to hide the mobile taskbar while open. See the [mobile input contract](./component-guidelines.md#mobile-controller-input-contract) for pointer mapping and resize cancellation.

### Audio Engine State (in memory, `DEVDJAM.engine`)
- Each `Deck` has two playback modes:
  - `stream` (default): the `<audio>` element plays progressively. A visitor who just presses play never downloads/decodes the whole file.
  - `buffer`: `fetch → decodeAudioData → Int16 → DeckCore voice`. Needed for audible scratching, sample-accurate loops and click-free jumps.
- Decoding is triggered only by: opening the maximized console, loading a track while it is open, or touching the compact platter. The switch is a 60 ms crossfade handoff at the current position.
- `deck.phase`: `empty | stream | analyzing | ready | error`. `error` = stays in stream mode (scratch degrades to silent seek).
- Two positions — never mix them up:
  - `headPosition()`: read-head position where the next command takes effect. Use it as the base of every *relative* operation (beat jump, phase align, scratch anchor).
  - `position()`: audible position (head minus output latency × rate, folded back into an active loop). Use it for display and for *setting* points (CUE, hot cues, loop IN/OUT).
  - Mixing them produces errors of `rate × latency` (≈0.16 beat at 180 BPM with 55 ms latency).
- Analysis results (`bpm`, `offset`, waveform bytes) are cached per track id (LRU 8).

---

## Common Mistakes & Anti-Patterns

- ❌ **Storing Audio Inside `#site-content`**: Any element inside `#site-content` gets destroyed when navigating pages. The audio tag must live in the persistent shell.
- ❌ **Unsafe Storage Access**: Direct `localStorage.setItem()` calls can throw `SecurityError` or `QuotaExceededError`. Always use the safe `storage` wrapper.
- ❌ **State Leakage into Global Scope**: Do not pollute `window` with arbitrary global variables; expose only `window.DEVDJAM` configuration.
- ❌ **Mutating History Without Scroll Offsets**: When replacing history state, always preserve `scrollY` to restore scroll positions on `popstate`.
