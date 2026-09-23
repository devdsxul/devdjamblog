<?php
if (!defined('ABSPATH')) exit;
$view = dj_view();
$is_track_view = !is_search() && ($view === 'beats' || $view === 'music');
?>
<div class="page-breadcrumb"><a href="<?php echo esc_url(dj_url('home')); ?>"><?php echo dj_text('home'); ?></a><span>\</span><span><?php echo is_search() ? dj_text('search') . ': ' . esc_html(get_search_query()) : dj_text($view); ?></span></div>
<?php if (have_posts()) : ?>
    <?php if ($is_track_view) : ?>
        <ul class="home-entry-list archive-track-list">
        <?php while (have_posts()) : the_post();
            $track_id = get_the_ID();
            $bpm = absint(get_post_meta($track_id, '_dj_bpm', true));
            $key = get_post_meta($track_id, '_dj_key', true);
            $has_thumb = has_post_thumbnail($track_id);
            $thumb_url = $has_thumb ? get_the_post_thumbnail_url($track_id, 'thumbnail') : devdjam_default_cover_url();
        ?>
            <li class="home-beat-item">
                <div class="entry-thumb">
                    <?php
                    $cover_link = ($view === 'music') ? get_permalink($track_id) : (get_post_type_archive_link('dj_beat') ?: home_url('/beats/'));
                    ?>
                    <a href="<?php echo esc_url($cover_link); ?>" aria-label="<?php the_title_attribute(); ?>">
                        <img src="<?php echo esc_url($thumb_url); ?>" alt="<?php the_title_attribute(); ?>" loading="lazy">
                    </a>
                </div>
                <div class="entry-meta-wrap">
                    <span class="entry-name">
                        <?php if ($view === 'music') : ?>
                            <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                        <?php else : ?>
                            <?php the_title(); ?>
                        <?php endif; ?>
                    </span>
                    <div class="entry-sub">
                        <?php if ($bpm) : ?><span><?php echo esc_html((string) $bpm); ?> BPM</span><?php endif; ?>
                        <?php if ($key) : ?><span><?php echo esc_html($key); ?></span><?php endif; ?>
                        <time class="entry-time" datetime="<?php echo esc_attr(get_the_date('c', $track_id)); ?>"><?php echo esc_html(get_the_date('Y.m.d', $track_id)); ?></time>
                    </div>
                </div>
                <div class="entry-action">
                    <?php dj_track_button($track_id); ?>
                </div>
            </li>
        <?php endwhile; ?>
        </ul>
    <?php else : ?>
        <div class="archive-list">
        <?php while (have_posts()) : the_post(); ?>
            <article class="entry-card">
                <?php if (has_post_thumbnail()) : ?>
                    <a class="entry-cover" href="<?php the_permalink(); ?>"><?php the_post_thumbnail('medium_large', array('loading' => 'lazy')); ?></a>
                <?php endif; ?>
                <div class="entry-copy">
                    <div class="entry-meta">
                        <span class="entry-author"><span class="entry-author-label"><?php echo dj_text('author'); ?>:</span> <?php the_author(); ?></span>
                        <time datetime="<?php echo esc_attr(get_the_date('c')); ?>"><?php echo esc_html(get_the_date('Y.m.d')); ?></time>
                    </div>
                    <h3><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h3>
                    <?php if (has_excerpt() || get_the_content()) : ?>
                        <p><?php echo esc_html(wp_trim_words(wp_strip_all_tags(get_the_excerpt()), 36)); ?></p>
                    <?php endif; ?>
                    <a class="button" href="<?php the_permalink(); ?>"><?php echo dj_text('read >>'); ?></a>
                </div>
            </article>
        <?php endwhile; ?>
        </div>
    <?php endif; ?>
    <nav class="pagination" aria-label="内容分页"><?php echo wp_kses_post(paginate_links(array('prev_text' => '<<', 'next_text' => '>>'))); ?></nav>
<?php else : ?>
    <?php dj_empty($view === 'beats' ? 'no beats yet' : ($view === 'music' ? 'no music yet' : 'nothing here yet'), $view === 'beats' ? 'cassette' : ($view === 'music' ? 'cd' : 'boombox')); ?>
<?php endif; ?>
