# Implementation Plan: 移除Beat独立页面转为纯列表展示

## Execution Steps

1. **Step 1: 路由重定向与单一入口收敛 (`functions.php`)**
   - 在 `wp-content/themes/devdjam/functions.php` 中添加 `template_redirect` 动作；
   - 检查 `is_singular('dj_beat')`，命中时调用 `wp_safe_redirect(get_post_type_archive_link('dj_beat') ?: home_url('/beats/'), 301); exit;`。

2. **Step 2: 归档页纯列表化改造 (`views/archive.php`)**
   - 当 `$view === 'beats'` 时，卡片封面渲染为 `<div class="entry-cover beat-cover">...</div>`（带图，无超链接）；
   - 标题渲染为 `<h3><span>...</span></h3>`（无超链接）；
   - 保留元数据与一键试听按钮。

3. **Step 3: 首页 Beat 列表纯展示化 (`views/home.php`)**
   - 将 `.home-pane-beats` 列表中的封面与标题由 `<a>` 调整为 `div.entry-thumb` 与 `span.entry-name`。

4. **Step 4: 清理单页模板残余 (`views/single.php`)**
   - 移除 `views/single.php` 中的 `dj_beat` 单曲专属分支。

5. **Step 5: 验证与测试**
   - 运行 `npm run check` 检查语法；
   - 使用 `curl` 验证直接访问 `/beats/purplebeat-142/` 时返回 301 状态并重定向至 `/beats/`；
   - 使用 `curl` 验证首页与归档页中的 HTML 不再包含指向该单曲页面的超链接。

## Validation Plan

- [ ] `npm run check` 通过；
- [ ] `curl -I http://127.0.0.1:8787/beats/purplebeat-142/` 返回 301 重定向；
- [ ] 检查首页和 `/beats/` 列表页 HTML 输出无 `href=".../beats/purplebeat-142/"`。
