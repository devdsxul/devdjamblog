# Implementation Plan: 窗口放大动画过渡与DJ Deck双盘卡片化控制台

## Execution Steps

1. **Step 1: 窗口放大与恢复缩放动画 (`site.css` & `site.js`)**
   - 在 `site.css` 中添加 `@keyframes winMaxIn`, `@keyframes winMaxOut`, `@keyframes winPlayerMaxIn`, `@keyframes winPlayerMaxOut`；
   - 优化 `.desk-dim` 的透明度过渡；
   - 在 `site.js` 的 `restoreMaximized` 中增加 `.is-unmax` 延时退出机制，并为 `setWindow` 提供平滑动画支持。

2. **Step 2: DJ Deck 双盘模板重构 (`parts/player.php`)**
   - 保留原有 `.player-compact` 结构，保证侧边栏常态完全兼容不受影响；
   - 新增 `.player-pro` 容器（放大专用）：
     - Deck A：LCD 标题/时间、进度条、大黑胶盘带唱臂与封面贴纸、音高推子、播放/暂停/Cue/Loop 控制；
     - Central Mixer：BPM 计数器、3 段 EQ 旋钮/推子、Deck A 音量推子、Deck B 音量推子、底部水平 Crossfader；
     - Deck B：LCD 标题/时间、进度条、大黑胶盘带唱臂与封面贴纸、音高推子、播放/暂停/Cue/Loop 控制；
     - Library / Queue：曲目选择装载列表，支持 `[Load to Deck A]` 和 `[Load to Deck B]`；
   - 包含双通道 `<audio id="devdjam-audio-a">` 与 `<audio id="devdjam-audio-b">`。

3. **Step 3: DJ Deck 双盘与混音系统逻辑实现 (`site.js`)**
   - 升级音频控制器为双通道（Deck A / Deck B）：
     - 加载曲目到指定 Deck；
     - 各自独立的 play/pause、seek、pitch、volume；
     - 交叉推子联动双通道增益计算；
     - 双盘独立的黑胶搓碟支持（计算各盘角度并修改各通道 `currentTime`）；
     - 双盘唱臂联动、旋转动效与封面渲染；
     - 保持与全站常规播放按钮（`data-track-id`）兼容（默认投送至 Deck A）。

4. **Step 4: 双盘与卡片化样式定义 (`site.css`)**
   - `.win-player.is-max` 样式：`left: 50%; top: 50%; width: min(940px, 94vw); max-height: min(880px, 92vh); transform: translate(-50%, -50%);`；
   - `.player-pro` 双盘并排布局、中置混音台背景、黑胶质感、复古推子槽、LED 显示器与像素边框。

5. **Step 5: 验证与调试**
   - 运行 `npm run check`；
   - 本地浏览器测试：
     - 点击各窗口放大与关闭动画；
     - 放大 DJ Deck，验证卡片化立体外观；
     - 分别载入两首不同的 Beat 到 Deck A 与 Deck B；
     - 分别播放，测试交叉推子混音效果；
     - 测试双盘搓碟效果。

## Validation Plan

- [ ] `npm run check` 检查全部通过；
- [ ] 窗口放大/恢复具备弹性缩放动画；
- [ ] 放大 DJ Deck 呈现居中双盘卡片；
- [ ] Deck A 与 Deck B 可分别播放不同音频，交叉推子能平滑混音；
- [ ] 搓碟功能在 Deck A 与 Deck B 均正常工作。
