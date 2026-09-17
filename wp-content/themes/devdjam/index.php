<?php
if (!defined('ABSPATH')) exit;
$view = dj_view();
$nav = dj_nav();
$title = $view === '404' ? 'error' : (is_search() ? 'search' : $view);
$title_icon = $view === '404' ? 'icon-lost' : (is_search() ? 'icon-find' : 'icon-folder');
$latest = get_posts(array('post_type' => array('post', 'dj_music', 'dj_beat'), 'post_status' => 'publish', 'numberposts' => 1, 'fields' => 'ids'));
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
    <meta charset="<?php bloginfo('charset'); ?>">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="theme-color" content="#ffffff">
    <link rel="icon" href="<?php echo esc_url(get_template_directory_uri() . '/assets/favicon.svg'); ?>" type="image/svg+xml">
    <?php wp_head(); ?>
</head>
<body <?php body_class('dj-site'); ?>>
<?php wp_body_open(); ?>
<a class="skip-link" href="#site-content">skip to content</a>
<div class="top-lang" role="group" aria-label="Language">
    <?php dj_gif('icon-globe', 'top-lang-icon', false); ?>
    <button type="button" class="top-lang-btn" data-set-lang="en" aria-label="English">EN</button>
    <span class="top-lang-sep" aria-hidden="true">/</span>
    <button type="button" class="top-lang-btn" data-set-lang="zh" aria-label="中文">中文</button>
</div>
<div class="enter" data-enter>
    <div class="enter-stage">
        <!-- Neocities Retro Animated GIF Sparkles -->
        <div class="enter-decor-top" aria-hidden="true">
            <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/star-tiny.gif'); ?>" alt="" width="20" height="20">
            <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/star-purple-big.gif'); ?>" alt="" width="30" height="30">
            <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/star-tiny.gif'); ?>" alt="" width="20" height="20">
        </div>

        <div class="enter-typography">
            <div class="enter-lead">you are now</div>
            <div class="enter-action-line">
                <button type="button" class="enter-trigger" data-enter-trigger aria-label="entering">
                    <span class="enter-letters">
                        <span class="gothic-char" style="--char-i: 0;"><span class="char-back">e</span><span class="char-front">e</span></span>
                        <span class="gothic-char" style="--char-i: 1;"><span class="char-back">n</span><span class="char-front">n</span></span>
                        <span class="gothic-char" style="--char-i: 2;"><span class="char-back">t</span><span class="char-front">t</span></span>
                        <span class="gothic-char" style="--char-i: 3;"><span class="char-back">e</span><span class="char-front">e</span></span>
                        <span class="gothic-char" style="--char-i: 4;"><span class="char-back">r</span><span class="char-front">r</span></span>
                        <span class="gothic-char" style="--char-i: 5;"><span class="char-back">i</span><span class="char-front">i</span></span>
                        <span class="gothic-char" style="--char-i: 6;"><span class="char-back">n</span><span class="char-front">n</span></span>
                        <span class="gothic-char" style="--char-i: 7;"><span class="char-back">g</span><span class="char-front">g</span></span>
                    </span>
                </button>
            </div>
            <div class="enter-sub">devdjam's world</div>
        </div>

        <!-- Iconic Neocities Sparkling Glitter Line -->
        <div class="enter-glitter" aria-hidden="true">
            <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/glitter-line.gif'); ?>" alt="" width="360" height="12">
        </div>

        <!-- Classic Windows 98 / Cyber Segmented Progress Bar -->
        <div class="enter-bar" aria-hidden="true"><i></i></div>
    </div>
</div>
<header class="site-banner" role="banner">
    <div class="banner-wing banner-wing-left">
        <?php
        dj_sticker('dagger', 'spark', 'wiggle');
        dj_sticker('blood-drip', 'spark', 'pop');
        dj_sticker('eyeball-blood', 'spark', 'bounce');
        dj_sticker('eyeball', 'spark', 'spin');
        dj_sticker('skull', 'spark', 'bounce');
        dj_sticker('bat', 'spark', 'wiggle');
        ?>
    </div>
    <a class="site-banner-link" href="<?php echo esc_url(dj_url('home')); ?>" title="DEVDJAM">
        <div class="banner-stage">
            <!-- 4-pointed Chrome Star Sparkle (Top - Monochrome Silver) -->
            <div class="banner-star star-top" aria-hidden="true">
                <svg viewBox="0 0 32 52" fill="none">
                    <path d="M16 0 C16 18, 23 26, 32 26 C23 26, 16 34, 16 52 C16 34, 9 26, 0 26 C9 26, 16 18, 16 0 Z" fill="#ffffff" stroke="#111111" stroke-width="1.2"/>
                    <circle cx="16" cy="26" r="3" fill="#71717a"/>
                </svg>
            </div>

            <!-- 4-pointed Chrome Star Sparkle (Bottom - Monochrome Silver) -->
            <div class="banner-star star-bottom" aria-hidden="true">
                <svg viewBox="0 0 24 40" fill="none">
                    <path d="M12 0 C12 14, 17 20, 24 20 C17 20, 12 26, 12 40 C12 26, 7 20, 0 20 C7 20, 12 14, 12 0 Z" fill="#ffffff" stroke="#111111" stroke-width="1"/>
                    <circle cx="12" cy="20" r="2" fill="#a1a1aa"/>
                </svg>
            </div>

            <!-- The DEVDJAM Gothic Typography (Individual Interactive Letters) -->
            <h1 class="banner-letters" aria-label="DEVDJAM">
                <span class="gothic-char" style="--char-i: 0;"><span class="char-back">D</span><span class="char-front">D</span></span>
                <span class="gothic-char" style="--char-i: 1;"><span class="char-back">E</span><span class="char-front">E</span></span>
                <span class="gothic-char" style="--char-i: 2;"><span class="char-back">V</span><span class="char-front">V</span></span>
                <span class="gothic-char" style="--char-i: 3;"><span class="char-back">D</span><span class="char-front">D</span></span>
                <span class="gothic-char" style="--char-i: 4;"><span class="char-back">J</span><span class="char-front">J</span></span>
                <span class="gothic-char" style="--char-i: 5;"><span class="char-back">A</span><span class="char-front">A</span></span>
                <span class="gothic-char" style="--char-i: 6;"><span class="char-back">M</span><span class="char-front">M</span></span>
            </h1>
        </div>
    </a>
    <div class="banner-wing banner-wing-right">
        <?php
        dj_sticker('skull-chrome', 'spark', 'spin');
        dj_sticker('eyeball-winged', 'spark', 'wiggle');
        dj_sticker('eyeball-3d', 'spark', 'spin');
        dj_sticker('eyeball-cyber', 'fx', 'pop');
        dj_sticker('razor', 'spark', 'pop');
        dj_sticker('barbed-wire', 'spark', 'pop');
        ?>
    </div>
</header>
<div class="desk-layout">
<nav class="dock" aria-label="主导航">
    <a class="dock-logo" href="<?php echo esc_url(dj_url('home')); ?>"><?php dj_gif('icon-win', '', false); ?><b>DEVDJAM</b></a>
    <div class="dock-nav">
        <?php foreach ($nav as $key => $icon) : ?>
            <a href="<?php echo esc_url(dj_url($key)); ?>" data-nav="<?php echo esc_attr($key); ?>" <?php echo $view === $key ? 'aria-current="page"' : ''; ?>><?php dj_gif($icon, '', false); echo dj_text($key); ?></a>
        <?php endforeach; ?>
        <div class="dock-divider" aria-hidden="true"></div>
        <div class="dock-social">
            <a href="#" class="dock-social-link" data-social="spotify" target="_blank" rel="noopener noreferrer" title="Spotify" aria-label="Spotify">
                <svg class="social-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm4.586 14.424c-.18.295-.563.387-.857.207-2.35-1.436-5.308-1.76-8.793-.963-.335.077-.67-.133-.747-.468-.077-.335.132-.67.467-.747 3.809-.871 7.077-.502 9.723 1.115.294.18.387.562.207.856zm1.224-2.723c-.226.367-.708.482-1.075.257-2.69-1.653-6.79-2.131-9.971-1.165-.413.125-.849-.107-.974-.52-.125-.413.108-.849.52-.974 3.632-1.102 8.147-.568 11.243 1.327.367.226.482.708.257 1.075zm.105-2.835C14.692 8.95 9.375 8.775 6.297 9.71c-.494.15-1.016-.129-1.166-.623-.15-.495.129-1.017.623-1.167 3.532-1.072 9.404-.866 13.115 1.337.445.264.59.838.327 1.282-.264.444-.838.59-1.281.326z"/>
                </svg>
                <span>spotify</span>
            </a>
            <a href="#" class="dock-social-link" data-social="instagram" target="_blank" rel="noopener noreferrer" title="Instagram" aria-label="Instagram">
                <svg class="social-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                </svg>
                <span>instagram</span>
            </a>
            <a href="#" class="dock-social-link" data-social="tiktok" target="_blank" rel="noopener noreferrer" title="TikTok" aria-label="TikTok">
                <svg class="social-icon" width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1.04-.1z"/>
                </svg>
                <span>tiktok</span>
            </a>
        </div>
    </div>
    <div class="dock-foot">
        <a href="<?php echo esc_url(admin_url('admin.php?page=devdjam')); ?>" data-full-navigation><?php dj_gif('icon-key', '', false); echo dj_text('admin'); ?></a>
        <span class="dock-now"><?php dj_gif('led', 'tray-led', false); ?><span data-tray-title>stopped</span></span>
        <span class="dock-clock" data-clock>--:--</span>
    </div>
</nav>
<div class="desk">
    <aside class="col col-left">
        <?php dj_window_open('visitors', 'win-visitors', 'icon-note'); ?>
            <div class="visitors-box">
                <div class="visitors-row">
                    <span><?php echo dj_text('visitors'); ?>:</span>
                    <b class="odometer" data-hits>------</b>
                </div>
                <?php if ($latest) : ?>
                    <div class="visitors-row visitors-sub">
                        <span><?php echo dj_text('last updated'); ?>: <time datetime="<?php echo esc_attr(get_the_date('c', $latest[0])); ?>"><?php echo esc_html(get_the_date('y.m.d', $latest[0])); ?></time></span>
                    </div>
                <?php endif; ?>
            </div>
        <?php dj_window_close(); ?>
        <?php dj_window_open('dj deck', 'win-player', 'icon-dj'); ?>
            <?php get_template_part('parts/player'); ?>
        <?php dj_window_close(); ?>
    </aside>
    <div class="col col-main">
        <?php dj_window_open($title, 'win-content', $title_icon); ?>
            <main id="site-content" tabindex="-1" data-view="<?php echo esc_attr($view); ?>" data-title="<?php echo esc_attr($title); ?>">
                <?php
                if (is_404()) get_template_part('views/not-found');
                elseif (is_front_page()) get_template_part('views/home');
                elseif (is_singular()) get_template_part('views/single');
                else get_template_part('views/archive');
                ?>
            </main>
        <?php dj_window_close(); ?>
    </div>
    <aside class="col col-right">
        <?php dj_window_open('calendar', 'win-calendar', 'icon-calendar'); ?>
            <div class="calendar"><?php get_calendar(); ?></div>
        <?php dj_window_close(); ?>
    </aside>
</div>
</div>
<div class="desk-dim" data-dim hidden></div>
<div class="navigation-status screen-reader-text" role="status" aria-live="polite"></div>
<?php wp_footer(); ?>
</body>
</html>
