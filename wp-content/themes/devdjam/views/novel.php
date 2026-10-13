<?php
if (!defined('ABSPATH')) exit;

$chapters = function_exists('devdjam_get_chapters') ? devdjam_get_chapters() : array();
$chapter_count = count($chapters);

// 确定当前章节：若是单个章节，获取其对象；若是归档或未指定，默认加载第一章
$current_chapter = null;
if (is_singular('dj_chapter')) {
    $current_id = get_the_ID();
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

$current_num = $current_chapter ? $current_chapter['number'] : 1;
$current_title = $current_chapter ? $current_chapter['title'] : '小说阅读';
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
    <a href="<?php echo esc_url(dj_url('home')); ?>" class="novel-backdrop" id="novel-backdrop" data-nav="home" aria-label="关闭全屏阅读并返回桌面" title="点击遮罩返回桌面"></a>

    <!-- 弹出的全屏小说阅读窗口（Win98 风格全屏窗口） -->
    <section class="window novel-popup-window" id="novel-popup-window" role="dialog" aria-modal="true" aria-label="小说全屏阅读窗口">
        <!-- Win98 风格窗口标题栏 -->
        <div class="title-bar novel-popup-title-bar">
            <div class="title-bar-text">
                <?php dj_gif('icon-book', 'title-icon', false); ?>
                <span class="novel-title-text">
                    <span class="series-name">we're a study group · 《我们是一个学习小组》</span>
                    <span class="title-sep">-</span>
                    <span class="chapter-name"><?php echo esc_html($current_title); ?></span>
                </span>
            </div>
            <div class="title-bar-controls">
                <a href="<?php echo esc_url(dj_url('home')); ?>" class="title-btn-min" data-nav="home" aria-label="Minimize / 返回桌面" title="最小化 / 返回桌面"></a>
                <button type="button" class="title-btn-max" id="novel-toggle-fullscreen" aria-label="Maximize / 切换铺满视口" title="切换全屏铺满"></button>
                <a href="<?php echo esc_url(dj_url('home')); ?>" class="title-btn-close" data-nav="home" aria-label="Close / 关闭全屏阅读" title="关闭并返回桌面"></a>
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
                        <span class="novel-badge">FULLSCREEN READER</span>
                        <span class="novel-book-title-tag">《我们是一个学习小组》</span>
                        <span class="novel-current-tag">第 <?php echo esc_html((string) $current_num); ?> 章</span>
                    </div>

                    <div class="novel-bar-center">
                        <span class="novel-read-progress-text" id="novel-progress-text">进度 0%</span>
                    </div>

                    <div class="novel-bar-actions">
                        <button type="button" class="button novel-btn" id="novel-toggle-toc" aria-expanded="false" aria-controls="novel-toc-drawer" title="章节目录">
                            <span class="btn-icon">☰</span>
                            <span class="btn-lbl">目录</span>
                        </button>
                        <button type="button" class="button novel-btn" id="novel-toggle-settings" aria-expanded="false" aria-controls="novel-settings-panel" title="阅读设置">
                            <span class="btn-icon">⚙</span>
                            <span class="btn-lbl">设置</span>
                        </button>
                        <?php if ($prev_chapter) : ?>
                            <a href="<?php echo esc_url($prev_chapter['url']); ?>" class="button novel-btn" title="上一章">上一章</a>
                        <?php else : ?>
                            <button type="button" class="button novel-btn" disabled>上一章</button>
                        <?php endif; ?>
                        <?php if ($next_chapter) : ?>
                            <a href="<?php echo esc_url($next_chapter['url']); ?>" class="button novel-btn button-primary" title="下一章">下一章</a>
                        <?php endif; ?>
                        <a href="<?php echo esc_url(dj_url('home')); ?>" class="button novel-btn novel-exit-btn" data-nav="home" title="退出全屏阅读并返回桌面">
                            <span class="btn-icon">✕</span>
                            <span class="btn-lbl">返回桌面</span>
                        </a>
                    </div>
                </div>

                <!-- 阅读偏好设置面板（悬浮抽屉式，Win98 窗口风） -->
                <div class="novel-settings-popup" id="novel-settings-panel" hidden>
                    <div class="settings-popup-header">
                        <b>阅读设置 / SETTINGS</b>
                        <button type="button" class="settings-close-btn" id="novel-close-settings" aria-label="关闭设置">×</button>
                    </div>
                    <div class="settings-popup-body">
                        <!-- 字号调节 -->
                        <div class="setting-row">
                            <span class="setting-label">字号大小</span>
                            <div class="setting-options" role="group" aria-label="字号">
                                <button type="button" class="button btn-setting" data-novel-setting="size" data-val="15">A- 小 (15)</button>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="size" data-val="18">A 标准 (18)</button>
                                <button type="button" class="button btn-setting" data-novel-setting="size" data-val="21">A+ 大 (21)</button>
                                <button type="button" class="button btn-setting" data-novel-setting="size" data-val="25">特大 (25)</button>
                            </div>
                        </div>

                        <!-- 字体选择 -->
                        <div class="setting-row">
                            <span class="setting-label">字体选择</span>
                            <div class="setting-options" role="group" aria-label="字体">
                                <button type="button" class="button btn-setting is-active" data-novel-setting="font" data-val="serif">宋体 / 明朝</button>
                                <button type="button" class="button btn-setting" data-novel-setting="font" data-val="sans">黑体 / 现代</button>
                                <button type="button" class="button btn-setting" data-novel-setting="font" data-val="mono">仿宋 / 等宽</button>
                            </div>
                        </div>

                        <!-- 阅读主题配色 -->
                        <div class="setting-row">
                            <span class="setting-label">阅读配色</span>
                            <div class="setting-options theme-palette" role="group" aria-label="主题配色">
                                <button type="button" class="theme-chip theme-chip-win is-active" data-novel-setting="theme" data-val="win" title="复古灰（站点风格）">
                                    <span>复古</span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-paper" data-novel-setting="theme" data-val="paper" title="羊皮纸暖黄">
                                    <span>纸张</span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-mint" data-novel-setting="theme" data-val="mint" title="护眼柔绿">
                                    <span>护眼</span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-white" data-novel-setting="theme" data-val="white" title="纯净白底">
                                    <span>纯白</span>
                                </button>
                                <button type="button" class="theme-chip theme-chip-night" data-novel-setting="theme" data-val="night" title="赛博夜间深色">
                                    <span>夜间</span>
                                </button>
                            </div>
                        </div>

                        <!-- 行距调节 -->
                        <div class="setting-row">
                            <span class="setting-label">行间间距</span>
                            <div class="setting-options" role="group" aria-label="行距">
                                <button type="button" class="button btn-setting" data-novel-setting="line" data-val="compact">紧凑</button>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="line" data-val="normal">标准</button>
                                <button type="button" class="button btn-setting" data-novel-setting="line" data-val="relaxed">宽松</button>
                            </div>
                        </div>

                        <!-- 版心宽度 -->
                        <div class="setting-row">
                            <span class="setting-label">版心宽度</span>
                            <div class="setting-options" role="group" aria-label="版心宽度">
                                <button type="button" class="button btn-setting" data-novel-setting="width" data-val="narrow">专注 (680)</button>
                                <button type="button" class="button btn-setting is-active" data-novel-setting="width" data-val="normal">标准 (800)</button>
                                <button type="button" class="button btn-setting" data-novel-setting="width" data-val="wide">宽屏 (960)</button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 章节目录抽屉（侧滑呼出） -->
                <div class="novel-toc-overlay" id="novel-toc-overlay" hidden></div>
                <aside class="novel-toc-drawer" id="novel-toc-drawer" aria-label="章节目录" hidden>
                    <div class="toc-header">
                        <div class="toc-title">
                            <b>目录 / CONTENTS</b>
                            <span class="toc-sub">《我们是一个学习小组》</span>
                        </div>
                        <button type="button" class="toc-close-btn" id="novel-close-toc" aria-label="关闭目录">×</button>
                    </div>
                    <div class="toc-stats">
                        <span>共 <?php echo esc_html((string) $chapter_count); ?> 章节</span>
                        <span>· 连载中</span>
                    </div>
                    <div class="toc-list-wrap">
                        <ol class="toc-list">
                            <?php foreach ($chapters as $ch) : 
                                $is_curr = ($current_chapter && $ch['number'] === $current_chapter['number']);
                            ?>
                                <li class="toc-item <?php echo $is_curr ? 'is-current' : ''; ?>">
                                    <a href="<?php echo esc_url($ch['url']); ?>" class="toc-link">
                                        <span class="toc-num">CH.<?php echo esc_html(str_pad((string) $ch['number'], 2, '0', STR_PAD_LEFT)); ?></span>
                                        <span class="toc-name"><?php echo esc_html($ch['clean_title']); ?></span>
                                        <span class="toc-words"><?php echo esc_html(number_format($ch['word_count'])); ?> 字</span>
                                        <?php if ($is_curr) : ?>
                                            <span class="toc-curr-badge">✦ 当前</span>
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
                                        <span class="chapter-series">✦ 连载小说 · WE'RE A STUDY GROUP ✦</span>
                                    </div>
                                    <h1 class="chapter-headline"><?php echo esc_html($current_title); ?></h1>
                                    <div class="chapter-info-bar">
                                        <span class="info-item"><i class="dot"></i>字数：<?php echo esc_html(number_format($current_wc)); ?> 字</span>
                                        <span class="info-item"><i class="dot"></i>阅读时长：约 <?php echo esc_html((string) $read_time); ?> 分钟</span>
                                        <?php if ($current_date) : ?>
                                            <span class="info-item"><i class="dot"></i>发布时间：<?php echo esc_html($current_date); ?></span>
                                        <?php endif; ?>
                                    </div>
                                </header>

                                <!-- 章节正文 -->
                                <div class="chapter-content prose-novel" id="novel-content-prose">
                                    <?php echo wp_kses_post($content); ?>
                                </div>

                                <!-- 章节收尾与翻页导航 -->
                                <footer class="chapter-footer">
                                    <div class="chapter-end-decor" aria-hidden="true">
                                        <span class="decor-line"></span>
                                        <span class="decor-text">✦ 本章完 · 《我们是一个学习小组》 ✦</span>
                                        <span class="decor-line"></span>
                                    </div>

                                    <div class="chapter-nav-actions">
                                        <?php if ($prev_chapter) : ?>
                                            <a href="<?php echo esc_url($prev_chapter['url']); ?>" class="button nav-btn prev-btn">
                                                <span class="arrow">«</span> 上一章：<?php echo esc_html($prev_chapter['clean_title']); ?>
                                            </a>
                                        <?php else : ?>
                                            <span class="button nav-btn is-disabled">已经是第一章</span>
                                        <?php endif; ?>

                                        <button type="button" class="button nav-btn toc-trigger-btn" id="novel-open-toc-bottom">
                                            ☰ 查看完整目录
                                        </button>

                                        <?php if ($next_chapter) : ?>
                                            <a href="<?php echo esc_url($next_chapter['url']); ?>" class="button button-primary nav-btn next-btn">
                                                下一章：<?php echo esc_html($next_chapter['clean_title']); ?> <span class="arrow">»</span>
                                            </a>
                                        <?php else : ?>
                                            <span class="button nav-btn is-disabled">敬请期待后续更新</span>
                                        <?php endif; ?>
                                    </div>

                                    <?php if ($next_chapter) : ?>
                                        <div class="novel-scroll-next-trigger" data-next-url="<?php echo esc_url($next_chapter['url']); ?>" data-next-title="<?php echo esc_attr($next_chapter['title']); ?>" data-next-num="<?php echo esc_attr((string) $next_chapter['number']); ?>">
                                            <div class="scroll-next-card">
                                                <span class="scroll-next-icon">▼</span>
                                                <span class="scroll-next-text">继续向下滚动或点击直达第 <?php echo esc_html((string) $next_chapter['number']); ?> 章</span>
                                                <a href="<?php echo esc_url($next_chapter['url']); ?>" class="scroll-next-link">立即进入下一章 »</a>
                                            </div>
                                        </div>
                                    <?php endif; ?>
                                </footer>
                            </article>
                        <?php else : ?>
                            <div class="empty-novel">
                                <p>目前还没有已发布的章节，站长正在导入中…</p>
                            </div>
                        <?php endif; ?>
                    </div>
                </div>
            </div>
        </div>
    </section>
</div>
