# Technical Design: 首页Beat展示、Beat封面选择与默认封面及播放器队列默认展开

## Architecture & Data Flow

```
[WordPress Admin (dj_beat edit)]
    ├── 音轨资料 Meta Box
    │     ├── 封面选择按钮 -> wp.media (image) -> #dj-cover-id (_thumbnail_id)
    │     ├── 封面实时预览 -> #dj-cover-preview
    │     └── 默认封面回退 -> devdjam_default_cover_url() (cassette.gif)
    └── devdjam_save_beat() -> set_post_thumbnail() / delete_post_thumbnail()

[REST API: /devdjam/v1/tracks]
    └── devdjam_track($post)
          ├── 优先 get_the_post_thumbnail_url($post, 'medium')
          └── 若空回退 devdjam_default_cover_url() -> 传递给播放器打碟机贴纸

[Frontend: views/home.php]
    └── .home-pane-beats
          ├── WP_Query / get_posts('dj_beat')
          ├── .home-entry-list (缩略图、标题、BPM/调性/时间、dj_beat_button)
          └── 空状态: dj_empty('no beats yet', 'cassette')

[Frontend: parts/player.php]
    └── <details class="queue" open> -> 初始默认展开
```

## Component Changes

1. **`wp-content/themes/devdjam/functions.php`**:
   - 增加公用辅助函数 `devdjam_default_cover_url()`，返回复古磁带动图 URL：`get_template_directory_uri() . '/assets/gif/cassette.gif'`。

2. **`wp-content/plugins/devdjam-core/devdjam-core.php`**:
   - 在 `devdjam_track($post)` 中，若 `cover` 为空则回退至 `devdjam_default_cover_url()`；
   - 在 `devdjam_beat_meta_html($post)` 中，增加封面选择 UI（隐藏域 `_thumbnail_id`、预览框、选择按钮、重置为默认按钮、状态提示）；
   - 在 `devdjam_save_beat($post_id)` 中，增加保存 `_thumbnail_id` 的逻辑（若有值调用 `set_post_thumbnail`，若清空调用 `delete_post_thumbnail`）。

3. **`wp-content/plugins/devdjam-core/admin.js` & `admin.css`**:
   - `admin.js`: 监听 `#dj-choose-cover` 与 `#dj-remove-cover`，通过 `wp.media` 选择图片并更新预览与隐藏域；
   - `admin.css`: 添加封面选择区域及预览容器的 Win98 像素边框美化。

4. **`wp-content/themes/devdjam/views/home.php`**:
   - 在 `.home-pane-beats` 中执行 `get_posts` 查询发布的 `dj_beat`；
   - 渲染 `.home-entry-list`，包含封面缩略图、标题链接、BPM/Key、日期与 `dj_beat_button`；若无内容展示 `dj_empty`。

5. **`wp-content/themes/devdjam/views/archive.php`**:
   - 在 beat 归档页中，若无特色图片，回退展示默认磁带封面图片。

6. **`wp-content/themes/devdjam/parts/player.php`**:
   - 为 `<details class="queue">` 添加 `open` 属性，使其默认展开。

7. **`wp-content/themes/devdjam/assets/site.css`**:
   - 补充 `.home-entry-list` 及 `.home-beat-item` 的细化排版（间距、flex 对齐、播放按钮右对齐）。
