<?php
if (!defined('ABSPATH')) exit;

$latest_posts = get_posts(array(
    'post_type' => 'post',
    'post_status' => 'publish',
    'numberposts' => 1,
));
$featured = !empty($latest_posts) ? $latest_posts[0] : null;
?>
<div class="home-seamless">
    <!-- 上方：文章区域（封面在左侧，正方形，上下不留空，右侧标题、换行、内容预览） -->
    <article class="home-hero">
        <div class="home-hero-cover">
            <?php if ($featured && has_post_thumbnail($featured)) : ?>
                <a href="<?php echo esc_url(get_permalink($featured)); ?>">
                    <?php echo get_the_post_thumbnail($featured, 'large', array('loading' => 'lazy')); ?>
                </a>
            <?php else : ?>
                <div class="hero-cover-blank" aria-hidden="true">
                    <span class="blank-tag">PLAY &blacktriangleright;</span>
                    <span class="blank-text">ARTICLE</span>
                    <span class="blank-advisory">PARENTAL ADVISORY</span>
                </div>
            <?php endif; ?>
        </div>
        <div class="home-hero-info">
            <h2 class="home-hero-title">
                <?php if ($featured) : ?>
                    <a href="<?php echo esc_url(get_permalink($featured)); ?>"><?php echo esc_html(get_the_title($featured)); ?></a>
                <?php else : ?>
                    <span><?php echo dj_text('nothing here yet'); ?></span>
                <?php endif; ?>
            </h2>
            <time class="home-hero-date" datetime="<?php echo $featured ? esc_attr(get_the_date('c', $featured)) : esc_attr(date('c')); ?>"><?php echo $featured ? esc_html(get_the_date('Y.m.d', $featured)) : esc_html(date('Y.m.d')); ?></time>
            <hr class="home-hero-sep" aria-hidden="true">
            <div class="home-hero-preview">
                <?php
                if ($featured && has_excerpt($featured)) {
                    echo esc_html(get_the_excerpt($featured));
                } elseif ($featured && $featured->post_content) {
                    echo esc_html(wp_trim_words(strip_shortcodes($featured->post_content), 40, '...'));
                } else {
                    echo '<p>' . dj_text('no entries yet') . '</p>';
                }
                ?>
            </div>
            <?php if ($featured) : ?>
                <div class="home-hero-action">
                    <a class="button" href="<?php echo esc_url(get_permalink($featured)); ?>"><?php echo dj_text('read >>'); ?></a>
                </div>
            <?php endif; ?>
        </div>
    </article>

    <!-- 下方：两块区域，左侧为专辑，右侧为 beats，统一框起来 -->
    <div class="home-bottom-pane">
        <div class="home-split">
            <section class="home-pane home-pane-music" aria-label="music">
                <?php
                $recent_music = get_posts(array(
                    'post_type' => 'dj_music',
                    'post_status' => 'publish',
                    'numberposts' => 4,
                    'orderby' => 'date',
                    'order' => 'DESC',
                ));
                if (!empty($recent_music)) :
                ?>
                    <ul class="home-entry-list">
                        <?php foreach ($recent_music as $music) :
                            $has_thumb = has_post_thumbnail($music);
                            $thumb_url = $has_thumb ? (get_the_post_thumbnail_url($music, 'medium') ?: get_the_post_thumbnail_url($music, 'thumbnail')) : devdjam_default_cover_url();
                            $music_url = get_permalink($music);
                        ?>
                            <li class="home-beat-item">
                                <div class="entry-thumb">
                                    <a href="<?php echo esc_url($music_url); ?>" aria-label="<?php echo esc_attr(get_the_title($music)); ?>">
                                        <img src="<?php echo esc_url($thumb_url); ?>" alt="" loading="lazy">
                                    </a>
                                </div>
                                <div class="entry-meta-wrap">
                                    <span class="entry-name"><a href="<?php echo esc_url($music_url); ?>"><?php echo esc_html(get_the_title($music)); ?></a></span>
                                    <div class="entry-sub">
                                        <time class="entry-time" datetime="<?php echo esc_attr(get_the_date('c', $music)); ?>"><?php echo esc_html(get_the_date('Y.m.d', $music)); ?></time>
                                    </div>
                                </div>
                                <div class="entry-action">
                                    <?php dj_track_button($music->ID); ?>
                                </div>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php else : ?>
                    <div class="home-music-blank" aria-hidden="true">
                        <img class="gif" src="<?php echo esc_url(get_template_directory_uri() . '/assets/gif/cd.gif'); ?>" alt="" width="34" height="34">
                        <span class="home-music-blank-tag">ASTRO LOUNGE</span>
                        <span class="home-music-blank-sub">TAPES // COMING SOON</span>
                    </div>
                <?php endif; ?>
            </section>

            <section class="home-pane home-pane-beats" aria-label="beats">
                <?php
                $recent_beats = get_posts(array(
                    'post_type' => 'dj_beat',
                    'post_status' => 'publish',
                    'numberposts' => 4,
                    'orderby' => 'date',
                    'order' => 'DESC',
                ));
                if (!empty($recent_beats)) :
                ?>
                    <ul class="home-entry-list">
                        <?php foreach ($recent_beats as $beat) :
                            $bpm = absint(get_post_meta($beat->ID, '_dj_bpm', true));
                            $key = get_post_meta($beat->ID, '_dj_key', true);
                            $has_thumb = has_post_thumbnail($beat);
                            $thumb_url = $has_thumb ? (get_the_post_thumbnail_url($beat, 'medium') ?: get_the_post_thumbnail_url($beat, 'thumbnail')) : devdjam_default_cover_url();
                            $beat_url = get_post_type_archive_link('dj_beat') ?: home_url('/beats/');
                        ?>
                            <li class="home-beat-item">
                                <div class="entry-thumb">
                                    <a href="<?php echo esc_url($beat_url); ?>" aria-label="<?php echo esc_attr(get_the_title($beat)); ?>">
                                        <img src="<?php echo esc_url($thumb_url); ?>" alt="" loading="lazy">
                                    </a>
                                </div>
                                <div class="entry-meta-wrap">
                                    <span class="entry-name"><a href="<?php echo esc_url($beat_url); ?>"><?php echo esc_html(get_the_title($beat)); ?></a></span>
                                    <div class="entry-sub">
                                        <?php if ($bpm) : ?><span><?php echo esc_html((string) $bpm); ?> BPM</span><?php endif; ?>
                                        <?php if ($key) : ?><span><?php echo esc_html($key); ?></span><?php endif; ?>
                                        <time class="entry-time" datetime="<?php echo esc_attr(get_the_date('c', $beat)); ?>"><?php echo esc_html(get_the_date('Y.m.d', $beat)); ?></time>
                                    </div>
                                </div>
                                <div class="entry-action">
                                    <?php dj_beat_button($beat->ID); ?>
                                </div>
                            </li>
                        <?php endforeach; ?>
                    </ul>
                <?php else : ?>
                    <?php dj_empty('no beats yet', 'cassette'); ?>
                <?php endif; ?>
            </section>
        </div>
    </div>
</div>
