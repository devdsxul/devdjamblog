# Technical Design: 移除Beat独立页面转为纯列表展示

## Overview

Beat 在 DEVDJAM 中定位于轻量音频节拍库，用户主要需求为快速浏览列表、查看元数据（BPM、调性、日期、封面）并一键试听。独立页面不仅增加不必要的路由与空内容页面，也割裂了试听体验。将 Beat 统一收敛为纯展示列表。

## Architecture & Logic Flow

```
[User visits /beats/]
    └── views/archive.php (beat-grid)
          ├── 封面: .entry-cover.beat-cover (div, 无 <a>)
          ├── 标题: <h3><span>Title</span></h3> (无 <a>)
          ├── 元数据: BPM, Key, Date
          └── 试听: dj_beat_button(ID) -> 触发 DJ Deck 播放

[User visits / (Home)]
    └── views/home.php (.home-pane-beats)
          ├── 封面: .entry-thumb (div, 无 <a>)
          ├── 标题: .entry-name (span, 无 <a>)
          ├── 元数据: BPM, Key, Date
          └── 试听: dj_beat_button(ID) -> 触发 DJ Deck 播放

[User / Bot accesses /beats/<slug>/ directly]
    └── template_redirect hook in functions.php
          └── if (is_singular('dj_beat'))
                └── wp_safe_redirect(get_post_type_archive_link('dj_beat'), 301); exit;
```

## Component Changes

1. **`wp-content/themes/devdjam/functions.php`**:
   - 增加 `template_redirect` 监听，拦截 `is_singular('dj_beat')` 并 301 重定向到 `/beats/`。

2. **`wp-content/themes/devdjam/views/archive.php`**:
   - 当 `$view === 'beats'` 时，封面与标题渲染为纯展示标签，移除指向单曲页面的 `<a>` 超链接。

3. **`wp-content/themes/devdjam/views/home.php`**:
   - 将 Beat 条目的封面与标题外层 `<a>` 移除，替换为 `div.entry-thumb` 与 `span.entry-name`。

4. **`wp-content/themes/devdjam/views/single.php`**:
   - 移除 `get_post_type() === 'dj_beat'` 的单曲播放器模板块。
