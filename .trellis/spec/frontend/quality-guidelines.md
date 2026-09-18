# Quality Guidelines

> Code quality, automated verification, visual constraints, and security standards for DEVDJAM.

---

## Overview

Quality assurance in DEVDJAM spans syntax validation across PHP and JavaScript, visual consistency under the retro Windows 98 aesthetic, strict security boundaries around WordPress authoring, and zero-bloat vanilla execution.

---

## Automated Verification Tools

Before committing or concluding any implementation, run the project's verification suite:

```bash
# 1. Syntax check for all PHP and JavaScript files in wp-content
npm run check
# Executes: node dev/check.mjs
# Validates PHP 8.3 AST with php-parser and JS syntax with node --check

# 2. Local development environment verification
npm run dev
# Boots WordPress Playground (PHP 8.3 + SQLite + WP 7.1) at http://127.0.0.1:8787/

# 3. Packaging check
npm run package
# Bundles dist/ release archives (theme, plugin, server)

# 4. Playwright acceptance & responsive viewport bounds check
python dev/qa.py
# Tests full user journeys and asserts no horizontal overflow (scrollWidth <= width)
# and all nav links contained across viewports [320, 390, 768, 1440]
```

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
- **Public Endpoints are Read-Only**: The public REST API (`/devdjam/v1/tracks`) only exposes published beats that possess a valid audio attachment (`devdjam_valid_audio()`).

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
- **Win98 Fixed Bottom Taskbar (`<= 600px`)**: On mobile, `.dock` shifts to the bottom (`position: fixed; bottom: 0; left: 0; right: 0;`). On ultra-narrow screens (`<= 440px`), buttons collapse text labels to show only crisp 14px-16px pixel icons, fitting all 12 items (Start, 7 nav tabs, 3 social links, admin key, clock) in a single row without wrapping.
- **Touch Hit Areas**: Interactive elements (`.title-bar-controls button`, `.play-button`, `.track-button`, `.deck-controls button`) must have touch target heights >= 36-44px. Range sliders must specify `touch-action: pan-y`.
- **iOS Safari Font Zoom Prevention**: Form controls (`input`, `textarea`, `select`) must specify `font-size: 16px !important` on mobile viewports to prevent iOS Safari from automatically zooming the page upon focus.

---

## Review Checklist

Before finishing any task, ensure:
- [ ] `npm run check` passes with 0 errors.
- [ ] Acceptance suite `python dev/qa.py` passes (or manual bounds verification across 320px, 390px, 768px, 1440px).
- [ ] Changes do not break continuous audio playback during SPA navigation.
- [ ] No external asset links were introduced.
- [ ] Esc key properly dismisses any open modal or maximized window.
- [ ] Layout remains responsive down to 320px viewport width without horizontal scroll (`scrollWidth <= width`).
- [ ] Mobile form inputs have `font-size: 16px` to prevent iOS Safari auto-zoom.
- [ ] Touch hit areas on interactive buttons are at least 36px–40px.
- [ ] Local storage and session storage reads are guarded by `try ... catch`.
