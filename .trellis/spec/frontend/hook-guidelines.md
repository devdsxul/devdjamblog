# Hook Guidelines

> Lifecycle hooks, WordPress action/filter hooks, and client-side event patterns in DEVDJAM.

---

## Overview

DEVDJAM operates across two hook systems:
1. **WordPress Backend Hooks**: Action and filter hooks in PHP that control initialization, theme asset enqueuing, CPT/meta registration, and query scoping.
2. **Frontend Event & Lifecycle Hooks**: Event delegation patterns in Vanilla JS that intercept navigation, handle prefetching, manage audio player states, and synchronize user preferences.

---

## WordPress Action & Filter Hooks

### 1. Theme Setup & Assets Enqueue
```php
// functions.php
add_action('after_setup_theme', static function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('responsive-embeds');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
});

add_action('wp_enqueue_scripts', static function () {
    $base = get_template_directory_uri() . '/assets/';
    wp_enqueue_style('devdjam-98', $base . '98/98.css', array(), '0.1.20');
    wp_enqueue_style('devdjam', $base . 'site.css', array('devdjam-98'), '3.0.0');
    wp_enqueue_script('devdjam', $base . 'site.js', array(), '3.0.0', true);
    // Inject runtime config before site.js executes
    wp_add_inline_script('devdjam', 'window.DEVDJAM = ' . wp_json_encode(array(
        'tracksUrl' => rest_url('devdjam/v1/tracks'),
        'hitsUrl' => rest_url('devdjam/v1/hits'),
        'homeUrl' => home_url('/'),
        'siteName' => get_bloginfo('name'),
    )) . ';', 'before');
});
```

### 2. Early FOUC Prevention Hook (`wp_head`)
Runs at priority 1 to synchronously read `localStorage` values (`dj-lang`, `dj-theme`, `dj-entered`) before the DOM renders, preventing visual flickering.
```php
add_action('wp_head', static function () {
    echo '<script>try{var l=localStorage.getItem("dj-lang"),t=localStorage.getItem("dj-theme"),d=document.documentElement;if(l)d.dataset.lang=l;if(t)d.dataset.theme=t;d.lang=l==="zh"?"zh-CN":"en";if(!sessionStorage.getItem("dj-entered"))d.dataset.gate="1";}catch(e){}</script>';
}, 1);
```

### 3. Unified Post Type Query Hook (`pre_get_posts`)
Ensures searches and tag archives query across posts, music, and beats simultaneously:
```php
add_action('pre_get_posts', static function ($query) {
    if (!is_admin() && $query->is_main_query()) {
        if ($query->is_tag() || $query->is_search()) {
            $query->set('post_type', array('post', 'dj_music', 'dj_beat'));
        }
        if ($query->is_archive() || $query->is_home()) {
            $query->set('posts_per_page', 12);
        }
    }
});
```

---

## Client-Side Lifecycle & Event Hooks

### 1. SPA Navigation Hook
Intercepts clicks on internal links, prevents hard reloads, and swaps only `#site-content`:
```javascript
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey) return;
  const url = internalURL(link);
  if (!url) return; // Fall back to browser full navigation for external links, wp-admin, media files
  event.preventDefault();
  void navigate(url);
});
```

### 2. Speculative Prefetch Hooks
Pre-loads HTML responses into an in-memory `Map` during idle time or user intent triggers:
```javascript
document.addEventListener('pointerenter', prefetchFromEvent, true);
document.addEventListener('focusin', prefetchFromEvent);
document.addEventListener('touchstart', prefetchFromEvent, { passive: true });

// Idle prefetch for dock navigation
if ('requestIdleCallback' in window) {
  requestIdleCallback(warmUp, { timeout: 4000 });
} else {
  setTimeout(warmUp, 1500);
}
```

### 3. Audio Player Lifecycle Hooks
Synchronizes UI state, seek bars, and MediaSession metadata with standard HTMLMediaElement events:
- `timeupdate` → updates `currentTime` and elapsed time display
- `play` / `pause` → toggles `.is-playing` class on body/deck and updates MediaSession
- `ended` → plays next track in queue or loops
- `error` → handles playback failures gracefully with retry hints

---

## Best Practices & Pitfalls

- **Passive Event Listeners**: Always use `{ passive: true }` for touch events to avoid scrolling jank.
- **Abortable Requests**: Use `AbortController` when triggering new SPA navigations to cancel in-flight requests.
- **Strict Fallbacks**: If `internalURL()` detects non-HTML assets, wp-admin paths, or external origins, always let the native browser navigation take over.
- **Never Attach Listeners Inside Swapped Content**: Use top-level document event delegation so handlers persist across page swaps without memory leaks.
