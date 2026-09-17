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
| `dj-fx` | `'on'` \| `'off'` | Particle and sticker motion animations toggle |

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

All write operations are confined to `wp-admin`. The frontend only consumes lightweight read-only endpoints:
- `GET /wp-json/devdjam/v1/tracks`: Fetches published beats with valid audio attachments.
  - Returns `[{ id, title, url, duration, bpm, key, cover }]`.
- `POST /wp-json/devdjam/v1/hits`: Increments and retrieves unique visitor count.

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
- Audio element `#devdjam-audio` and DJ deck container `.dj-deck` exist strictly outside `#site-content`.
- Swapping page views NEVER reloads the audio player or clears playback buffers.

---

## Common Mistakes & Anti-Patterns

- ❌ **Storing Audio Inside `#site-content`**: Any element inside `#site-content` gets destroyed when navigating pages. The audio tag must live in the persistent shell.
- ❌ **Unsafe Storage Access**: Direct `localStorage.setItem()` calls can throw `SecurityError` or `QuotaExceededError`. Always use the safe `storage` wrapper.
- ❌ **State Leakage into Global Scope**: Do not pollute `window` with arbitrary global variables; expose only `window.DEVDJAM` configuration.
- ❌ **Mutating History Without Scroll Offsets**: When replacing history state, always preserve `scrollY` to restore scroll positions on `popstate`.
