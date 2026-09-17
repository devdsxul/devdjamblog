# banner贴纸重构、文章封面隐藏与左侧边栏布局调整

## Goal

按照用户需求完成三项界面与交互调整：
1. 将所有贴纸的初始位置统一挪到顶部 banner 的左右两侧，删除 CD 和扬声器两款贴纸，并新增 cult、血腥、亚文化风格贴纸；
2. 文章详情页（single）不再显示后台上传的特色封面图（封面保留在文章列表卡片中）；
3. 左侧导航栏（dock）的 admin 后台链接与时间状态等置底，在 guestbook（guest）下方新增分割线及 spotify、instagram、tiktok 三个跳转链接（暂留空）。

## Requirements

### 1. Banner 贴纸重构与增删
- **删除指定贴纸**：彻底移除用户截图中的两款贴纸：
  - `cd.gif`（原挂在主内容窗口右下角）
  - `speaker.gif`（原位于右侧栏散装贴纸区）
- **贴纸初始位置统一集中在 Banner 左右两侧**：
  - 移除散落在各窗口边角（`at-br`, `at-bl` 等）和侧边栏（`.loose-left`, `.loose-right`）的初始贴纸布局。
  - 将全部贴纸分组放置在 `.site-banner` 的 `.banner-wing-left` 与 `.banner-wing-right` 中。
- **新增 Cult / 血腥 / 亚文化风格贴纸**：
  - 补充亚文化与 cult 风格素材（包含原有 skull, biohazard, bat, anarchy, dagger, eyeball, barbed-wire，并新生成/引入血迹/血刃/刀片等 cult 风格贴纸）。
  - 在 `functions.php` 中注册其尺寸规格，确保动效（spark, spin, wiggle, bounce）与可拖拽拖放功能（`data-sticker-id`）正常运作。
  - Banner 两翼贴纸排版优化：呈现出地下的 Y2K / 哥特 Zine 拼贴感，支持桌面端正常展示与自由拖拽到页面任意位置。

### 2. 文章详情页隐藏特色封面
- 修改 `wp-content/themes/devdjam/views/single.php`。
- 在进入文章详情页时，不再输出 `<figure class="single-cover">` 封面大图。
- 确保首页及文章归档列表（`archive.php`、`home.php`）上的封面缩略图仍然正常展示不受影响。

### 3. 左侧边栏布局与社媒外链
- **Admin 与时间置底**：
  - 左侧 `.dock` 为纵向 flex 容器，通过修改 `.dock-foot` 样式使其 `margin-top: auto`，沉底对齐。
- **Guest 分割线与社媒跳转**：
  - 在 guestbook 项下方添加视觉分割线 `.dock-divider`。
  - 分割线下添加三个社媒跳转链接：
    - Spotify
    - Instagram
    - TikTok
  - 链接地址暂时留空（如 `href="#"`），并配备匹配赛博/Win98风格的图标与文字，移动端适配正常。

## Acceptance Criteria

- [x] 页面上不再出现 `cd.gif` 和 `speaker.gif` 贴纸。
- [x] 初始加载时，所有贴纸均位于顶部 Banner 的左翼与右翼，窗口边缘和侧边栏不再有初始贴纸堆叠。
- [x] Banner 左右两侧展示丰富的 cult、血腥、亚文化风格贴纸，支持悬停特效及自由拖拽。
- [x] 点击文章进入详情页后，顶部不展示特色封面图，正文直接呈现。
- [x] 博客归档页与首页的文章封面缩略图依然完整保留。
- [x] 左侧栏的 admin 入口与时钟状态在各种高度下始终沉底对齐。
- [x] 在 guest 下方有分割线，并包含 Spotify、Instagram、TikTok 三个跳转条目（链接暂留空）。
- [x] `npm run check` 语法检查全部通过。
