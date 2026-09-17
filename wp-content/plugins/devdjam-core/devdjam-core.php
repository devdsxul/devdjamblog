<?php
/**
 * Plugin Name: DEVDJAM Core
 * Description: Music notes, beats, audio metadata and the DEVDJAM listening queue.
 * Version: 1.0.0
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

    $auth = static function ($allowed, $key, $post_id) {
        return current_user_can('edit_post', (int) $post_id);
    };
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
}
add_action('admin_menu', 'devdjam_admin_menu');

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
                'dj_beat' => array('Beats', '上传一首 Beat', 'post-new.php?post_type=dj_beat'));
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
        <p>文章使用标准 WordPress 编辑器。发布 Beat 与音乐分享时，均可在「音轨资料」里直接选择或上传音频和封面；草稿不会进入公开曲库。</p>
        <p>「链接」和「关于」可在 <a href="<?php echo esc_url(admin_url('edit.php?post_type=page')); ?>">页面</a> 中编辑。删除内容可先放回收站，删除媒体文件则会影响引用它的播放器。</p>
        <p><a class="button" href="<?php echo esc_url(home_url('/')); ?>">查看网站 ↗</a> <a class="button" href="<?php echo esc_url(admin_url('upload.php')); ?>">打开媒体库</a></p>
        <?php if (current_user_can('manage_options') && !get_option('devdjam_pages_ready')) : ?>
            <h2>首次设置</h2>
            <p>创建空白的首页、杂谈、链接和关于页面，并设置首页与文章页；同名页面会直接复用。</p>
            <form method="post"><?php wp_nonce_field('devdjam_setup'); ?><button class="button" name="dj_setup" value="1">初始化站点栏目</button></form>
        <?php endif; ?>
    </div>
    <?php
}

function devdjam_admin_assets($hook) {
    $screen = get_current_screen();
    $is_dj_screen = $screen && in_array($screen->post_type, array('dj_beat', 'dj_music'), true);
    if ($hook === 'toplevel_page_devdjam' || $is_dj_screen) {
        wp_enqueue_style('devdjam-admin', plugins_url('admin.css', __FILE__), array(), '1.0.0');
    }
    if ($is_dj_screen && in_array($hook, array('post.php', 'post-new.php'), true)) {
        wp_enqueue_media();
        wp_enqueue_script('devdjam-admin', plugins_url('admin.js', __FILE__), array('media-views'), '1.0.0', true);
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
    $thumb_id = get_post_thumbnail_id($post->ID);
    $thumb_url = $thumb_id ? wp_get_attachment_image_url($thumb_id, 'medium') : '';
    $default_cover = function_exists('devdjam_default_cover_url')
        ? devdjam_default_cover_url()
        : get_template_directory_uri() . '/assets/img/astro-cassette.png';
    wp_nonce_field('devdjam_beat_save', 'devdjam_beat_nonce');
    ?>
    <div class="dj-cover-field">
        <label><strong>封面图片</strong></label>
        <input type="hidden" id="dj-cover-id" name="_thumbnail_id" value="<?php echo esc_attr((string) ($thumb_id ?: '')); ?>">
        <div class="dj-cover-preview-box">
            <img id="dj-cover-preview" src="<?php echo esc_url($thumb_url ?: $default_cover); ?>" alt="封面预览" data-default-src="<?php echo esc_url($default_cover); ?>">
        </div>
        <p>
            <button type="button" class="button button-primary" id="dj-choose-cover">选择或上传封面</button>
            <button type="button" class="button" id="dj-remove-cover" <?php disabled(!$thumb_id); ?>>恢复默认封面</button>
        </p>
        <p class="description" id="dj-cover-hint"><?php echo $thumb_id ? '已设定自定义封面。' : '未设置封面，当前展示默认复古磁带封面。'; ?></p>
    </div>
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
        <p><label for="dj-key">调性（可选）</label><input type="text" maxlength="40" id="dj-key" name="dj_key" value="<?php echo esc_attr(get_post_meta($post->ID, '_dj_key', true)); ?>" placeholder="例如 F minor"></p>
    </div>
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
    if (isset($_POST['_thumbnail_id'])) {
        $thumb_id = absint($_POST['_thumbnail_id']);
        if ($thumb_id > 0) {
            set_post_thumbnail($post_id, $thumb_id);
        } else {
            delete_post_thumbnail($post_id);
        }
    }
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
        'title' => wp_strip_all_tags(get_the_title($post)),
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
            echo esc_html(($valid ? '已关联音频' : '待补充音频') . ($bpm ? ' · ' . $bpm . ' BPM' : ''));
        }
    }, 10, 2);
}
