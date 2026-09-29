# Quality Guidelines

> Code quality, automated verification, visual constraints, and security standards for DEVDJAM.

---

## Overview

Quality assurance in DEVDJAM spans syntax validation across PHP and JavaScript, visual consistency under the retro Windows 98 aesthetic, strict security boundaries around WordPress authoring, and zero-bloat vanilla execution.

---

## Automated Verification Tools

Select verification by the changed surface. Reuse valid evidence for unchanged code; a docs-only closeout needs link/fact checks, not a fresh full browser suite. The available commands are:

```bash
# 1. Syntax check for all PHP and JavaScript files in wp-content
npm run check
# Executes: node dev/check.mjs
# Validates PHP 8.3 AST with php-parser and JS syntax with node --check

# 2. Deck pointer regression (no browser; required when changing controller input)
node dev/check-deck-input.mjs

# 3. Local development environment verification
npm run dev
# Boots WordPress Playground (PHP 8.3 + SQLite + WP 7.1) at http://127.0.0.1:8787/

# 4. Packaging (overwrites dist; reads the working tree, so exclude unrelated edits first)
npm run package
# Bundles dist/ release archives (theme, plugin, server)

# 5. Full browser acceptance, only when needed and authorized
python dev/qa.py
# Tests full user journeys and asserts no horizontal overflow (scrollWidth <= width)
# and all nav links contained across viewports [320, 390, 768, 1440]
```

---

## Audio Engine Contracts

- **Two DSP hosts, one core**: HTTPS / localhost prefer AudioWorklet when available; the HTTP fallback and browsers without it use ScriptProcessor. The canonical production entry is HTTPS; current deployment evidence lives in `docs/DEPLOYMENT.md`, with private connection details in untracked `docs/PRODUCTION.md`. Audio graph / DSP changes need both paths verified — simulate the fallback with `Object.defineProperty(BaseAudioContext.prototype, 'audioWorklet', { get() { return undefined; } })` in a Playwright init script.
- **Report timestamps**: voice reports carry the context time of the *end* of the rendered block. Worklet reports are in the past (extrapolate forward to `currentTime`); ScriptProcessor reports are in the future (`playbackTime` of a queued buffer — do not extrapolate the head).
- **Main-thread budget on the fallback path**: long synchronous work starves ScriptProcessor callbacks and causes dropouts. Chunk heavy loops with the engine's `idle()` (MessageChannel yield; `setTimeout` is clamped to ≥4 ms).
- **Casual playback stays cheap**: pressing play on a list item must not create a buffer voice (`DEVDJAM.engine.decks[0].voice === null` until the console is opened or the platter is touched).
- **Levels in tests**: a single analyser read is a 21 ms window and can fall between drum hits — sample levels repeatedly over ≥300 ms before asserting silence or signal.
- **No delay-free cycles in the audio graph**: the BEAT FX output feeds the channel returns, which reach the master bus, whose send feeds the FX again. Per the Web Audio spec a cycle without a `DelayNode` must be muted — Firefox mutes the *entire* master output (verified: PHASER / ROLL / TRANS → 0.000 even with FX off). Chromium silently tolerates it, so Chromium-only testing hides the bug. Keep the one-render-quantum `DelayNode` on the master send, and verify graph changes on Firefox too (`python -m playwright install firefox`, then `p.firefox.launch(...)`).
- **Force a stereo master bus**: `masterBus.channelCountMode = 'explicit'` with 2 channels. Otherwise an all-mono mix (mono MP3 in stream mode) stays mono and the L/R splitter → merger meter path plays it on the left speaker only.
- **Mono / stale-report hygiene**: position reports carry the seek sequence number (`seq`); drop reports older than the last seek, or the display jumps back one frame after every jump.
- **No low-frequency non-sine `OscillatorNode`s**: Firefox builds a band-limited wavetable the first time a `square` / `sawtooth` / `triangle` oscillator is rendered at a new frequency range. For an LFO at a few Hz that table has thousands of partials and freezes the whole audio thread for ~0.3 s (measured: context clock frozen 108–123 ms, audio 330 ms behind). Use a sine LFO and shape it with a `WaveShaperNode` (TRANS uses `tanh(8x)` → rounded square gate, ~18 ms edges). Audio-rate non-sine oscillators (sampler voices) are fine.
- **FX rack is persistent**: all six BEAT FX units are built once at engine start and switched with per-unit input/output gate gains (20 ms crossfade). Never create / disconnect audio nodes while performing — graph topology changes are the most common source of glitches.
- **How to measure glitches**: in a page, sample `performance.now()` against `ctx.currentTime` every 5 ms around an action; "audio fell behind wall clock" > ~20 ms or a frozen context clock means the audio thread stalled. A serverless Playwright harness (route-fulfilled `http://localhost/` = secure/worklet, `http://harness.test/` = insecure/ScriptProcessor) runs this in Firefox and Chromium without WordPress.

---

## Code Standards & Required Patterns

### 1. Zero-Warning Rule
- `npm run check` must report `Syntax OK` with exit code 0.
- No syntax errors, uncaught parse failures, or undeclared variables in JavaScript.
- Modern JavaScript (ES2022) with `'use strict';` wrapped in an IIFE.

### 2. WordPress Security & Capabilities
- **Write Authorization**: Every administrative action, REST endpoint mutation, or meta modification must verify user capability:
  ```php
  if (!current_user_can('edit_post', (int) $post_id)) {
      return new WP_Error('forbidden', 'Unauthorized', array('status' => 403));
  }
  ```
- **Nonce Verification**: Form submissions and AJAX handlers must verify nonces via `check_admin_referer()` or `wp_verify_nonce()`.
- **Track Listing is Read-Only**: The public REST API (`/devdjam/v1/tracks`) only exposes published beats that possess a valid audio attachment (`devdjam_valid_audio()`).

---

## Visual & Design Constraints

### 1. Windows 98 Retro Aesthetic
- **Window Controls (R14)**: Windows MUST have only Minimize (`-`) and Maximize (`□`) buttons. No Close button (`×`) is allowed.
- **Maximized Modal Behavior (R20)**: Maximized windows pop out into a centered floating modal with a backdrop (`[data-dim]`). The original location is held by `.window-ghost`. Dismissible via Esc, backdrop click, or clicking Maximize again.
- **Honest Empty States (R5)**: First-time runs and empty archives must display an honest placeholder via `dj_empty()`. Never generate fake posts, dummy tracks, or fake counter numbers.

### 2. Asset Integrity & GIF Rules
- **Self-Contained Bundling (R9)**: All GIF stickers and 98 assets must be bundled locally under `assets/`. Never reference external CDNs, `gifcities.org`, or `sadgrl.online` in production markup.
- **GIF Uniqueness (R19)**: Every animated GIF must only appear once in a distinct semantic role (navigation icon, title icon, or sticker) across the entire site.
- **Cumulative Layout Shift (CLS)**: Always specify `width` and `height` on images and stickers (handled automatically by `dj_gif()`).

### 3. Mobile Responsiveness & Touch Ergonomics
- **Viewport Bounds Containment**: At viewports 320px, 390px, 768px, and 1440px, all navigation items in `.dock a` must satisfy `left >= -1 and right <= width + 1`, and `document.documentElement.scrollWidth <= width`. Nav links must not be horizontally scrolled off-screen or clipped.
- **Mobile Page Flow (`<= 720px`)**: `html`/`body` drop the desktop `100dvh + overflow: hidden` lock and the page scrolls naturally; `.desk`, `.col`, `.win-content` and `#site-content` become `height: auto; overflow: visible` so every stacked window (content, dj deck, visitors, calendar) is fully visible. The banner switches to a column (letters on top, two wrapped sticker rows below) and the ordinary narrow layout stacks `.ddj-console`. The coarse-pointer mobile controller overrides this with a horizontally arranged, optionally rotated window; see the [mobile input contract](./component-guidelines.md#mobile-controller-input-contract). The home hero keeps the "small cover left, title right" row at every width `<= 720px` (cover `112px`), and `.home-pane-*` carry no fixed `min-height` so short lists leave no blank strip.
- **Stacking Order Contract**: `.enter` gate (`z-index: 10000`) > mobile `.dock` taskbar (`9999`) > dragging sticker (`1000`) > `.top-lang` desktop (`250`) > maximized window (`150`) > `.desk-dim` backdrop (`120`). `body` is a flex container, so a flex child such as `.top-lang` participates in stacking through `z-index` even with `position: static`; at `<= 720px` it must be lowered to `z-index: 1` so the maximized window's title-bar buttons stay clickable.
- **Maximize Animation on Mobile**: transform animations and the old phone-window `!important` rules can override a rotated modal. The coarse-pointer controller disables maximize/restore animations and explicitly overrides those position/transform rules. Do not remove either override when tuning dimensions.
- **Wide Content Inside Modals**: `.ddj-browser` / `.browser-wrap` contain the compact table; the mobile controller uses a 760px logical minimum and `.window-body` scrolling. The rotated outer window must remain inside the viewport; do not confuse allowed inner scrolling with page overflow.
- **Win98 Fixed Bottom Taskbar (`<= 600px`)**: On mobile, `.dock` shifts to the bottom (`position: fixed; bottom: 0; left: 0; right: 0;`). On ultra-narrow screens (`<= 440px`), buttons collapse text labels to show only crisp 14px-16px pixel icons, fitting all 12 items (Start, 7 nav tabs, 3 social links, admin key, clock) in a single row without wrapping.
- **Touch Hit Areas**: Interactive elements (`.title-bar-controls button`, `.play-button`, `.track-button`, `.deck-controls button`) must have touch target heights >= 36-44px. Range sliders must specify `touch-action: pan-y`.
- **iOS Safari Font Zoom Prevention**: Form controls (`input`, `textarea`, `select`) must specify `font-size: 16px !important` on mobile viewports to prevent iOS Safari from automatically zooming the page upon focus.

---

## Review Checklist

Before finishing any task, ensure:
- [ ] For PHP / JS edits, `npm run check` passes with 0 errors; docs-only changes reuse the unchanged-code result.
- [ ] Input edits pass `node dev/check-deck-input.mjs`. When browser / real-device acceptance is performed, record its viewport, pointer type and audio path; otherwise keep that boundary explicitly unverified.
- [ ] Changes do not break continuous audio playback during SPA navigation.
- [ ] No external asset links were introduced.
- [ ] Esc key properly dismisses any open modal or maximized window.
- [ ] Layout remains responsive down to 320px viewport width without horizontal scroll (`scrollWidth <= width`).
- [ ] Mobile form inputs have `font-size: 16px` to prevent iOS Safari auto-zoom.
- [ ] Touch hit areas on interactive buttons are at least 36px–40px.
- [ ] Local storage and session storage reads are guarded by `try ... catch`.
