<?php if (!defined('ABSPATH')) exit; while (have_posts()) : the_post(); $view = dj_view(); $is_page = get_post_type() === 'page'; ?>
<div class="page-breadcrumb"><a href="<?php echo esc_url(dj_url('home')); ?>"><?php echo dj_text('home'); ?></a><span>\</span><?php if (!$is_page) : ?><a href="<?php echo esc_url(dj_url($view)); ?>"><?php echo dj_text($view); ?></a><span>\</span><?php endif; ?><span><?php the_title(); ?></span></div>
<article class="single-entry">
    <header class="entry-header">
        <h2><?php the_title(); ?></h2>
        <?php if (!$is_page) : ?><div class="entry-meta"><time datetime="<?php echo esc_attr(get_the_date('c')); ?>"><?php echo esc_html(get_the_date('Y.m.d')); ?></time><?php the_tags('', ' ', ''); ?></div><?php endif; ?>
    </header>
    <?php if (post_password_required()) : echo get_the_password_form();
    else : ?>
        <div class="prose"><?php if (trim(get_the_content()) !== '') : the_content(); wp_link_pages();
        elseif ($is_page && $view !== 'guestbook') : dj_empty();
        endif; ?></div>
    <?php endif; ?>
    <?php if (comments_open() || get_comments_number()) comments_template(); ?>
    <footer class="entry-footer"><a class="button" href="<?php echo esc_url(dj_url($is_page ? 'home' : $view)); ?>"><?php echo dj_text('<< back'); ?></a></footer>
</article>
<?php endwhile; ?>
