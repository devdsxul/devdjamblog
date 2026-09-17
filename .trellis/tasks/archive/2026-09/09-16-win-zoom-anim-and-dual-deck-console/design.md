# Technical Design: 窗口放大动画过渡与DJ Deck双盘卡片化控制台

## Architecture Overview

### 1. 窗口缩放过渡动效
- **Maximize 动画**：`.window.is-max` 注入 `@keyframes winMaxIn`（常规窗口），以及专属于播放器的 `@keyframes winPlayerMaxIn`。
- **Restore 退出动画**：在 `site.js` 的 `restoreMaximized()` 中，为当前处于 `.is-max` 的窗口先挂载 `.is-unmax` 状态类，执行 150ms 的反向缩放淡出（`@keyframes winMaxOut`），之后再移除 `.is-max` 并清空状态，带来极其平滑自然的体验。
- **暗色遮罩过渡**：`.desk-dim` 改为透明度过渡动画。

### 2. DJ Deck 双盘与混音系统
- **DOM 结构**：
  在 `parts/player.php` 中划分两个视图形态：
  - `.player-compact`：常态侧边栏展示，即 Deck A 的极简形态；
  - `.player-pro`：`win-player.is-max` 状态下展示，内含三列控制台：
    - `col-deck-a`（左盘）
    - `col-mixer`（中置混音区，含双路电平推子、3段 EQ 与底部 Crossfader）
    - `col-deck-b`（右盘）
    - `row-library`（曲库面板，支持双盘装载）
- **音频引擎设计**：
  - 维护两套 Audio 实体与通道状态：
    - `channelA = { audio: #devdjam-audio-a, track, pitch, volume, isPlaying, ... }`
    - `channelB = { audio: #devdjam-audio-b, track, pitch, volume, isPlaying, ... }`
  - 交叉推子（Crossfader）值 `x` ∈ [0, 100]（默认 50）：
    - `x <= 50`: `gainA = 1`, `gainB = x / 50`
    - `x > 50`: `gainA = (100 - x) / 50`, `gainB = 1`
    - `audioA.volume = volumeA * gainA`
    - `audioB.volume = volumeB * gainB`
  - 搓碟机制：
    - 分别为 Deck A 与 Deck B 的转盘注册 Pointer 事件，根据各盘中心点计算转角角度增量（`delta`），实时修改对应 Audio 频道的 `currentTime`，松开后自动恢复播放（若先前处于播放中）。
