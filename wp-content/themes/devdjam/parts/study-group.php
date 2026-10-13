<?php
if (!defined('ABSPATH')) exit;
$first_chapter_url = function_exists('devdjam_get_first_chapter_url') ? devdjam_get_first_chapter_url() : home_url('/novel/');
$chapters = function_exists('devdjam_get_chapters') ? devdjam_get_chapters() : array();
$chapter_count = count($chapters);
$first_chapter = !empty($chapters) ? $chapters[0] : null;
?>
<div class="study-group-box">
    <a href="<?php echo esc_url($first_chapter_url); ?>" class="study-group-link" title="We're a study group — Read our novel" aria-label="We're a study group, read our novel. Click to enter Chapter 1.">
        <div class="study-group-badge-line">
            <span class="study-tag">NOVEL</span>
            <span class="study-status-dot" aria-hidden="true"></span>
            <span class="study-ch-badge">CH.01</span>
        </div>
        
        <div class="study-group-typography">
            <div class="study-group-big">we're a study group</div>
            <div class="study-group-small">
                <span>read our novel</span>
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
                    <span class="snippet-label">第一章:</span>
                    <span class="snippet-title"><?php echo esc_html($first_chapter['clean_title']); ?></span>
                </div>
            <?php else : ?>
                <div class="study-chapter-snippet">
                    <span class="snippet-title">连载中 · 滚动阅读</span>
                </div>
            <?php endif; ?>
        </div>

        <div class="study-group-action-row">
            <span class="study-group-enter-btn">
                <span class="btn-shine"></span>
                <span class="btn-text">READ CH.01</span>
                <span class="btn-icon">»</span>
            </span>
            <span class="study-group-count"><?php echo $chapter_count > 0 ? '已更 ' . esc_html((string) $chapter_count) . ' 章' : 'NEW'; ?></span>
        </div>
    </a>
</div>
