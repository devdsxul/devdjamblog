<?php
if (!defined('ABSPATH')) exit;

// 只包装主题使用的日历。日期、查询、链接仍由 WordPress 生成。
function dj_calendar() {
    global $wp_locale;
    $html = (string) get_calendar(array('display' => false));
    $period = '';
    $html = preg_replace_callback('/<caption>(.*?)<\/caption>/s', static function ($match) use ($wp_locale, &$period) {
        $caption = html_entity_decode(wp_strip_all_tags($match[1]), ENT_QUOTES, 'UTF-8');
        if (preg_match('/\b(\d{4})\b/u', $caption, $year)) {
            for ($month = 1; $month <= 12; $month++) {
                // 按核心当前 locale 的完整 caption 模板匹配，不猜中英文月份格式。
                $expected = sprintf(_x('%1$s %2$s', 'calendar caption'), $wp_locale->get_month($month), $year[1]);
                if ($caption === $expected) {
                    $period = sprintf('%04d-%02d', (int) $year[1], $month);
                    return '<caption data-calendar-date="' . esc_attr($period . '-01') . '" data-calendar-kind="caption">' . $match[1] . '</caption>';
                }
            }
        }
        return $match[0];
    }, $html);
    $day = (int) get_option('start_of_week');
    $html = preg_replace_callback('/<th\b[^>]*>.*?<\/th>/s', static function ($match) use (&$day) {
        return preg_replace('/<th\b/', '<th data-calendar-weekday="' . ($day++ % 7) . '"', $match[0], 1);
    }, $html);
    if ($period !== '') {
        $html = preg_replace_callback('/<a\b([^>]*)>(\d{1,2})<\/a>/', static function ($match) use ($period) {
            return '<a' . $match[1] . ' data-calendar-date="' . esc_attr($period . '-' . str_pad($match[2], 2, '0', STR_PAD_LEFT)) . '" data-calendar-kind="day">' . $match[2] . '</a>';
        }, $html);
    }
    $html = preg_replace_callback('/(<span class="wp-calendar-nav-(prev|next)"><a\b[^>]*>)(.*?)(<\/a>)/s', static function ($match) use ($wp_locale) {
        $text = trim(str_replace(array('«', '»'), '', html_entity_decode($match[3], ENT_QUOTES, 'UTF-8')));
        for ($month = 1; $month <= 12; $month++) {
            if ($text === $wp_locale->get_month_abbrev($wp_locale->get_month($month))) {
                return substr($match[1], 0, -1) . ' data-calendar-month="' . $month . '" data-calendar-kind="' . esc_attr($match[2]) . '">' . $match[3] . $match[4];
            }
        }
        return $match[0];
    }, $html);
    $processor = new WP_HTML_Tag_Processor($html);
    while ($processor->next_tag(array('tag_name' => 'NAV'))) {
        $processor->set_attribute('data-i18n-aria-label', 'previous and next months');
        $processor->set_attribute('aria-label', 'previous and next months');
    }
    echo $processor->get_updated_html(); // 核心生成的 HTML；新增属性逐项转义。
}

// 最终字段过滤保留核心的 checked/name/value 与是否启用 cookies 的条件。
add_filter('comment_form_field_cookies', static function ($field) {
    if (is_admin()) return $field;
    return preg_replace('/(<label\b[^>]*>).*?(<\/label>)/s', '$1' . dj_text('save comment details') . '$2', $field);
});

// Feed 文档内容不翻译；这里只规范前台 head 链接的界面标题模板。
add_filter('feed_links_args', static function ($args) {
    $args['feedtitle'] = '%1$s — RSS feed';
    $args['comstitle'] = '%1$s — comments feed';
    return $args;
});
add_filter('feed_links_extra_args', static function ($args) {
    foreach (array('cattitle', 'tagtitle', 'taxtitle', 'authortitle', 'searchtitle', 'posttypetitle') as $key) $args[$key] = '%1$s · %3$s — RSS feed';
    $args['singletitle'] = '%1$s · %3$s — comments feed';
    return $args;
});
