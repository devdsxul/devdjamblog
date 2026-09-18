# Technical Design: 移动端响应式布局与触控体验

## 1. 架构与断点策略

```
+-------------------------------------------------------------+
| 桌面大屏 (> 980px)  : 左固定 216px Dock + 三栏 Win98 桌面     |
+-------------------------------------------------------------+
| 平板与中屏 (601~980px): 左紧凑 212px Dock + 双栏/折叠日历     |
+-------------------------------------------------------------+
| 移动手机屏 (<= 600px) : 底部 Win98 任务栏 + 100% 全宽单列主视口|
+-------------------------------------------------------------+
```

DEVDJAM 属于原生样式驱动的复古 Win98 博客。本次改造在 `wp-content/themes/devdjam/assets/site.css` 中引入并重构 `<= 600px` 断点，精准定义手机端体验。

---

## 2. Win98 经典底部任务栏 (Taskbar) 详细规范

### DOM 结构复用与重排
当前 `index.php` 中的 `<nav class="dock">` 结构保持不变：
```html
<nav class="dock" aria-label="主导航">
  <a class="dock-logo" href="...">...</a> <!-- 对应任务栏“开始 / DEVDJAM”按钮 -->
  <div class="dock-nav">                 <!-- 对应任务栏正在运行的程序/栏目列表 -->
    <a href="..." data-nav="home">...</a>
    ...
  </div>
  <div class="dock-foot">                <!-- 对应任务栏右侧系统托盘（LED + 像素时钟） -->
    ...
  </div>
</nav>
```

### 移动端 CSS 样式映射 (`@media (max-width: 600px)`)
- **任务栏容器 (`.dock`)**：
  ```css
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  width: 100vw;
  height: 44px;
  background: var(--win);
  border-top: 2px solid #fff;
  border-bottom: none;
  box-shadow: 0 -2px 0 var(--line), inset 0 1px 0 #dfdfdf;
  z-index: 9999;
  display: flex;
  align-items: stretch;
  padding: 3px 4px calc(3px + env(safe-area-inset-bottom, 0px)) 4px;
  gap: 4px;
  ```
- **开始按钮 (`.dock-logo`)**：
  - 呈现 Win98 经典「凸起开始按钮」风格：`box-shadow: inset -1px -1px #0a0a0a, inset 1px 1px #fff, inset -2px -2px #808080, inset 2px 2px #dfdfdf;`
  - 激活或按压时凹陷：`box-shadow: inset -1px -1px #fff, inset 1px 1px #0a0a0a;`
  - 尺寸固定，仅显示 Win98 像素徽标与粗体 "DEVDJAM"。
- **栏目切换条 (`.dock-nav`)**：
  - `display: flex; flex: 1; min-width: 0; overflow-x: auto; gap: 4px;`
  - `-webkit-overflow-scrolling: touch; scrollbar-width: none;`（隐藏原生粗暴滚动条，保留滑动触感）。
  - 每个栏目按键呈现 Win98 任务栏标签页：未选时微凸，当前激活栏目（`[aria-current="page"]`）呈现被按下的点阵凹陷网格底纹与阴影。
- **系统托盘 (`.dock-foot`)**：
  - 呈现 Win98 经典「凹陷托盘区」：`border: 1px solid; border-color: #808080 #fff #fff #808080;`
  - 紧凑展示播放动态 LED 指示灯与等宽像素时钟 (`.dock-clock`)。

---

## 3. 桌面主体 100% 全宽适配

1. **清除左侧挤压**：
   - 移除 `.desk-layout` 的横向间距，`.desk` 设为 `margin: 0; width: 100%; max-width: 100%;`。
   - 根容器 `.desk-layout` 底部添加 `padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px));`，防止内容滚动到底部时被常驻任务栏遮挡。
2. **移动端纵向堆叠顺序 (`order`)**：
   - `.col-main`（主内容窗口）：`order: 1; width: 100%;`。用户进站第一眼直达核心文章与音乐。
   - `.col-left`（访客数与打碟机）：`order: 2; width: 100%;`。
   - `.col-right`（日历）：`order: 3; width: 100%;`。
3. **内容区域内边距与字体优化**：
   - `#site-content` 内边距收窄至 `8px`，最大化释放有效阅读宽度。
   - 文章排版 `.prose`：字号维持在 `14px~15px`，行高 `1.65`，排版舒适不局促。

---

## 4. 触控人体工程学设计 (Touch Ergonomics)

1. **窗口操作按钮**：
   - `.title-bar-controls button`：增加 `:before` 绝对定位伪元素扩展触控面积至 `38px x 38px`，同时保持视觉像素按钮精致小巧。
2. **音频控制热区**：
   - `.play-button`、`.track-button`、上一首/下一首：最小触控面积 `40px x 40px`。
   - 移动端滑块 Thumb（进度与推子）：增大触点半径，避免大拇指拖动时频繁滑脱。
3. **防自动缩放 (iOS Safari Fix)**：
   - 所有 `<input>`、`<textarea>`、`<select>` 元素在 `<= 600px` 时固定 `font-size: 16px;`，防止聚焦时屏幕被强制放大导致排版错乱。
4. **防横向撑爆**：
   - `.prose pre`、`.prose table`、`img`、`iframe` 明确配置 `max-width: 100%; overflow-x: auto;`。

---

## 5. 兼容性与回滚策略

- **样式隔离**：全部手机端改动严格限定在 `@media (max-width: 600px)` 及其嵌套作用域中，完全不触碰、不影响大屏桌面端（`> 600px`）既有三栏与左 Dock 表现。
- **验证机制**：改动前后执行 `npm run check`，并通过浏览器多分辨率视口（360px, 375px, 390px, 414px, 430px, 768px, 1200px）全流程回归验证。
