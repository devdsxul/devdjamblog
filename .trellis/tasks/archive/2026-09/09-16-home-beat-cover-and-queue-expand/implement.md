# Implementation Plan: 首页Beat展示、Beat封面选择与默认封面及播放器队列默认展开

## Execution Steps

1. **Step 1: 辅助函数与默认封面支持 (`functions.php`)**
   - 在 `wp-content/themes/devdjam/functions.php` 中增加 `devdjam_default_cover_url()`。

2. **Step 2: 播放器队列默认展开 (`parts/player.php`)**
   - 在 `wp-content/themes/devdjam/parts/player.php` 中将 `<details class="queue">` 修改为 `<details class="queue" open>`。

3. **Step 3: 首页 Beat 列表展示 (`views/home.php`) 与样式适配 (`assets/site.css`)**
   - 在 `wp-content/themes/devdjam/views/home.php` 中查询已发布的 `dj_beat` 并输出条目与播放器按钮；
   - 在 `wp-content/themes/devdjam/assets/site.css` 中补齐 `.home-entry-list` 交互与排版微调。

4. **Step 4: 归档页默认封面回退 (`views/archive.php`)**
   - 在 `wp-content/themes/devdjam/views/archive.php` 中统一回退默认封面。

5. **Step 5: 后台 Beat 封面选取与保存 (`devdjam-core.php`, `admin.js`, `admin.css`)**
   - 在 `wp-content/plugins/devdjam-core/devdjam-core.php` 的 `devdjam_beat_meta_html` 增加封面选择字段与预览；
   - 在 `devdjam_save_beat` 中处理 `_thumbnail_id` 保存；
   - 在 `devdjam_track` 中支持封面默认值回退；
   - 在 `admin.js` 中接入 `wp.media` 图片选择与重置逻辑；
   - 在 `admin.css` 中增加封面预览样式。

6. **Step 6: 质量验证**
   - 运行 `npm run check` 确保所有 PHP 和 JS 语法合规；
   - 验证各文件语法与边界情况。

## Validation Plan

- [ ] 运行 `npm run check`，无任何语法错误；
- [ ] 检查 `views/home.php` 生成的 HTML 结构及空状态回退；
- [ ] 检查 `parts/player.php` 中 `<details class="queue" open>`；
- [ ] 检查 `devdjam-core.php` 中 `_thumbnail_id` 保存和 `devdjam_track` 封面回退；
- [ ] 检查 `admin.js` 中媒体库调起与事件绑定。
