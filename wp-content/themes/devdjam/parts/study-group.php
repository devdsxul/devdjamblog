<?php
if (!defined('ABSPATH')) exit;
$first_chapter_url = function_exists('devdjam_get_first_chapter_url') ? devdjam_get_first_chapter_url() : home_url('/novel/');
$chapters = function_exists('devdjam_get_chapters') ? devdjam_get_chapters() : array();
$chapter_count = count($chapters);
$first_chapter = !empty($chapters) ? $chapters[0] : null;
?>
<div class="study-group-box">
    <a href="<?php echo esc_url($first_chapter_url); ?>" class="study-group-link" <?php echo dj_attr('title', "read our novel"); ?> <?php echo dj_attr('aria-label', "read chapter 1"); ?>>
        <div class="study-group-badge-line">
            <span class="study-tag"><?php echo dj_text("novel"); ?></span>
            <span class="study-status-dot" aria-hidden="true"></span>
            <span class="study-ch-badge"><?php echo dj_text("chapter {number}", array('number' => 1)); ?></span>
        </div>
        
        <div class="study-group-typography">
            <div class="study-group-big"><?php echo dj_text("we're a study group"); ?></div>
            <div class="study-group-small">
                <span><?php echo dj_text("read our novel"); ?></span>
                <span class="study-arrow" aria-hidden="true">→</span>
            </div>
        </div>

        <div class="study-group-divider" aria-hidden="true">
            <i></i>
        </div>

        <div class="study-group-book-info">
            <div class="study-book-title">《我们是一个学习小组》</div>
            <?php if ($first_chapter) : ?>
                <div class="study-chapter-snippet">
                    <span class="snippet-label"><?php echo dj_text("first chapter:"); ?></span>
                    <span class="snippet-title"><?php echo esc_html($first_chapter['clean_title']); ?></span>
                </div>
            <?php else : ?>
                <div class="study-chapter-snippet">
                    <span class="snippet-title"><?php echo dj_text("serial in progress"); ?></span>
                </div>
            <?php endif; ?>
        </div>

        <div class="study-group-action-row">
            <span class="study-group-enter-btn">
                <span class="btn-shine"></span>
                <span class="btn-text"><?php echo dj_text("read chapter 1"); ?></span>
                <span class="btn-icon">»</span>
            </span>
            <span class="study-group-count"><?php echo dj_text($chapter_count === 1 ? '{count} chapter' : '{count} chapters', array('count' => $chapter_count)); ?></span>
        </div>
    </a>
</div>
