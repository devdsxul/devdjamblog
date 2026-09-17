<?php
if (!defined('ABSPATH')) {
    exit;
}

add_action('after_setup_theme', static function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('responsive-embeds');
    add_theme_support('html5', array('search-form', 'gallery', 'caption', 'style', 'script'));
    add_theme_support('automatic-feed-links');
});

add_action('wp_enqueue_scripts', static function () {
    $base = get_template_directory_uri() . '/assets/';
    wp_enqueue_style('devdjam-98', $base . '98/98.css', array(), '0.1.20');
    wp_enqueue_style('devdjam', $base . 'site.css', array('devdjam-98'), '3.0.0');
    wp_enqueue_script('devdjam', $base . 'site.js', array(), '3.0.0', true);
    wp_add_inline_script('devdjam', 'window.DEVDJAM = ' . wp_json_encode(array(
        'tracksUrl' => rest_url('devdjam/v1/tracks'),
        'hitsUrl' => rest_url('devdjam/v1/hits'),
        'homeUrl' => home_url('/'),
        'siteName' => get_bloginfo('name'),
    )) . ';', 'before');
});

// 首屏前读取本地保存的语言与配色，避免闪烁。
add_action('wp_head', static function () {
    echo '<script>try{var l=localStorage.getItem("dj-lang"),t=localStorage.getItem("dj-theme"),d=document.documentElement;if(l)d.dataset.lang=l;if(t)d.dataset.theme=t;d.lang=l==="zh"?"zh-CN":"en";if(!sessionStorage.getItem("dj-entered"))d.dataset.gate="1";}catch(e){}</script>';
}, 1);

// 界面文案：英文原文作为键，JS 字典负责切换中文。
function dj_text($key) {
    return '<span data-i18n="' . esc_attr($key) . '">' . esc_html($key) . '</span>';
}

// GifCities 动图的原始尺寸，输出 width/height 避免布局抖动。
function dj_gif($name, $class = '', $lazy = true) {
    static $sizes = array(
        'best' => array(88, 31), 'boombox' => array(150, 100), 'cassette' => array(166, 101), 'cd' => array(82, 82),
        'clef' => array(90, 80), 'clouds' => array(120, 120), 'computer' => array(125, 115), 'construction' => array(339, 258),
        'fire-line' => array(496, 24), 'glitter-line' => array(450, 31), 'headphones' => array(96, 96), 'hot' => array(80, 80), 'icon-cassette' => array(32, 32), 'icon-cd' => array(32, 32),
        'icon-computer' => array(32, 39), 'icon-home' => array(28, 28), 'icon-note-small' => array(24, 24),
        'icon-note' => array(35, 35), 'icon-win' => array(32, 32), 'led' => array(14, 14), 'moon' => array(64, 72),
        'new' => array(62, 40), 'rainbow' => array(180, 70), 'speaker' => array(85, 85), 'star-purple-big' => array(52, 46),
        'star-tiny' => array(15, 15), 'turntable' => array(160, 120),
        'welcome' => array(184, 110), 'icon-folder' => array(30, 32), 'icon-find' => array(71, 75), 'icon-lost' => array(64, 48),
        'skull-chrome' => array(99, 63), 'eyeball-3d' => array(60, 60), 'dagger' => array(64, 80), 'anarchy' => array(58, 58),
        'biohazard' => array(62, 60), 'gargoyle-bat' => array(150, 150), 'alien-glow' => array(100, 100), 'barbed-wire' => array(72, 72),
        'blood-drip' => array(48, 54), 'razor' => array(56, 36), 'bat' => array(72, 45), 'skull' => array(72, 72), 'eyeball' => array(60, 60),
        'eyeball-blood' => array(64, 64), 'eyeball-winged' => array(88, 50), 'eyeball-cyber' => array(60, 60),
        'arrow-play' => array(64, 32), 'book' => array(146, 120), 'dj' => array(142, 125), 'icon-book' => array(60, 49), 'icon-calendar' => array(50, 50), 'icon-dj' => array(50, 46), 'icon-globe' => array(30, 30), 'icon-key' => array(100, 100), 'icon-links' => array(106, 105), 'icon-palette' => array(34, 33), 'icon-pencil' => array(27, 25), 'icon-search' => array(50, 50), 'mic' => array(145, 145), 'pencil' => array(62, 141),
    );
    $size = $sizes[$name] ?? array(0, 0);
    echo '<img class="gif ' . esc_attr($class) . '" src="' . esc_url(get_template_directory_uri() . '/assets/gif/' . $name . '.gif') . '"'
        . ($size[0] ? ' width="' . $size[0] . '" height="' . $size[1] . '"' : '')
        . ' alt="" aria-hidden="true"' . ($lazy ? ' loading="lazy"' : '') . '>';
}

function dj_url($view) {
    if ($view === 'home') {
        return home_url('/');
    }
    if ($view === 'music' || $view === 'beats') {
        return get_post_type_archive_link($view === 'music' ? 'dj_music' : 'dj_beat') ?: home_url('/' . $view . '/');
    }
    $page = get_page_by_path($view);
    return $page ? get_permalink($page) : home_url('/' . $view . '/');
}

function dj_view() {
    if (is_front_page()) return 'home';
    if (is_home()) return 'blog';
    if (is_post_type_archive('dj_music') || is_singular('dj_music')) return 'music';
    if (is_post_type_archive('dj_beat') || is_singular('dj_beat')) return 'beats';
    if (is_page('links')) return 'links';
    if (is_page('about')) return 'about';
    if (is_page('guestbook')) return 'guestbook';
    if (is_404()) return '404';
    return 'blog';
}

function dj_nav() {
    return array(
        'home' => 'icon-home', 'music' => 'icon-cd', 'beats' => 'icon-cassette',
        'blog' => 'icon-note-small', 'links' => 'icon-links', 'about' => 'icon-palette', 'guestbook' => 'icon-book',
    );
}

// 播放器控制图标（SVG），其余装饰全部使用 GIF。
function dj_icon($name) {
    $paths = array(
        'play' => '<path d="m7 3 14 9-14 9Z"/>',
        'pause' => '<path d="M6 4h4v16H6Zm8 0h4v16h-4Z"/>',
        'prev' => '<path d="M4 5h2v14H4Zm15 0L7 12l12 7Z"/>',
        'next' => '<path d="M18 5h2v14h-2ZM5 5l12 7-12 7Z"/>',
    );
    echo '<svg class="icon" width="12" height="12" viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">' . ($paths[$name] ?? '') . '</svg>';
}

// Win98 窗口外壳：标题栏 + 内容区。data-window 供最小化/最大化/关闭状态使用。
function dj_window_open($title, $class = '', $icon = '') {
    $id = preg_replace('/^win-/', '', $class);
    echo '<section class="window ' . esc_attr($class) . '" data-window="' . esc_attr($id) . '"><div class="title-bar"><div class="title-bar-text">';
    if ($icon) dj_gif($icon, 'title-icon', false);
    echo dj_text($title) . '</div><div class="title-bar-controls">'
        . '<button type="button" aria-label="Minimize" data-window-action="min"></button>'
        . '<button type="button" aria-label="Maximize" data-window-action="max"></button></div></div><div class="window-body">';
}

// 可点击贴纸：data-sticker 是点击动作，data-anim 是动效名。
function dj_sticker($gif, $action, $anim = 'pop', $class = '') {
    echo '<button type="button" class="sticker ' . esc_attr($class) . '" data-sticker="' . esc_attr($action) . '" data-sticker-id="' . esc_attr($gif) . '" data-anim="' . esc_attr($anim) . '" aria-label="' . esc_attr($action) . '">';
    dj_gif($gif);
    echo '</button>';
}

// 关闭窗口；$stickers 为贴在窗口角上的贴纸：array(gif, 动作, 动效, 位置 at-tl/at-tr/at-bl/at-br)
function dj_window_close($stickers = array()) {
    echo '</div>';
    foreach ($stickers as $sticker) dj_sticker($sticker[0], $sticker[1], $sticker[2], $sticker[3]);
    echo '</section>';
}

function dj_empty($text = 'nothing here yet', $gif = 'construction') {
    echo '<div class="empty">';
    dj_gif($gif);
    echo '<p>' . dj_text($text) . '</p></div>';
}

function dj_recent($type, $count = 5) {
    return new WP_Query(array('post_type' => $type, 'post_status' => 'publish', 'has_password' => false,
        'posts_per_page' => $count, 'no_found_rows' => true, 'ignore_sticky_posts' => true));
}

function dj_post_rows($query) {
    echo '<ul class="post-rows">';
    while ($query->have_posts()) {
        $query->the_post();
        $fresh = (time() - get_post_time('U', true)) < 7 * DAY_IN_SECONDS;
        echo '<li><time datetime="' . esc_attr(get_the_date('c')) . '">' . esc_html(get_the_date('y.m.d')) . '</time>';
        echo '<a href="' . esc_url(get_permalink()) . '">' . esc_html(get_the_title()) . '</a>';
        if ($fresh) dj_gif('new', 'new-badge');
        echo '</li>';
    }
    echo '</ul>';
    wp_reset_postdata();
}

function dj_track_button($id, $label = 'play') {
    $title = get_the_title($id);
    echo '<button class="track-button" type="button" data-track-id="' . esc_attr((string) $id) . '" data-track-title="' . esc_attr($title) . '" aria-label="播放 ' . esc_attr($title) . '">';
    echo '<span class="track-btn-icon">';
    echo '<span data-play-icon>'; dj_icon('play'); echo '</span>';
    echo '<span data-pause-icon hidden>'; dj_icon('pause'); echo '</span>';
    echo '</span>';
    echo '<span class="track-btn-label">' . dj_text($label) . '</span>';
    echo '</button>';
}

function dj_beat_button($id, $label = 'play') {
    dj_track_button($id, $label);
}

function devdjam_default_cover_url() {
    return get_template_directory_uri() . '/assets/img/astro-cassette.png';
}

// 留言簿单条留言的 Win98 样式。
function dj_comment($comment, $args, $depth) {
    echo '<li id="comment-' . esc_attr((string) $comment->comment_ID) . '" class="guest-entry">';
    echo '<div class="guest-head"><b>' . esc_html(get_comment_author($comment)) . '</b><time datetime="' . esc_attr(get_comment_date('c', $comment)) . '">' . esc_html(get_comment_date('Y.m.d', $comment)) . '</time></div>';
    echo '<div class="guest-body">' . wp_kses_post(get_comment_text($comment)) . '</div>';
    if ($comment->comment_approved === '0') echo '<p class="guest-pending">' . dj_text('awaiting approval') . '</p>';
    echo '</li>';
}

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

// Beat 仅作列表展示，不提供独立单曲详情页，访问单曲 URL 自动 301 重定向至 Beat 列表。
add_action('template_redirect', static function () {
    if (is_singular('dj_beat')) {
        wp_safe_redirect(get_post_type_archive_link('dj_beat') ?: home_url('/beats/'), 301);
        exit;
    }
});

