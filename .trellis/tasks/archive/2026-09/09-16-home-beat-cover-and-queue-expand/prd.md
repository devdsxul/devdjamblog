# 首页Beat展示、Beat封面选择与默认封面及播放器队列默认展开

## Goal

在首页右下栏展示已上传的 Beat 列表（支持直接试听、查看元数据与封面），在 WordPress 后台发布 Beat 时支持直接选取或上传封面并在未上传时回退使用默认复古磁带封面，同时将右侧 DJ Deck 播放器的播放队列默认展开显示。

## Requirements

1. **首页 Beat 专区列表展示（右下栏）**：
   - 在 `views/home.php` 的 `.home-pane-beats` 区域中，查询已发布的 `dj_beat`（按时间倒序）；
   - 每个 Beat 条目展示缩略封面（已上传封面或默认磁带封面）、曲名（可点击进入单曲页）、BPM/调性及日期，以及一键试听播放按钮（`dj_beat_button`）；
   - 无 Beat 时展示复古空状态（`dj_empty`）；
   - 保持与整体 Win98 / Cyber-goth 风格严丝合缝，不破坏三区无缝相接布局。

2. **Beat 发布/编辑封面选择与默认回退**：
   - 在 `devdjam-core` 插件的 Beat 编辑页面「音轨资料（Tape details）」面板中增加清晰的「封面图片」选择器（支持预览当前封面、打开媒体库选取/上传封面、以及一键恢复为默认封面）；
   - 保存时同步更新 WordPress 原生特色图片（`_thumbnail_id`）；
   - 当 Beat 未上传封面时，在整个网站（后台预览、首页列表、归档页、以及 REST API `/tracks` 传递给播放器打碟机转盘）均统一回退使用默认复古封面（`assets/gif/cassette.gif`）。

3. **DJ Deck 播放器队列默认展开**：
   - 在 `parts/player.php` 中将 `<details class="queue">` 设置为默认展开状态（`open`），使用户进入网站时能够直接看到当前的播放列表。

## Acceptance Criteria

- [ ] 首页右下栏（`.home-pane-beats`）正确渲染已发布的 Beat 列表，条目包含封面、曲名、BPM/Key/日期与播放按钮。
- [ ] 点击首页 Beat 的播放按钮可联动 DJ Deck 播放器播放该音频。
- [ ] 后台编辑 Beat 界面有直观的封面选择/上传按钮与实时预览，保存后能成功保存所选封面。
- [ ] 未上传封面的 Beat 在前台与播放器转盘中均自动显示默认封面（复古磁带）。
- [ ] 页面加载后，DJ Deck 的 `queue` 默认处于展开状态，显示曲目列表。
- [ ] 执行 `npm run check` 语法检查全部通过，无 PHP 或 JS 报错。
