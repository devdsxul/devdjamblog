<?php
if (!defined('ABSPATH')) exit;

$current_book = '我们是一个学习小组';
$current_id = 0;
if (is_singular('dj_chapter')) {
    $current_id = get_the_ID();
    $meta_book = (string) get_post_meta($current_id, '_dj_book_name', true);
    if ($meta_book !== '') {
        $current_book = $meta_book;
    }
} elseif (isset($_GET['book']) && is_string($_GET['book'])) {
    $req_book = sanitize_text_field(wp_unslash($_GET['book']));
    if ($req_book !== '') {
        $current_book = $req_book;
    }
}

$chapters = function_exists('devdjam_get_chapters') ? devdjam_get_chapters($current_book) : array();
$chapter_count = count($chapters);

// 确定当前章节：若是单个章节，获取其对象；若是归档或未指定，默认加载第一章
$current_chapter = null;
if ($current_id) {
    foreach ($chapters as $ch) {
        if ($ch['id'] === $current_id) {
            $current_chapter = $ch;
            break;
        }
    }
}
if (!$current_chapter && !empty($chapters)) {
    $current_chapter = $chapters[0];
}
if ($current_chapter && !empty($current_chapter['book_name'])) {
    $current_book = $current_chapter['book_name'];
}
$is_fired_book = ($current_book === '重生之我获得了被辞退就能加点的系统');
$book_title_display = '《' . $current_book . '》';

$current_num = $current_chapter ? $current_chapter['number'] : 1;
$current_title = $current_chapter ? $current_chapter['title'] : '';
$current_wc = $current_chapter ? $current_chapter['word_count'] : 0;
$current_date = $current_chapter ? $current_chapter['date'] : '';

// 计算上一章与下一章
$prev_chapter = null;
$next_chapter = null;
if ($current_chapter) {
    for ($i = 0; $i < $chapter_count; $i++) {
        if ($chapters[$i]['number'] === $current_chapter['number']) {
            if ($i > 0) $prev_chapter = $chapters[$i - 1];
            if ($i < $chapter_count - 1) $next_chapter = $chapters[$i + 1];
            break;
        }
    }
}

// 预计阅读时间（按每分钟约 600 字计算）
$read_time = $current_wc > 0 ? ceil($current_wc / 600) : 10;
?>
<div class="novel-fullscreen-overlay" id="novel-fullscreen-overlay">
    <!-- 背景半透明遮罩（点击可关闭全屏并返回桌面） -->
    <a href="<?php echo esc_url(dj_url('home')); ?>" class="novel-backdrop" id="novel-backdrop" data-nav="home" <?php echo dj_attr('aria-label', "close reader"); ?> <?php echo dj_attr('title', "return to desktop"); ?>></a>

    <!-- 弹出的全屏小说阅读窗口（Win98 风格全屏窗口） -->
    <section class="window novel-popup-window" id="novel-popup-window" role="dialog" aria-modal="true" <?php echo dj_attr('aria-label', "fullscreen reader"); ?>>
        <!-- Win98 风格窗口标题栏 -->
        <div class="title-bar novel-popup-title-bar">
            <div class="title-bar-text">
                <?php dj_gif('icon-book', 'title-icon', false); ?>
                <span class="novel-title-text">
                    <span class="series-name"><?php echo $is_fired_book ? dj_text("fired to level up") : dj_text("we're a study group"); ?> · <?php echo esc_html($book_title_display); ?></span>
                    <span class="title-sep">-</span>
                    <span class="chapter-name"><?php echo esc_html($current_title); ?></span>
                </span>
            </div>
            <div class="title-bar-controls">
                <a href="<?php echo esc_url(dj_url('home')); ?>" class="title-btn-min" data-nav="home" <?php echo dj_attr('aria-label', "return to desktop"); ?> <?php echo dj_attr('title', "return to desktop"); ?>></a>
                <button type="button" class="title-btn-max" id="novel-toggle-fullscreen" <?php echo dj_attr('aria-label', "fill viewport"); ?> <?php echo dj_attr('title', "fill viewport"); ?>></button>
                <a href="<?php echo esc_url(dj_url('home')); ?>" class="title-btn-close" data-nav="home" <?php echo dj_attr('aria-label', "close reader"); ?> <?php echo dj_attr('title', "close reader"); ?>></a>
            </div>
        </div>

        <!-- 窗口内容主体 -->
        <div class="window-body novel-popup-body">
            <div class="novel-reader-wrapper" id="novel-reader-app">
                <!-- 顶栏阅读控制栏与进度条 -->
                <div class="novel-control-bar">
                    <div class="novel-progress-strip" aria-hidden="true">
                        <div class="novel-progress-indicator" id="novel-progress-bar" style="width: 0%;"></div>
                    </div>
                    
                    <div class="novel-bar-left">
                        <span class="novel-badge"><?php echo dj_text("fullscreen reader"); ?></span>
                        <span class="novel-book-title-tag"><?php echo esc_html($book_title_display); ?></span>
                        <span class="novel-current-tag"><?php echo dj_text('chapter {number}', array('number' => $current_num)); ?></span>
                    </div>

                    <div class="novel-bar-center">
                        <span class="novel-read-progress-text" id="novel-progress-text"><?php echo dj_text('progress {percent}%', array('percent' => 0)); ?></span>
                    </div>

                    <div class="novel-bar-actions">
                        <button type="button" class="button novel-btn" id="novel-toggle-toc" aria-expanded="false" aria-controls="novel-toc-drawer" <?php echo dj_attr('title', "contents"); ?>>
                            <span class="btn-icon">☰</span>
                            <span class="btn-lbl"><?php echo dj_text("contents"); ?></span>
                        </button>
                        <button type="button" class="button novel-btn" id="novel-toggle-settings" aria-expanded="false" aria-controls="novel-settings-panel" <?php echo dj_attr('title', "reading settings"); ?>>
                            <span class="btn-icon">⚙</span>
                            <span class="btn-lbl"><?php echo dj_text("reading settings"); ?></span>
                        </button>
                        <?php if ($prev_chapter) : ?>
                            <a href="<?php echo esc_url($prev_chapter['url']); ?>" class="button novel-btn" <?php echo dj_attr('title', "previous chapter"); ?>><?php echo dj_text("previous chapter"); ?></a>
                        <?php else : ?>
                            <button type="button" class="button novel-btn" disabled><?php echo dj_text("previous chapter"); ?></button>
                        <?php endif; ?>
                        <?php if ($next_chapter) : ?>
                            <a href="<?php echo esc_url($next_chapter['url']); ?>" class="button novel-btn button-primary" <?php echo dj_attr('title', "next chapter"); ?>><?php echo dj_text("next chapter"); ?></a>
                        <?php endif; ?>
                        <a href="<?php echo esc_url(dj_url('home')); ?>" class="button novel-btn novel-exit-btn" data-nav="home" <?php echo dj_attr('title', "return to desktop"); ?>>
                            <span class="btn-icon">✕</span>
                            <span class="btn-lbl"><?php echo dj_text("return to desktop"); ?></span>
                        </a>
                    </div>
                </div>

                <!-- 阅读偏好设置面板（悬浮抽屉式，Win98 窗口风） -->
                <div class="novel-settings-popup" id="novel-settings-panel" hidden>
                    <div class="settings-popup-header">
                        <b><?php echo dj_text("reading settings"); ?></b>
                        <button type="button" class="settings-close-btn" id="novel-close-settings" <?php echo dj_attr('aria-label', "close settings"); ?>>×</button>
                    </div>
                    <div class="settings-popup-body">
                        <!-- 字号调节 -->
                        <div class="setting-row">
                            <span class="setting-label"><?php echo dj_text("font size"); ?></span>
                            <div class="setting-options" role="group" <?php echo dj_attr('aria-label', "font size"); ?>>
                                <button type="button" class="button btn-setting" data-novel-setting="size" data-val="15"><?php echo dj_text("small (15)"); ?></button>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="size" data-val="18"><?php echo dj_text("standard (18)"); ?></button>
                                <button type="button" class="button btn-setting" data-novel-setting="size" data-val="21"><?php echo dj_text("large (21)"); ?></button>
                                <button type="button" class="button btn-setting" data-novel-setting="size" data-val="25"><?php echo dj_text("extra large (25)"); ?></button>
                            </div>
                        </div>

                        <!-- 字体选择 -->
                        <div class="setting-row">
                            <span class="setting-label"><?php echo dj_text("font family"); ?></span>
                            <div class="setting-options" role="group" <?php echo dj_attr('aria-label', "font family"); ?>>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="font" data-val="serif"><?php echo dj_text("serif"); ?></button>
                                <button type="button" class="button btn-setting" data-novel-setting="font" data-val="sans"><?php echo dj_text("sans serif"); ?></button>
                                <button type="button" class="button btn-setting" data-novel-setting="font" data-val="mono"><?php echo dj_text("monospace"); ?></button>
                            </div>
                        </div>

                        <!-- 阅读主题配色 -->
                        <div class="setting-row">
                            <span class="setting-label"><?php echo dj_text("reading palette"); ?></span>
                            <div class="setting-options theme-palette" role="group" <?php echo dj_attr('aria-label', "reading palette"); ?>>
                                <button type="button" class="theme-chip theme-chip-win is-active" data-novel-setting="theme" data-val="win" <?php echo dj_attr('title', "retro grey"); ?>>
                                    <span><?php echo dj_text("retro"); ?></span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-paper" data-novel-setting="theme" data-val="paper" <?php echo dj_attr('title', "warm paper"); ?>>
                                    <span><?php echo dj_text("paper"); ?></span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-mint" data-novel-setting="theme" data-val="mint" <?php echo dj_attr('title', "soft mint"); ?>>
                                    <span><?php echo dj_text("mint"); ?></span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-white" data-novel-setting="theme" data-val="white" <?php echo dj_attr('title', "plain white"); ?>>
                                    <span><?php echo dj_text("white"); ?></span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-night" data-novel-setting="theme" data-val="night" <?php echo dj_attr('title', "night"); ?>>
                                    <span><?php echo dj_text("night"); ?></span>
                                </button>
                            </div>
                        </div>

                        <!-- 行距调节 -->
                        <div class="setting-row">
                            <span class="setting-label"><?php echo dj_text("line spacing"); ?></span>
                            <div class="setting-options" role="group" <?php echo dj_attr('aria-label', "line spacing"); ?>>
                                <button type="button" class="button btn-setting" data-novel-setting="line" data-val="compact"><?php echo dj_text("compact"); ?></button>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="line" data-val="normal"><?php echo dj_text("standard"); ?></button>
                                <button type="button" class="button btn-setting" data-novel-setting="line" data-val="relaxed"><?php echo dj_text("relaxed"); ?></button>
                            </div>
                        </div>

                        <!-- 版心宽度 -->
                        <div class="setting-row">
                            <span class="setting-label"><?php echo dj_text("reading width"); ?></span>
                            <div class="setting-options" role="group" <?php echo dj_attr('aria-label', "reading width"); ?>>
                                <button type="button" class="button btn-setting" data-novel-setting="width" data-val="narrow"><?php echo dj_text("narrow (680)"); ?></button>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="width" data-val="normal"><?php echo dj_text("standard (800)"); ?></button>
                                <button type="button" class="button btn-setting" data-novel-setting="width" data-val="wide"><?php echo dj_text("wide (960)"); ?></button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 章节目录抽屉（侧滑呼出） -->
                <div class="novel-toc-overlay" id="novel-toc-overlay" hidden></div>
                <aside class="novel-toc-drawer" id="novel-toc-drawer" <?php echo dj_attr('aria-label', "contents"); ?> hidden>
                    <div class="toc-header">
                        <div class="toc-title">
                            <b><?php echo dj_text("contents"); ?></b>
                            <span class="toc-sub"><?php echo esc_html($book_title_display); ?></span>
                        </div>
                        <button type="button" class="toc-close-btn" id="novel-close-toc" <?php echo dj_attr('aria-label', "close contents"); ?>>×</button>
                    </div>
                    <div class="toc-stats">
                        <span><?php echo dj_text($chapter_count === 1 ? '{count} chapter' : '{count} chapters', array('count' => $chapter_count)); ?></span>
                        <span><?php echo dj_text("serial in progress"); ?></span>
                    </div>
                    <div class="toc-list-wrap">
                        <ol class="toc-list">
                            <?php foreach ($chapters as $ch) : 
                                $is_curr = ($current_chapter && $ch['number'] === $current_chapter['number']);
                            ?>
                                <li class="toc-item <?php echo $is_curr ? 'is-current' : ''; ?>">
                                    <a href="<?php echo esc_url($ch['url']); ?>" class="toc-link">
                                        <span class="toc-num"><?php echo dj_text('chapter {number}', array('number' => $ch['number'])); ?></span>
                                        <span class="toc-name"><?php echo esc_html($ch['clean_title']); ?></span>
                                        <span class="toc-words"><?php echo dj_text('{count} characters', array('count' => number_format($ch['word_count']))); ?></span>
                                        <?php if ($is_curr) : ?>
                                            <span class="toc-curr-badge"><?php echo dj_text("current"); ?></span>
                                        <?php endif; ?>
                                    </a>
                                </li>
                            <?php endforeach; ?>
                        </ol>
                    </div>
                </aside>

                <!-- 小说主体阅读区域（支持滚动阅读与连续加载） -->
                <div class="novel-reader-body" id="novel-reader-viewport" data-novel-theme="win" data-novel-font="serif" data-font-size="18" data-novel-line="normal" data-novel-width="normal">
                    <div class="novel-container" id="novel-container">
                        <?php if ($current_chapter) : 
                            $post_obj = get_post($current_chapter['id']);
                            $content = $post_obj ? $post_obj->post_content : '';
                        ?>
                            <article class="novel-chapter" id="chapter-entry-<?php echo esc_attr((string) $current_num); ?>" data-chapter-number="<?php echo esc_attr((string) $current_num); ?>" data-chapter-title="<?php echo esc_attr($current_title); ?>">
                                <!-- 章节题头 -->
                                <header class="chapter-header">
                                    <div class="chapter-meta-tag">
                                        <span class="chapter-series"><?php echo dj_text("serial novel"); ?></span>
                                    </div>
                                    <h1 class="chapter-headline"><?php echo esc_html($current_title); ?></h1>
                                    <div class="chapter-info-bar">
                                        <span class="info-item"><i class="dot"></i><?php echo dj_text('{count} characters', array('count' => number_format($current_wc))); ?></span>
                                        <span class="info-item"><i class="dot"></i><?php echo dj_text('about {minutes} min read', array('minutes' => $read_time)); ?></span>
                                        <?php if ($current_date) : ?>
                                            <span class="info-item"><i class="dot"></i><?php echo dj_text('published:'); ?> <?php echo esc_html($current_date); ?></span>
                                        <?php endif; ?>
                                    </div>
                                </header>

                                <!-- 章节正文 -->
                                <div class="chapter-content prose-novel" id="novel-content-prose">
                                    <?php 
                                    $raw_content = (string) $content;
                                    if (!preg_match('/<p\b/i', $raw_content)) {
                                        $display_html = function_exists('devdjam_format_markdown_to_html') 
                                            ? devdjam_format_markdown_to_html($raw_content) 
                                            : wpautop($raw_content);
                                    } else {
                                        $display_html = $raw_content;
                                    }
                                    echo wp_kses_post($display_html); 
                                    ?>
                                </div>

                                <!-- 章节收尾与翻页导航 -->
                                <footer class="chapter-footer">
                                    <div class="chapter-end-decor" aria-hidden="true">
                                        <span class="decor-line"></span>
                                        <span class="decor-text"><?php echo dj_text("end of chapter"); ?></span>
                                        <span class="decor-line"></span>
                                    </div>

                                    <div class="chapter-nav-actions">
                                        <?php if ($prev_chapter) : ?>
                                            <a href="<?php echo esc_url($prev_chapter['url']); ?>" class="button nav-btn prev-btn">
                                                <span class="arrow">«</span> <?php echo dj_text('previous chapter'); ?>: <?php echo esc_html($prev_chapter['clean_title']); ?>
                                            </a>
                                        <?php else : ?>
                                            <span class="button nav-btn is-disabled"><?php echo dj_text("first chapter reached"); ?></span>
                                        <?php endif; ?>

                                        <button type="button" class="button nav-btn toc-trigger-btn" id="novel-open-toc-bottom">
                                            ☰ <?php echo dj_text('view all chapters'); ?>
                                        </button>

                                        <?php if ($next_chapter) : ?>
                                            <a href="<?php echo esc_url($next_chapter['url']); ?>" class="button button-primary nav-btn next-btn">
                                                <?php echo dj_text('next chapter'); ?>: <?php echo esc_html($next_chapter['clean_title']); ?> <span class="arrow">»</span>
                                            </a>
                                        <?php else : ?>
                                            <span class="button nav-btn is-disabled"><?php echo dj_text("more chapters coming soon"); ?></span>
                                        <?php endif; ?>
                                    </div>

                                    <?php if ($next_chapter) : ?>
                                        <div class="novel-scroll-next-trigger" data-next-url="<?php echo esc_url($next_chapter['url']); ?>" data-next-title="<?php echo esc_attr($next_chapter['title']); ?>" data-next-num="<?php echo esc_attr((string) $next_chapter['number']); ?>">
                                            <div class="scroll-next-card">
                                                <span class="scroll-next-icon">▼</span>
                                                <span class="scroll-next-text"><?php echo dj_text('continue to chapter {number}', array('number' => $next_chapter['number'])); ?></span>
                                                <a href="<?php echo esc_url($next_chapter['url']); ?>" class="scroll-next-link"><?php echo dj_text("next chapter"); ?></a>
                                            </div>
                                        </div>
                                    <?php endif; ?>
                                </footer>
                            </article>
                        <?php else : ?>
                            <div class="empty-novel">
                                <p><?php echo dj_text("no published chapters yet"); ?></p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>
