<?php
// 在已安装并启用 SlimStat 的 WordPress CLI 上下文中执行；不通过公开 HTTP 入口改设置。
if (!defined('ABSPATH') || PHP_SAPI !== 'cli') {
    exit;
}
if (!class_exists('wp_slimstat') || !defined('SLIMSTAT_ANALYTICS_VERSION') || SLIMSTAT_ANALYTICS_VERSION !== '5.5.0') {
    throw new RuntimeException('Install and activate SlimStat Analytics 5.5.0 before configuring analytics.');
}

// 合并配置以保留插件生成的 secret；重复执行不会重置访问记录或站点内容。
$settings = array_merge(wp_slimstat::$settings, array(
    'is_tracking' => 'on',
    'javascript_mode' => 'on',
    'tracking_request_method' => 'ajax',
    'track_admin_pages' => 'no',
    'anonymize_ip' => 'off',
    'hash_ip' => 'off',
    'gdpr_enabled' => 'off',
    'anonymous_tracking' => 'off',
    'set_tracker_cookie' => 'on',
    'use_slimstat_banner' => 'off',
    'do_not_track' => 'on',
    'ignore_capabilities' => 'manage_options',
    'ignore_bots' => 'on',
    'ignore_prefetch' => 'on',
    'ignore_content_types' => 'login',
    'auto_purge' => 90,
    // SlimStat 5.5.0 中 no 表示直接清理；on 会移入归档，不能限制总数据量。
    'auto_purge_delete' => 'no',
    'geolocation_provider' => 'disable',
    'enable_cdn' => 'no',
    'enable_browscap' => 'no',
    'enable_sov' => 'no',
    'convert_ip_addresses' => 'no',
    'add_dashboard_widgets' => 'no',
    'display_notifications' => 'no',
    'notice_latest_news' => 'no',
    'capability_can_view' => 'manage_options',
    'capability_can_customize' => 'manage_options',
    'capability_can_admin' => 'manage_options',
    'can_view' => '',
    'can_customize' => '',
    'can_admin' => '',
    'rest_api_tokens' => '',
    'slimstat_debug' => 'off',
    'show_sql_debug' => 'no',
));
update_option('slimstat_options', $settings);
wp_slimstat::$settings = $settings;
if (!wp_next_scheduled('wp_slimstat_purge')) {
    wp_schedule_event(time() + HOUR_IN_SECONDS, 'twicedaily', 'wp_slimstat_purge');
}
wp_clear_scheduled_hook('wp_slimstat_update_geoip_database');

echo "SlimStat configured: full IPs, browser tracking, 90-day retention, administrator-only reports.\n";
