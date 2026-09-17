<?php if (!defined('ABSPATH')) exit; ?>
<div class="not-found">
    <?php dj_gif('construction'); ?>
    <p class="error-code">404</p>
    <a class="button" href="<?php echo esc_url(dj_url('home')); ?>"><?php echo dj_text('ok'); ?></a>
</div>
