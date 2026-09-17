# Implementation Plan: Banner 贴纸重构、文章封面隐藏与左侧边栏更新

## 执行步骤清单

- [x] **Step 1: 新增 Cult / 血腥 / 亚文化风格贴纸资源**
  - 使用 Python 脚本生成透明底低保真复古风格的 `blood-drip.gif` 和 `razor.gif` 并保存至 `wp-content/themes/devdjam/assets/gif/`。
  - 在 `wp-content/themes/devdjam/functions.php` 中将新 GIF 尺寸注册至 `$sizes` 数组中。

- [x] **Step 2: 调整 Banner 贴纸布局并移除旧贴纸**
  - 修改 `wp-content/themes/devdjam/index.php`：
    - 移除各窗口及侧边栏原有的贴纸挂载（彻底清除 `cd` 和 `speaker`，移除 window close 中的贴纸，移除 `.loose-left` 和 `.loose-right`）。
    - 在 `.banner-wing-left` 和 `.banner-wing-right` 中分别布置 cult / 血腥 / 亚文化组合贴纸。
  - 修改 `wp-content/themes/devdjam/assets/site.css`：
    - 优化 `.banner-wing`、`.banner-wing-left`、`.banner-wing-right` 的容器排版及旋转微调，确保各贴纸自然错落。

- [x] **Step 3: 隐藏单篇文章详情页中的封面**
  - 修改 `wp-content/themes/devdjam/views/single.php`：
    - 移除详情页中的 `<figure class="single-cover">` 封面图输出。
    - 保持列表及归档页封面图展示正常。

- [x] **Step 4: 左侧 Dock 栏 Admin 置底与社媒外链新增**
  - 修改 `wp-content/themes/devdjam/index.php`：
    - 在 guestbook 之后添加分割线 `.dock-divider`。
    - 添加 Spotify、Instagram、TikTok 跳转外链项（`href="#"` 暂留空）。
  - 修改 `wp-content/themes/devdjam/assets/site.css`：
    - 设置 `.dock-foot` 的 `margin-top: auto`，使其在侧边栏自然置底。
    - 添加 `.dock-divider` 和社媒链接项的样式，包括图标与悬停效果、移动端适配。

- [x] **Step 5: 语法与质量验证**
  - 运行 `npm run check` 确保 PHP 与 JS 语法 100% 通过。
  - 检查全屏及窄屏响应式布局，验证无样式破坏或脚本报错。

- [ ] **Step 6: Trellis 任务归档与工作流闭环**
