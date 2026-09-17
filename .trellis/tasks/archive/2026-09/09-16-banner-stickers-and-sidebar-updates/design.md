# Technical Design: Banner 贴纸重构、文章封面隐藏与左侧边栏更新

## 1. 架构与改动范围

本项目为基于 WordPress 的经典 Win98 赛博哥特风格主题，核心代码位于 `wp-content/themes/devdjam/`：
- `index.php`：整站主骨架结构（Banner、左侧 Dock、三栏桌面 Desk、各窗口挂载点）。
- `views/single.php`：文章详情页模板。
- `assets/site.css`：整站样式表，包含 Banner 两翼、Dock 导航栏、贴纸定位等。
- `functions.php`：贴纸输出辅助函数 `dj_sticker`、动图尺寸注册 `dj_gif` 等。
- `assets/gif/`：贴纸 GIF 资源目录。

## 2. 详细设计

### 2.1 Banner 贴纸体系重构
1. **清理与删除**：
   - 从模板中彻底删除 `cd` 和 `speaker` 贴纸引用。
   - 清理 `index.php` 中各窗口 `dj_window_close(...)` 的贴纸参数，以及两侧栏底部的 `.loose-left` 和 `.loose-right` 区域。
2. **两翼布局与贴纸分发**：
   - 调整 `.site-banner` 的 `.banner-wing-left` 与 `.banner-wing-right`，采用弹性流式布局（`flex-wrap: wrap`, `max-width: 200px`），贴纸尺寸控制在 36px~48px，轻微自然旋转与倾斜，形成酷炫的地下 Zine 艺术贴纸拼贴。
   - 左翼贴纸组合（Cult / 血腥 / 亚文化）：
     - `dagger`（带血匕首）
     - `blood-drip`（滴血动画）
     - `biohazard`（生化标志）
     - `anarchy`（无政府 A 字标）
     - `bat`（黑夜蝙蝠）
   - 右翼贴纸组合（暗黑 / 机械 / 邪典）：
     - `skull-chrome`（电镀金属骷髅）
     - `razor`（朋克刀片/亚文化）
     - `eyeball-3d`（3D 悬浮眼球）
     - `gargoyle-bat`（石像鬼飞翼）
     - `barbed-wire`（铁丝网）
     - `alien-glow`（荧光外星人）
   - 保持所有贴纸使用 `dj_sticker($gif, $action, $anim)`，继续支持原生的拖拽（HTML5 pointer events）和点击特效。
3. **新增资源支持**：
   - 使用 Pillow 渲染并生成透明背景、低保真地下 Cult 风格的 `blood-drip.gif` 和 `razor.gif`。
   - 在 `functions.php` 的 `dj_gif` 尺寸表中注册新增文件。

### 2.2 文章详情页（single.php）封面图隐藏
- 在 `wp-content/themes/devdjam/views/single.php` 中：
  - 移除 `<figure class="single-cover"><?php the_post_thumbnail('large'); ?></figure>`。
  - 用户进入文章后，顶部不再渲染大图封面，直接展示标题、元信息（日期、标签）以及正文内容。
  - 列表页（`views/archive.php` 及 `views/home.php`）保持不变，文章卡片继续正常显示封面缩略图。

### 2.3 左侧导航栏（Dock）布局优化与社媒新增
1. **Admin 与时间置底**：
   - `.dock` 当前设置了 `display: flex; flex-direction: column; height: 100%;`。
   - 将 `.dock-foot` 的 `margin-top` 由 `8px` 改为 `auto`。
   - 这样不论浏览器窗口高度如何拉伸，`.dock-foot`（包含后台入口、播放器状态和时钟）都会被自动顶到底部。
2. **Guest 分割线与社媒跳转条目**：
   - 在 `index.php` 的 `dock-nav` 循环结束后（即在 guestbook 下方），添加分割线 `.dock-divider`。
   - 新增三个链接条目：
     - `spotify`
     - `instagram`
     - `tiktok`
   - 链接样式复用或扩展 `.dock-social a`，与现有导航项保持相同的 Win98 像素/复古风，配备对应的 SVG 图标，`href="#"` 暂时留空。
   - 移动端（`max-width: 720px`）自适应处理：与其他导航图标保持统一大小与居中。

## 3. 兼容性与质量验证
- 语法兼容：运行 `npm run check` 验证 PHP 8.3 与 JavaScript 语法。
- 样式验证：检查响应式断点（桌面端、980px、720px 移动端），确保两翼贴纸和侧边栏外链布局均无横向溢出。
