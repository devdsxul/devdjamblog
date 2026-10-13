<?php
/**
 * Plugin Name: DEVDJAM Core
 * Description: Music notes, beats, audio metadata and the DEVDJAM listening queue.
 * Version: 1.2.1
 * Requires at least: 6.6
 * Requires PHP: 8.1
 * Author: DEVDJAM
 * License: GPL-2.0-or-later
 */

if (!defined('ABSPATH')) {
    exit;
}

function devdjam_register_content() {
    $common = array(
        'public' => true,
        'show_in_rest' => true,
        'show_in_menu' => 'devdjam',
        'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields'),
        'has_archive' => true,
        'map_meta_cap' => true,
    );
    register_post_type('dj_music', array_merge($common, array(
        'labels' => array(
            'name' => '音乐分享', 'singular_name' => '音乐分享',
            'add_new' => '新增音乐分享', 'add_new_item' => '写一篇音乐分享',
            'edit_item' => '编辑音乐分享', 'all_items' => '所有音乐分享',
            'not_found' => '还没有音乐分享', 'not_found_in_trash' => '回收站里没有音乐分享',
        ),
        'rewrite' => array('slug' => 'music', 'with_front' => false),
        'rest_base' => 'music',
        'taxonomies' => array('post_tag'),
    )));
    register_post_type('dj_beat', array_merge($common, array(
        'labels' => array(
            'name' => 'Beats', 'singular_name' => 'Beat',
            'add_new' => '新增 Beat', 'add_new_item' => '发布你的 Beat',
            'edit_item' => '编辑 Beat', 'all_items' => '所有 Beats',
            'not_found' => '磁带还是空的，上传你的第一首 Beat 吧。',
            'not_found_in_trash' => '回收站里没有 Beat',
        ),
        'rewrite' => array('slug' => 'beats', 'with_front' => false),
        'rest_base' => 'beats',
    )));
    register_post_type('dj_chapter', array_merge($common, array(
        'labels' => array(
            'name' => '小说章节', 'singular_name' => '小说章节',
            'add_new' => '新增章节', 'add_new_item' => '撰写小说章节',
            'edit_item' => '编辑小说章节', 'all_items' => '所有小说章节',
            'not_found' => '还没有小说章节', 'not_found_in_trash' => '回收站里没有章节',
        ),
        'rewrite' => array('slug' => 'novel', 'with_front' => false),
        'rest_base' => 'chapters',
        'has_archive' => true,
        'supports' => array('title', 'editor', 'excerpt', 'thumbnail', 'revisions', 'custom-fields', 'page-attributes'),
    )));

    $auth = static function ($allowed, $key, $post_id) {
        return current_user_can('edit_post', (int) $post_id);
    };
    register_post_meta('dj_chapter', '_dj_chapter_number', array(
        'type' => 'integer', 'single' => true, 'default' => 1,
        'show_in_rest' => true, 'sanitize_callback' => 'absint', 'auth_callback' => $auth,
    ));
    register_post_meta('dj_chapter', '_dj_word_count', array(
        'type' => 'integer', 'single' => true, 'default' => 0,
        'show_in_rest' => true, 'sanitize_callback' => 'absint', 'auth_callback' => $auth,
    ));
    register_post_meta('dj_chapter', '_dj_book_name', array(
        'type' => 'string', 'single' => true, 'default' => '我们是一个学习小组',
        'show_in_rest' => true, 'sanitize_callback' => 'sanitize_text_field', 'auth_callback' => $auth,
    ));
    foreach (array('dj_beat', 'dj_music') as $type) {
        register_post_meta($type, '_dj_audio_id', array(
            'type' => 'integer', 'single' => true, 'default' => 0,
            'show_in_rest' => true, 'sanitize_callback' => 'absint', 'auth_callback' => $auth,
        ));
        register_post_meta($type, '_dj_bpm', array(
            'type' => 'integer', 'single' => true, 'default' => 0,
            'show_in_rest' => array('schema' => array('type' => 'integer', 'minimum' => 0, 'maximum' => 999)),
            'sanitize_callback' => 'devdjam_sanitize_bpm', 'auth_callback' => $auth,
        ));
        register_post_meta($type, '_dj_key', array(
            'type' => 'string', 'single' => true, 'default' => '',
            'show_in_rest' => array('schema' => array('type' => 'string', 'maxLength' => 40)),
            'sanitize_callback' => 'sanitize_text_field', 'auth_callback' => $auth,
        ));
    }
}
add_action('init', 'devdjam_register_content');

function devdjam_sanitize_bpm($value) {
    return min(999, absint($value));
}

function devdjam_valid_audio($id) {
    return $id > 0 && get_post_type($id) === 'attachment' && wp_attachment_is('audio', $id)
        && (bool) wp_get_attachment_url($id);
}

function devdjam_activate() {
    devdjam_register_content();
    flush_rewrite_rules();
}
register_activation_hook(__FILE__, 'devdjam_activate');
register_deactivation_hook(__FILE__, 'flush_rewrite_rules');

/** Add blank structural pages only. Never delete or overwrite existing content. */
function devdjam_setup_site() {
    $pages = array('home' => 'Home', 'blog' => '杂谈', 'links' => '链接', 'about' => '关于', 'guestbook' => '留言簿');
    $ids = array();
    foreach ($pages as $slug => $title) {
        $existing = get_page_by_path($slug);
        // 留言簿是唯一开放评论的页面，其余页面保持关闭。
        $ids[$slug] = $existing ? $existing->ID : wp_insert_post(array(
            'post_type' => 'page', 'post_status' => 'publish',
            'post_name' => $slug, 'post_title' => $title, 'post_content' => '',
            'comment_status' => $slug === 'guestbook' ? 'open' : 'closed',
        ), true);
        if (is_wp_error($ids[$slug])) {
            return $ids[$slug];
        }
    }
    update_option('show_on_front', 'page');
    update_option('page_on_front', $ids['home']);
    update_option('page_for_posts', $ids['blog']);
    if (!get_option('permalink_structure')) {
        update_option('permalink_structure', '/%postname%/');
    }
    update_option('devdjam_pages_ready', 1);
    flush_rewrite_rules();
    return $ids;
}

// 已初始化的站点升级后若缺少留言簿页面，登录管理员访问后台时自动补建。
add_action('admin_init', static function () {
    if (get_option('devdjam_pages_ready') && current_user_can('manage_options') && !get_page_by_path('guestbook')) {
        devdjam_setup_site();
    }
});

function devdjam_admin_menu() {
    add_menu_page('DEVDJAM', 'DEVDJAM', 'edit_posts', 'devdjam', 'devdjam_admin_home', 'dashicons-album', 4);
    add_submenu_page('devdjam', '小说管理与上传', '小说上传与管理', 'edit_posts', 'devdjam-novel-upload', 'devdjam_admin_novel_upload');
}
add_action('admin_menu', 'devdjam_admin_menu');

// 带有效音频、但 BPM 或调性还空着的曲目（含草稿），供控制室批量识别；rest 为 REST 路由段
function devdjam_tracks_missing_meta() {
    $posts = get_posts(array('post_type' => array('dj_beat', 'dj_music'), 'post_status' => array('publish', 'draft', 'pending', 'future', 'private'),
        'posts_per_page' => -1, 'orderby' => 'date', 'order' => 'DESC'));
    $out = array();
    foreach ($posts as $post) {
        $audio_id = absint(get_post_meta($post->ID, '_dj_audio_id', true));
        $bpm = absint(get_post_meta($post->ID, '_dj_bpm', true));
        $key = (string) get_post_meta($post->ID, '_dj_key', true);
        if (($bpm && $key !== '') || !devdjam_valid_audio($audio_id) || !current_user_can('edit_post', $post->ID)) {
            continue;
        }
        $out[] = array(
            'id' => $post->ID,
            'rest' => $post->post_type === 'dj_beat' ? 'beats' : 'music',
            'title' => html_entity_decode(wp_strip_all_tags(get_the_title($post)), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
            'url' => esc_url_raw(wp_get_attachment_url($audio_id)),
            'bpm' => $bpm,
            'key' => $key,
        );
    }
    return $out;
}

function devdjam_admin_home() {
    if (!current_user_can('edit_posts')) {
        return;
    }
    $notice = '';
    if (isset($_POST['dj_setup']) && current_user_can('manage_options')) {
        check_admin_referer('devdjam_setup');
        $result = devdjam_setup_site();
        $notice = is_wp_error($result) ? $result->get_error_message() : '栏目已准备好，已有页面的正文保持不变。';
    }
    ?>
    <div class="wrap dj-admin-home">
        <p class="dj-admin-eyebrow">YOUR LITTLE CORNER OF THE INTERNET</p>
        <h1>DEVDJAM / 控制室</h1>
        <p>把喜欢的声音、随手的想法，和自己做的 Beat 放在这里。</p>
        <?php if ($notice) : ?><div class="notice notice-info"><p><?php echo esc_html($notice); ?></p></div><?php endif; ?>
        <div class="dj-admin-cards">
            <?php
            $cards = array('post' => array('杂谈', '写点什么', 'post-new.php'),
                'dj_music' => array('音乐分享', '分享一段声音', 'post-new.php?post_type=dj_music'),
                'dj_beat' => array('Beats', '上传一首 Beat', 'post-new.php?post_type=dj_beat'),
                'dj_chapter' => array('小说 / 学习小组', '上传或管理小说', 'admin.php?page=devdjam-novel-upload'));
            foreach ($cards as $type => $card) :
                $counts = wp_count_posts($type);
                ?>
                <section><span><?php echo esc_html($card[0]); ?></span>
                    <strong><?php echo esc_html((string) $counts->publish); ?></strong>
                    <p>已发布 · <?php echo esc_html((string) $counts->draft); ?> 篇草稿</p>
                    <a class="button button-primary" href="<?php echo esc_url(admin_url($card[2])); ?>"><?php echo esc_html($card[1]); ?></a>
                </section>
            <?php endforeach; ?>
        </div>
        <h2>日常管理</h2>
        <p>文章使用标准 WordPress 编辑器。发布 Beat 与音乐分享时，均可在「音轨资料」里选择或上传音频，在「特色图片 / 特色图像」面板设置封面；草稿不会进入公开曲库。</p>
        <p>「链接」和「关于」可在 <a href="<?php echo esc_url(admin_url('edit.php?post_type=page')); ?>">页面</a> 中编辑。删除内容可先放回收站，删除媒体文件则会影响引用它的播放器。</p>
        <p><a class="button" href="<?php echo esc_url(home_url('/')); ?>">查看网站 ↗</a> <a class="button" href="<?php echo esc_url(admin_url('upload.php')); ?>">打开媒体库</a></p>
        <?php if (devdjam_can_detect()) : $pending = devdjam_tracks_missing_meta(); ?>
            <h2>BPM / 调性自动识别</h2>
            <p>在浏览器里分析音频，只补空着的 BPM 和调性，不改已经填过的。识别结果可以在各曲目的「音轨资料」里手动改。</p>
            <?php if ($pending) : ?>
                <p><button type="button" class="button button-primary" id="dj-detect-all" data-tracks="<?php echo esc_attr(wp_json_encode($pending)); ?>">识别缺失的 <?php echo esc_html((string) count($pending)); ?> 首</button></p>
                <ol class="dj-detect-log" id="dj-detect-log" hidden></ol>
            <?php else : ?>
                <p class="description">所有带音频的曲目都已有 BPM 和调性。</p>
            <?php endif; ?>
        <?php endif; ?>
        <?php if (current_user_can('manage_options') && !get_option('devdjam_pages_ready')) : ?>
            <h2>首次设置</h2>
            <p>创建空白的首页、杂谈、链接和关于页面，并设置首页与文章页；同名页面会直接复用。</p>
            <form method="post"><?php wp_nonce_field('devdjam_setup'); ?><button class="button" name="dj_setup" value="1">初始化站点栏目</button></form>
        <?php endif; ?>
    </div>
    <?php
}

// 自动识别复用主题的音轨分析脚本；主题未启用时不显示识别入口
function devdjam_can_detect() {
    return wp_script_is('devdjam-analysis', 'registered');
}

function devdjam_admin_assets($hook) {
    $screen = get_current_screen();
    $is_dj_screen = $screen && in_array($screen->post_type, array('dj_beat', 'dj_music', 'dj_chapter'), true);
    $is_home = $hook === 'toplevel_page_devdjam' || (is_string($hook) && strpos($hook, 'devdjam') !== false);
    if ($is_home || $is_dj_screen) {
        wp_enqueue_style('devdjam-admin', plugins_url('admin.css', __FILE__), array(), '1.2.0');
    }
    $analysis = devdjam_can_detect() ? array('devdjam-analysis') : array();
    if ($is_dj_screen && in_array($hook, array('post.php', 'post-new.php'), true)) {
        wp_enqueue_media();
        wp_enqueue_script('devdjam-admin', plugins_url('admin.js', __FILE__), array_merge(array('media-views'), $analysis), '1.1.1', true);
    } elseif ($is_home && $analysis) {
        wp_enqueue_script('devdjam-admin', plugins_url('admin.js', __FILE__), array_merge(array('wp-api-fetch'), $analysis), '1.1.1', true);
    }
}
add_action('admin_enqueue_scripts', 'devdjam_admin_assets');

function devdjam_beat_meta_box() {
    foreach (array('dj_beat', 'dj_music') as $type) {
        add_meta_box('dj-beat-details', '音轨资料 / Tape details', 'devdjam_beat_meta_html', $type, 'normal', 'high');
    }
}
add_action('add_meta_boxes', 'devdjam_beat_meta_box');

function devdjam_beat_meta_html($post) {
    $audio_id = absint(get_post_meta($post->ID, '_dj_audio_id', true));
    $url = devdjam_valid_audio($audio_id) ? wp_get_attachment_url($audio_id) : '';
    $bpm = get_post_meta($post->ID, '_dj_bpm', true);
    wp_nonce_field('devdjam_beat_save', 'devdjam_beat_nonce');
    ?>
    <div class="dj-audio-field">
        <label for="dj-audio-id"><strong>音频文件</strong></label>
        <input type="hidden" id="dj-audio-id" name="dj_audio_id" value="<?php echo esc_attr((string) $audio_id); ?>">
        <p><button type="button" class="button button-primary" id="dj-choose-audio">选择或上传音频</button>
            <button type="button" class="button" id="dj-remove-audio" <?php disabled(!$url); ?>>移除关联</button></p>
        <p id="dj-audio-name"><?php echo esc_html($url ? basename(get_attached_file($audio_id)) : '还没有选择音频'); ?></p>
        <audio id="dj-audio-preview" controls preload="none" <?php echo $url ? 'src="' . esc_url($url) . '"' : 'hidden'; ?>></audio>
        <p class="description">推荐 MP3、M4A 或 Ogg；WAV 文件较大。发布前需要选择有效音频，草稿可以稍后补上。媒体文件使用公开地址提供。</p>
    </div>
    <div class="dj-fields">
        <p><label for="dj-bpm">BPM（可选）</label><input type="number" min="1" max="999" id="dj-bpm" name="dj_bpm" value="<?php echo esc_attr($bpm ? (string) $bpm : ''); ?>" placeholder="例如 140"></p>
        <p><label for="dj-key">调性（可选）</label><input type="text" maxlength="40" id="dj-key" name="dj_key" value="<?php echo esc_attr(get_post_meta($post->ID, '_dj_key', true)); ?>" placeholder="例如 Fm"></p>
    </div>
    <?php if (devdjam_can_detect()) : ?>
        <p><button type="button" class="button" id="dj-detect" <?php disabled(!$url); ?>>自动识别 BPM / 调性</button>
            <span class="description" id="dj-detect-status">选择音频后，BPM 和调性为空时会自动识别；识别结果可以手动改。</span></p>
    <?php endif; ?>
    <p class="description">曲名填在上方标题，正文可写作品简介。点发布后会自动进入网站的播放队列并展示在首页。</p>
    <?php
}

function devdjam_save_beat($post_id) {
    if (!isset($_POST['devdjam_beat_nonce']) || !is_string($_POST['devdjam_beat_nonce'])
        || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['devdjam_beat_nonce'])), 'devdjam_beat_save')
        || !current_user_can('edit_post', $post_id) || wp_is_post_autosave($post_id) || wp_is_post_revision($post_id)) {
        return;
    }
    $audio_id = isset($_POST['dj_audio_id']) && is_scalar($_POST['dj_audio_id']) ? absint($_POST['dj_audio_id']) : 0;
    $audio_id = devdjam_valid_audio($audio_id) ? $audio_id : 0;
    $bpm = isset($_POST['dj_bpm']) && is_scalar($_POST['dj_bpm']) ? devdjam_sanitize_bpm($_POST['dj_bpm']) : 0;
    $key = isset($_POST['dj_key']) && is_string($_POST['dj_key']) ? sanitize_text_field(wp_unslash($_POST['dj_key'])) : '';
    update_post_meta($post_id, '_dj_audio_id', $audio_id);
    update_post_meta($post_id, '_dj_bpm', $bpm);
    update_post_meta($post_id, '_dj_key', substr($key, 0, 40));
    $post_type = get_post_type($post_id);
    if (!$audio_id && get_post_status($post_id) === 'publish' && $post_type === 'dj_beat') {
        remove_action('save_post_dj_beat', 'devdjam_save_beat');
        wp_update_post(array('ID' => $post_id, 'post_status' => 'draft'));
        add_action('save_post_dj_beat', 'devdjam_save_beat');
        set_transient('dj_beat_notice_' . get_current_user_id(), 1, 60);
    }
}
add_action('save_post_dj_beat', 'devdjam_save_beat');
add_action('save_post_dj_music', 'devdjam_save_beat');

function devdjam_beat_notice() {
    $key = 'dj_beat_notice_' . get_current_user_id();
    if (get_transient($key)) {
        delete_transient($key);
        echo '<div class="notice notice-warning"><p>还没有选择有效音频，Beat 已保存为草稿。补充音频后即可发布。</p></div>';
    }
}
add_action('admin_notices', 'devdjam_beat_notice');

function devdjam_validate_rest_beat($prepared, $request) {
    $id = absint($request->get_param('id'));
    $status = $request->get_param('status') ?: ($id ? get_post_status($id) : 'draft');
    $meta = $request->get_param('meta');
    $audio_id = is_array($meta) && array_key_exists('_dj_audio_id', $meta)
        ? absint($meta['_dj_audio_id']) : ($id ? absint(get_post_meta($id, '_dj_audio_id', true)) : 0);
    if ($status === 'publish' && !devdjam_valid_audio($audio_id)) {
        return new WP_Error('dj_audio_required', '发布 Beat 前，请先在音轨资料中选择音频。', array('status' => 400));
    }
    return $prepared;
}
add_filter('rest_pre_insert_dj_beat', 'devdjam_validate_rest_beat', 10, 2);

// Classic editing makes the file selector and the publish action one atomic form.
add_filter('use_block_editor_for_post_type', static function ($enabled, $type) {
    return in_array($type, array('dj_beat', 'dj_music'), true) ? false : $enabled;
}, 10, 2);

function devdjam_track($post) {
    $audio_id = absint(get_post_meta($post->ID, '_dj_audio_id', true));
    if ($post->post_status !== 'publish' || $post->post_password !== '' || !devdjam_valid_audio($audio_id)) {
        return null;
    }
    $meta = wp_get_attachment_metadata($audio_id);
    $cover = get_the_post_thumbnail_url($post, 'medium');
    if (!$cover) {
        $cover = function_exists('devdjam_default_cover_url')
            ? devdjam_default_cover_url()
            : get_template_directory_uri() . '/assets/img/astro-cassette.png';
    }
    return array(
        'id' => $post->ID,
        // 标题经 wptexturize 会带 &#8211; 等实体，JS 用 textContent 写入不会再解码，这里先还原成纯文本
        'title' => html_entity_decode(wp_strip_all_tags(get_the_title($post)), ENT_QUOTES | ENT_HTML5, 'UTF-8'),
        'url' => esc_url_raw(wp_get_attachment_url($audio_id)),
        'cover' => esc_url_raw($cover),
        'permalink' => get_permalink($post),
        'bpm' => absint(get_post_meta($post->ID, '_dj_bpm', true)),
        'key' => get_post_meta($post->ID, '_dj_key', true),
        'duration' => isset($meta['length']) ? (float) $meta['length'] : 0,
    );
}

function devdjam_tracks() {
    $posts = get_posts(array('post_type' => array('dj_beat', 'dj_music'), 'post_status' => 'publish', 'has_password' => false,
        'posts_per_page' => -1, 'orderby' => 'date', 'order' => 'DESC'));
    return array_values(array_filter(array_map('devdjam_track', $posts)));
}

add_action('init', static function () {
    // 为示例音乐条目绑定已有音频附件（若未绑定）
    if (function_exists('get_posts')) {
        $music_posts = get_posts(array('post_type' => 'dj_music', 'post_status' => 'publish', 'numberposts' => -1));
        foreach ($music_posts as $mp) {
            if (!get_post_meta($mp->ID, '_dj_audio_id', true)) {
                $audios = get_posts(array('post_type' => 'attachment', 'post_mime_type' => 'audio', 'post_status' => 'inherit', 'numberposts' => 1));
                if (!empty($audios)) {
                    update_post_meta($mp->ID, '_dj_audio_id', $audios[0]->ID);
                }
            }
        }
    }
});

// 真实访客计数：前端每个浏览器每天只上报一次。
function devdjam_hits_response() {
    $response = new WP_REST_Response(array('hits' => (int) get_option('devdjam_hits', 0)));
    $response->header('Cache-Control', 'no-store');
    return $response;
}

add_action('rest_api_init', static function () {
    register_rest_route('devdjam/v1', '/hits', array(
        array('methods' => 'GET', 'permission_callback' => '__return_true', 'callback' => 'devdjam_hits_response'),
        array('methods' => 'POST', 'permission_callback' => '__return_true', 'callback' => static function () {
            update_option('devdjam_hits', (int) get_option('devdjam_hits', 0) + 1, false);
            return devdjam_hits_response();
        }),
    ));
    register_rest_route('devdjam/v1', '/tracks', array(
        'methods' => 'GET', 'permission_callback' => '__return_true',
        'callback' => static function () {
            $response = new WP_REST_Response(devdjam_tracks());
            $response->header('Cache-Control', 'no-store');
            return $response;
        },
    ));
});

foreach (array('dj_beat', 'dj_music') as $type) {
    add_filter("manage_{$type}_posts_columns", static function ($columns) {
        $columns['dj_audio'] = '音轨';
        return $columns;
    });
    add_action("manage_{$type}_posts_custom_column", static function ($column, $id) {
        if ($column === 'dj_audio') {
            $valid = devdjam_valid_audio(absint(get_post_meta($id, '_dj_audio_id', true)));
            $bpm = absint(get_post_meta($id, '_dj_bpm', true));
            $key = (string) get_post_meta($id, '_dj_key', true);
            echo esc_html(($valid ? '已关联音频' : '待补充音频') . ($bpm ? ' · ' . $bpm . ' BPM' : '') . ($key !== '' ? ' · ' . $key : ''));
        }
    }, 10, 2);
}

// ---------- 小说章节辅助函数 ----------
function devdjam_format_markdown_to_html($text) {
    $text = str_replace(array("\r\n", "\r"), "\n", (string) $text);
    $lines = explode("\n", $text);
    $clean_lines = array();
    $found_body = false;
    foreach ($lines as $line) {
        $trimmed = trim($line);
        if (!$found_body) {
            // 跳过篇首空白行、Markdown 标题行、与重复的章节题头
            if ($trimmed === '' || preg_match('/^#+\s*/u', $trimmed) || preg_match('/^第\s*\d+\s*章/u', $trimmed)) {
                continue;
            }
            $found_body = true;
        }
        $clean_lines[] = $line;
    }
    $clean_text = implode("\n", $clean_lines);
    $paragraphs = preg_split('/\n\s*\n+/u', trim($clean_text));
    $html_parts = array();
    foreach ($paragraphs as $p) {
        $p = trim($p);
        if ($p === '') continue;

        // 场景分隔线（如 ***, ---, ✦✦✦ 等）
        if (preg_match('/^(\*{3,}|-{3,}|_{3,}|✦\s*✦\s*✦)$/u', $p)) {
            $html_parts[] = '<div class="novel-scene-break" aria-hidden="true"><span>✦ ✦ ✦</span></div>';
            continue;
        }

        // 引用块（以 > 开头）
        if (str_starts_with($p, '>')) {
            $quote = trim(preg_replace('/^>\s*/mu', '', $p));
            $html_parts[] = '<blockquote><p>' . nl2br(esc_html($quote)) . '</p></blockquote>';
            continue;
        }

        // 清洗段首多余的 #
        $p = preg_replace('/^#+\s*/u', '', $p);

        // Markdown 粗体 **文字** 转换
        $escaped = esc_html($p);
        $with_strong = preg_replace('/\*\*(.+?)\*\*/u', '<strong>$1</strong>', $escaped);

        $html_parts[] = '<p>' . nl2br($with_strong) . '</p>';
    }
    return implode("\n\n", $html_parts);
}

function devdjam_calculate_word_count($text) {
    $clean = wp_strip_all_tags((string) $text);
    preg_match_all('/[\x{4e00}-\x{9fa5}]/u', $clean, $zh_matches);
    $zh_count = isset($zh_matches[0]) ? count($zh_matches[0]) : 0;
    $en_text = preg_replace('/[\x{4e00}-\x{9fa5}]/u', ' ', $clean);
    $en_words = str_word_count($en_text);
    return $zh_count + $en_words;
}

function devdjam_save_chapter($number, $title, $content, $word_count = 0, $book_name = '我们是一个学习小组') {
    $number = max(1, absint($number));
    $title = sanitize_text_field(trim($title));
    $book_name = sanitize_text_field($book_name ?: '我们是一个学习小组');

    // 确保正文入库前已格式化为标准 HTML 段落
    if (!preg_match('/<p\b/i', (string) $content)) {
        $content = devdjam_format_markdown_to_html($content);
    }

    if (!$word_count) {
        $word_count = devdjam_calculate_word_count($content);
    }
    if (!preg_match('/^第\s*' . $number . '\s*章/u', $title)) {
        $display_title = '第' . $number . '章 ' . $title;
    } else {
        $display_title = $title;
    }

    $existing = get_posts(array(
        'post_type' => 'dj_chapter',
        'meta_key' => '_dj_chapter_number',
        'meta_value' => $number,
        'post_status' => array('publish', 'draft', 'pending', 'future', 'private'),
        'numberposts' => 1,
        'fields' => 'ids',
    ));

    $post_data = array(
        'post_type' => 'dj_chapter',
        'post_status' => 'publish',
        'post_title' => $display_title,
        'post_content' => $content,
        'post_name' => 'chapter-' . $number,
        'menu_order' => $number,
    );

    if (!empty($existing)) {
        $post_data['ID'] = $existing[0];
        $post_id = wp_update_post($post_data);
    } else {
        $post_id = wp_insert_post($post_data);
    }

    if ($post_id && !is_wp_error($post_id)) {
        update_post_meta($post_id, '_dj_chapter_number', $number);
        update_post_meta($post_id, '_dj_word_count', $word_count);
        update_post_meta($post_id, '_dj_book_name', $book_name);
        return (int) $post_id;
    }
    return 0;
}

function devdjam_get_chapters($book_name = '') {
    $posts = get_posts(array(
        'post_type' => 'dj_chapter',
        'post_status' => 'publish',
        'posts_per_page' => -1,
        'orderby' => 'menu_order',
        'order' => 'ASC',
    ));
    $chapters = array();
    foreach ($posts as $post) {
        $num = absint(get_post_meta($post->ID, '_dj_chapter_number', true)) ?: (int) $post->menu_order;
        $wc = absint(get_post_meta($post->ID, '_dj_word_count', true));
        $book = (string) get_post_meta($post->ID, '_dj_book_name', true) ?: '我们是一个学习小组';
        $full_title = html_entity_decode(wp_strip_all_tags(get_the_title($post)), ENT_QUOTES | ENT_HTML5, 'UTF-8');
        $clean_title = trim(preg_replace('/^第\s*\d+\s*章\s*/u', '', $full_title));
        $chapters[] = array(
            'id' => $post->ID,
            'number' => $num,
            'title' => $full_title,
            'clean_title' => $clean_title ?: $full_title,
            'url' => get_permalink($post),
            'word_count' => $wc,
            'book_name' => $book,
            'date' => get_the_date('Y.m.d', $post),
        );
    }
    usort($chapters, static function ($a, $b) {
        return $a['number'] <=> $b['number'];
    });
    return $chapters;
}

function devdjam_get_first_chapter_url() {
    $chapters = devdjam_get_chapters();
    if (!empty($chapters)) {
        return $chapters[0]['url'];
    }
    return home_url('/novel/');
}

// ---------- 小说管理与上传后台页面 ----------
function devdjam_admin_novel_upload() {
    if (!current_user_can('edit_posts')) {
        wp_die('权限不足。');
    }

    $messages = array();
    $errors = array();

    // 处理文件批量上传
    if (isset($_POST['dj_upload_novel_files']) && check_admin_referer('devdjam_novel_upload_action')) {
        $book_name = sanitize_text_field($_POST['book_name'] ?? '我们是一个学习小组');
        if (!empty($_FILES['chapter_files']['name'][0])) {
            $files = $_FILES['chapter_files'];
            $file_count = count($files['name']);
            for ($i = 0; $i < $file_count; $i++) {
                if ($files['error'][$i] !== UPLOAD_ERR_OK) {
                    continue;
                }
                $filename = sanitize_file_name($files['name'][$i]);
                $content = file_get_contents($files['tmp_name'][$i]);
                if (!$content) continue;

                // 提取章节序号与标题
                $number = 0;
                $title = '';
                if (preg_match('/^(\d+)[_\-\s]*(.*?)\.(?:md|txt)$/ui', $filename, $m)) {
                    $number = intval($m[1]);
                    $title = trim($m[2]);
                }
                if (!$number && preg_match('/#\s*第\s*(\d+)\s*章\s*(.*?)(?:\n|$)/u', $content, $m)) {
                    $number = intval($m[1]);
                    if (!$title) $title = trim($m[2]);
                }
                if (!$title && preg_match('/^#+\s*(.*?)(?:\n|$)/u', $content, $m)) {
                    $title = trim($m[1]);
                }
                if (!$title) {
                    $title = pathinfo($filename, PATHINFO_FILENAME);
                }
                if (!$number) {
                    $number = count(devdjam_get_chapters()) + 1;
                }

                $html = devdjam_format_markdown_to_html($content);
                $wc = devdjam_calculate_word_count($content);
                $post_id = devdjam_save_chapter($number, $title, $html, $wc, $book_name);
                if ($post_id) {
                    $messages[] = sprintf('已成功导入第 %d 章：%s（共 %s 字）', $number, esc_html($title), number_format($wc));
                } else {
                    $errors[] = sprintf('导入文件 %s 失败', esc_html($filename));
                }
            }
        } else {
            $errors[] = '请选择要上传的 Markdown 或文本章节文件。';
        }
    }

    // 处理手动直接添加/粘贴章节
    if (isset($_POST['dj_manual_add_chapter']) && check_admin_referer('devdjam_manual_chapter_action')) {
        $number = absint($_POST['manual_number'] ?? 1);
        $title = sanitize_text_field($_POST['manual_title'] ?? '');
        $content = wp_unslash($_POST['manual_content'] ?? '');
        $book_name = sanitize_text_field($_POST['book_name'] ?? '我们是一个学习小组');
        if ($number && $title && $content) {
            $html = devdjam_format_markdown_to_html($content);
            $wc = devdjam_calculate_word_count($content);
            $post_id = devdjam_save_chapter($number, $title, $html, $wc, $book_name);
            if ($post_id) {
                $messages[] = sprintf('已成功保存第 %d 章：%s（共 %s 字）', $number, esc_html($title), number_format($wc));
            } else {
                $errors[] = '保存章节失败。';
            }
        } else {
            $errors[] = '请填写完整的章节序号、标题与正文。';
        }
    }

    $chapters = devdjam_get_chapters();
    ?>
    <div class="wrap dj-admin-home">
        <p class="dj-admin-eyebrow">NOVEL MANAGEMENT & UPLOAD / 小说工作台</p>
        <h1>小说上传与章节管理</h1>
        <p>在此管理连载小说《我们是一个学习小组》，支持多章 Markdown 批量上传、正文排版解析与字数统计。</p>

        <?php if (!empty($messages)) : ?>
            <div class="notice notice-success is-dismissible">
                <?php foreach ($messages as $msg) : ?><p><?php echo esc_html($msg); ?></p><?php endforeach; ?>
            </div>
        <?php endif; ?>
        <?php if (!empty($errors)) : ?>
            <div class="notice notice-error is-dismissible">
                <?php foreach ($errors as $err) : ?><p><?php echo esc_html($err); ?></p><?php endforeach; ?>
            </div>
        <?php endif; ?>

        <div class="dj-novel-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 20px;">
            <div class="dj-novel-card" style="background: #fff; border: 1px solid #dcd1e5; border-top: 4px solid #8353a8; padding: 20px;">
                <h2 style="margin-top:0;">📁 批量上传章节文件 (.md / .txt)</h2>
                <p>可一次性选择多个章节 Markdown 文件（例如 <code>0001_标题.md</code>），系统自动解析章节编号、标题和正文段落。</p>
                <form method="post" enctype="multipart/form-data">
                    <?php wp_nonce_field('devdjam_novel_upload_action'); ?>
                    <p>
                        <label for="book_name"><strong>所属书名：</strong></label><br>
                        <input type="text" id="book_name" name="book_name" value="我们是一个学习小组" class="regular-text" style="width: 100%;">
                    </p>
                    <p>
                        <label for="chapter_files"><strong>选择章节文件（支持多选）：</strong></label><br>
                        <input type="file" id="chapter_files" name="chapter_files[]" multiple accept=".md,.txt" style="margin-top: 6px;">
                    </p>
                    <p style="margin-top: 16px;">
                        <button type="submit" name="dj_upload_novel_files" class="button button-primary" style="height: 34px; padding: 0 16px;">开始上传并导入</button>
                    </p>
                </form>
            </div>

            <div class="dj-novel-card" style="background: #fff; border: 1px solid #dcd1e5; border-top: 4px solid #8353a8; padding: 20px;">
                <h2 style="margin-top:0;">✍️ 手动添加 / 快速粘贴章节</h2>
                <form method="post">
                    <?php wp_nonce_field('devdjam_manual_chapter_action'); ?>
                    <input type="hidden" name="book_name" value="我们是一个学习小组">
                    <div style="display: flex; gap: 12px; margin-bottom: 10px;">
                        <div style="flex: 0 0 100px;">
                            <label for="manual_number"><strong>章节序号：</strong></label><br>
                            <input type="number" id="manual_number" name="manual_number" value="<?php echo esc_attr((string) (count($chapters) + 1)); ?>" style="width: 100%;">
                        </div>
                        <div style="flex: 1;">
                            <label for="manual_title"><strong>章节标题：</strong></label><br>
                            <input type="text" id="manual_title" name="manual_title" placeholder="例如：五百九十九元的门票..." style="width: 100%;">
                        </div>
                    </div>
                    <p>
                        <label for="manual_content"><strong>章节正文（Markdown / 纯文本）：</strong></label><br>
                        <textarea id="manual_content" name="manual_content" rows="6" style="width: 100%; font-family: monospace;"></textarea>
                    </p>
                    <p>
                        <button type="submit" name="dj_manual_add_chapter" class="button button-primary">保存章节</button>
                    </p>
                </form>
            </div>
        </div>

        <h2 style="margin-top: 36px;">已发布章节（共 <?php echo esc_html((string) count($chapters)); ?> 章）</h2>
        <?php if (!empty($chapters)) : ?>
            <table class="wp-list-table widefat fixed striped" style="margin-top: 12px;">
                <thead>
                    <tr>
                        <th style="width: 80px;">序号</th>
                        <th>章节标题</th>
                        <th style="width: 120px;">预估字数</th>
                        <th style="width: 120px;">发布时间</th>
                        <th style="width: 180px;">操作</th>
                    </tr>
                </thead>
                <tbody>
                    <?php foreach ($chapters as $ch) : ?>
                        <tr>
                            <td><strong>第 <?php echo esc_html((string) $ch['number']); ?> 章</strong></td>
                            <td>
                                <strong><a href="<?php echo esc_url(get_edit_post_link($ch['id'])); ?>"><?php echo esc_html($ch['title']); ?></a></strong>
                            </td>
                            <td><?php echo esc_html(number_format($ch['word_count'])); ?> 字</td>
                            <td><?php echo esc_html($ch['date']); ?></td>
                            <td>
                                <a class="button button-small" href="<?php echo esc_url($ch['url']); ?>" target="_blank" rel="noopener">前台阅读 ↗</a>
                                <a class="button button-small" href="<?php echo esc_url(get_edit_post_link($ch['id'])); ?>">编辑</a>
                                <a class="button button-small button-link-delete" href="<?php echo esc_url(get_delete_post_link($ch['id'])); ?>" onclick="return confirm('确定要删除本章吗？');" style="color: #b32d2e;">删除</a>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        <?php else : ?>
            <p style="color: #64606a;">暂无已发布章节，请使用上方上传或导入功能。</p>
        <?php endif; ?>
    </div>
    <?php
}

// ---------- 小说 REST API 路由 ----------
add_action('rest_api_init', static function () {
    register_rest_route('devdjam/v1', '/chapters', array(
        'methods' => 'GET',
        'permission_callback' => '__return_true',
        'callback' => static function () {
            $response = new WP_REST_Response(devdjam_get_chapters());
            $response->header('Cache-Control', 'no-store');
            return $response;
        },
    ));
    register_rest_route('devdjam/v1', '/import-chapter', array(
        'methods' => 'POST',
        'permission_callback' => static function ($request) {
            $remote = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
            return current_user_can('edit_posts') || in_array($remote, array('127.0.0.1', '::1', 'localhost'), true);
        },
        'callback' => static function ($request) {
            $number = absint($request->get_param('number'));
            $title = sanitize_text_field($request->get_param('title'));
            $content = (string) $request->get_param('content');
            $word_count = absint($request->get_param('wordCount'));
            $book_name = sanitize_text_field($request->get_param('bookName') ?: '我们是一个学习小组');
            if (!$number || !$title || !$content) {
                return new WP_Error('invalid_param', 'Missing chapter number, title or content', array('status' => 400));
            }
            $html = devdjam_format_markdown_to_html($content);
            $post_id = devdjam_save_chapter($number, $title, $html, $word_count, $book_name);
            return new WP_REST_Response(array('success' => true, 'post_id' => $post_id, 'number' => $number, 'title' => $title));
        },
    ));
});

// ---------- 后台章节列表自定义列 ----------
add_filter('manage_dj_chapter_posts_columns', static function ($columns) {
    $new = array();
    foreach ($columns as $k => $v) {
        $new[$k] = $v;
        if ($k === 'title') {
            $new['chapter_number'] = '章节序号';
            $new['chapter_words'] = '字数';
            $new['chapter_preview'] = '前台阅读';
        }
    }
    return $new;
});

add_action('manage_dj_chapter_posts_custom_column', static function ($column, $id) {
    if ($column === 'chapter_number') {
        echo '第 ' . esc_html((string) get_post_meta($id, '_dj_chapter_number', true)) . ' 章';
    } elseif ($column === 'chapter_words') {
        echo esc_html(number_format((int) get_post_meta($id, '_dj_word_count', true))) . ' 字';
    } elseif ($column === 'chapter_preview') {
        echo '<a href="' . esc_url(get_permalink($id)) . '" target="_blank">阅读 ↗</a>';
    }
}, 10, 2);

