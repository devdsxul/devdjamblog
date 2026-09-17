# 移除Beat独立页面转为纯列表展示

## Goal

将 Beat 由原有的「可点击跳转单曲详情页」重构为纯展示与直接试听的列表模式，无需独立详情页面；在归档页和首页中取消指向独立单曲页面的超链接，并在外部直接访问单曲 URL 时自动 301 重定向到 Beat 归档列表页。

## Requirements

1. **Beat 列表纯展示重构**：
   - 在 `views/archive.php` 中：当 `$view === 'beats'` 时，封面及曲目标题不再使用 `<a>` 链接指向单曲详情页，改为展示元素；
   - 在 `views/home.php` 中：`.home-pane-beats` 列表中的封面与标题不再渲染指向单曲详情页的超链接；
   - 用户在首页与 Beats 列表页中均通过一键试听按钮（`dj_beat_button`）直接播放音频。

2. **移除独立单曲页面及重定向**：
   - 在 `functions.php` 中添加 `template_redirect` 钩子，当请求判定为 `is_singular('dj_beat')` 时，自动 301 重定向至 `/beats/` 归档列表；
   - 从 `views/single.php` 中移除针对 `dj_beat` 的单曲播放器模板残余。

## Acceptance Criteria

- [ ] 首页右下栏 Beat 列表中，条目封面与标题不再是指向单曲页面的超链接。
- [ ] `/beats/` 归档页中，Beat 卡片的封面与标题不再是指向单曲页面的超链接。
- [ ] 列表中的 `play` 试听按钮正常工作，点击即可与全局打碟机联动播放。
- [ ] 直接在浏览器中访问某个 Beat 的单个 URL（如 `/beats/<slug>/`）时，自动 301 重定向至 `/beats/` 列表页。
- [ ] 运行 `npm run check` 校验通过，无任何语法错误。
