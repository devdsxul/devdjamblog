# Type Safety & Data Sanitization

> Defensive typing, runtime validation, and sanitization standards for DEVDJAM.

---

## Overview

DEVDJAM combines server-side PHP data validation with client-side defensive JavaScript. Because TypeScript is not used in the runtime build, type safety relies on:
1. Strict WordPress metadata schemas and sanitization callbacks.
2. Context-aware output escaping in templates.
3. Defensive runtime type checks, URL origin guards, and safe numeric boundaries in JavaScript.

---

## PHP & WordPress Sanitization Patterns

### 1. Schema-Driven Post Meta
When registering custom meta fields for CPTs (such as `dj_beat`), always declare the explicit data type, sanitization callback, and REST schema:

```php
// wp-content/plugins/devdjam-core/devdjam-core.php
register_post_meta('dj_beat', '_dj_audio_id', array(
    'type' => 'integer',
    'single' => true,
    'default' => 0,
    'show_in_rest' => true,
    'sanitize_callback' => 'absint',
    'auth_callback' => static function ($allowed, $key, $post_id) {
        return current_user_can('edit_post', (int) $post_id);
    },
));

register_post_meta('dj_beat', '_dj_bpm', array(
    'type' => 'integer',
    'single' => true,
    'default' => 0,
    'show_in_rest' => array('schema' => array('type' => 'integer', 'minimum' => 0, 'maximum' => 999)),
    'sanitize_callback' => 'devdjam_sanitize_bpm', // Bounds clamped via min(999, absint($value))
    'auth_callback' => $auth,
));
```

### 2. Audio Attachment Verification
Never assume an attachment ID points to valid audio:
```php
function devdjam_valid_audio($id) {
    return $id > 0
        && get_post_type($id) === 'attachment'
        && wp_attachment_is('audio', $id)
        && (bool) wp_get_attachment_url($id);
}
```

### 3. Context-Aware Template Escaping
Never output raw database values into template markup:
- **HTML Content**: `wp_kses_post($content)` (e.g. guestbook comments)
- **Plain Text**: `esc_html($title)`
- **HTML Attributes**: `esc_attr($id)`
- **URLs**: `esc_url($link)`
- **JSON for Scripts**: `wp_json_encode($data)`

---

## Client-Side JavaScript Runtime Guards

### 1. Numeric & Boundary Checks
Guard audio timestamps and calculations against `NaN` and `Infinity`:
```javascript
const time = (seconds) => {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const m = String(Math.floor(seconds / 60)).padStart(2, '0');
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
};
```

### 2. URL Origin & Protocol Validation
Prevent open redirect vulnerabilities and protocol hijacking when processing internal navigation or audio URLs:
```javascript
function internalURL(link) {
  if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return null;
  let url;
  try {
    url = new URL(link.href, location.href);
  } catch {
    return null;
  }
  // Enforce same-origin and http/https protocols
  if (url.origin !== location.origin || !['http:', 'https:'].includes(url.protocol)) return null;
  // Exclude admin areas, feeds, and media files from SPA hijacking
  if (/\/(wp-admin|wp-login\.php|wp-json|wp-content|feed)(\/|\?|$)/.test(url.pathname)) return null;
  if (/\.(mp3|wav|ogg|m4a|zip|pdf|png|jpe?g|webp|gif)$/i.test(url.pathname)) return null;
  return url;
}
```

### 3. Safe JSON & Storage Parsing
Never call `JSON.parse()` without a fallback:
```javascript
const session = {
  get() {
    try {
      return JSON.parse(sessionStorage.getItem('dj-windows') || '{}');
    } catch {
      return {};
    }
  },
};
```

---

## Forbidden Anti-Patterns

- ❌ **Direct Database Queries Without Prepared Statements**: Use `WP_Query` or `$wpdb->prepare()`.
- ❌ **Unescaped `echo $variable`**: Every variable output in PHP must go through `esc_*()` or `wp_kses_*()`.
- ❌ **Assuming Audio File Existence**: Always check `devdjam_valid_audio()` before enqueueing tracks into the public player queue.
- ❌ **Unchecked DOM Ingestion**: Do not insert untrusted HTML into the DOM via `innerHTML` without sanitization. Use `textContent` for plain text.
