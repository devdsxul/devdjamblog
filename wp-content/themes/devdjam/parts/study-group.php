<?php
if (!defined('ABSPATH')) exit;
$study_books = array(
    array(
        'book_name' => '我们是一个学习小组',
        'title_display' => '《我们是一个学习小组》',
        'is_second' => false,
    ),
    array(
        'book_name' => '重生之我获得了被辞退就能加点的系统',
        'title_display' => '《重生之我获得了被辞退就能加点的系统》',
        'is_second' => true,
    ),
);
?>
<div class="study-group-box">
    <?php foreach ($study_books as $book_item) :
        $b_name = $book_item['book_name'];
        $b_chapters = function_exists('devdjam_get_chapters') ? devdjam_get_chapters($b_name) : array();
        $b_count = count($b_chapters);
        $b_first = !empty($b_chapters) ? $b_chapters[0] : null;
        $b_url = $b_first ? $b_first['url'] : add_query_arg('book', rawurlencode($b_name), home_url('/novel/'));
    ?>
    <a href="<?php echo esc_url($b_url); ?>" class="study-group-link" <?php echo dj_attr('title', "read our novel"); ?> <?php echo dj_attr('aria-label', "read chapter 1"); ?>>
        <div class="study-group-badge-line">
            <span class="study-tag"><?php echo $book_item['is_second'] ? dj_text("new") : dj_text("novel"); ?></span>
            <span class="study-status-dot" aria-hidden="true"></span>
            <span class="study-ch-badge"><?php echo dj_text("chapter {number}", array('number' => 1)); ?></span>
        </div>
        
        <div class="study-group-typography">
            <div class="study-group-big"><?php echo $book_item['is_second'] ? dj_text("fired to level up") : dj_text("we're a study group"); ?></div>
            <div class="study-group-small">
                <span><?php echo dj_text("read our novel"); ?></span>
                <span class="study-arrow" aria-hidden="true">→</span>
            </div>
        </div>

        <div class="study-group-divider" aria-hidden="true">
            <i></i>
        </div>

        <div class="study-group-book-info">
            <div class="study-book-title"><?php echo esc_html($book_item['title_display']); ?></div>
            <?php if ($b_first) : ?>
                <div class="study-chapter-snippet">
                    <span class="snippet-label"><?php echo dj_text("first chapter:"); ?></span>
                    <span class="snippet-title"><?php echo esc_html($b_first['clean_title']); ?></span>
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
            <span class="study-group-count"><?php echo dj_text($b_count === 1 ? '{count} chapter' : '{count} chapters', array('count' => $b_count)); ?></span>
        </div>
    </a>
    <?php endforeach; ?>
</div>
