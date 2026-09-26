# Design — Pioneer 风格 DJ 控制台 + 全站细节风格统一

## 1. 文件边界（并行开发的所有权）

| 文件 | 内容 | 负责方 |
|---|---|---|
| `assets/audio-engine.js`（新） | 纯音频引擎：Engine / Deck / Mixer / BeatFx / Sampler / 分析（BPM、拍网格、波形峰值），不碰 DOM | 主线 |
| `assets/deck-worklet.js`（新） | AudioWorklet 处理器 `devdjam-deck`：变速/反向读缓冲、搓碟跟随、循环、跳转淡化 | 主线 |
| `assets/deck.css`（新） | 紧凑播放器 + DDJ 控制台全部样式（从 site.css 迁出） | 主线 |
| `parts/player.php` | 紧凑播放器 + 控制台标记 | 主线 |
| `assets/site.js` | UI 控制器（紧凑视图、控制台视图、参数绑定、播放列表）+ 原 SPA/窗口/贴纸逻辑 | 主线 |
| `functions.php` | 资源注册（新增 deck.css / audio-engine.js / workletUrl）、`dj_icon` | 主线 |
| `assets/site.css` | 站点外壳与通用组件：标题栏、底部状态栏、滚动条、主题 token、移动任务栏、遮罩 | 风格子代理 |
| `index.php` | 底部状态栏标记 | 风格子代理 |

子代理不得修改主线文件；主线不在并行期修改 `site.css` / `index.php`。

## 2. 音频架构：流式 + 缓冲双模式

```
Deck N:  <audio> → MediaElementSource → streamGain ─┐
         Worklet voice (decoded PCM)  → bufferGain ─┴→ trim → 3-band isolator EQ → CFX(LP/HP)
         → preMeter(Analyser) → channel fader → FX insert(N) → crossfader gain → masterBus
Sampler → masterBus
masterBus → FX insert(M) → masterGain → limiter → splitter → L/R analysers ; limiter → destination
FX insert: in → dry → out ; in → send → BeatFx.input ; BeatFx.output → return → out
```

- **stream 模式**（默认）：`<audio>` 边下边播。普通访客点播放不下载整首、不解码（满足 R3）。支持播放/暂停/定位/变速（`playbackRate`, `preservesPitch=false`）/热点跳转/跳拍。
- **buffer 模式**：`fetch → decodeAudioData → Int16 → transfer 到 worklet`。支持有声搓碟（正反向）、精确循环、无爆音跳转。
- **触发解码**：控制台打开时（对已装载曲目）、控制台打开状态下装载新曲目、紧凑转盘被按下（搓碟意图）。解码期间 stream 继续播，完成后 60ms 交叉淡化无缝交接。
- **两种运行方式，同一份 DSP**：`deck-worklet.js` 用 IIFE 定义 `DeckCore`（纯计算类）。在 AudioWorklet 作用域里注册处理器 `devdjam-deck`；作为普通脚本加载到主线程时，把 `DeckCore` 挂到 `DEVDJAM.DeckCore`。
  - 安全上下文（HTTPS / localhost）→ AudioWorkletNode（音频线程，最稳）。
  - **生产站是纯 HTTP（非安全上下文，AudioWorklet 被浏览器禁用）** → ScriptProcessorNode(1024) 在主线程调用同一个 `DeckCore`。主线程重活（Int16 转换、分析）切片执行，单片 < 8ms，避免爆音。
  - 引擎对上层暴露同一个 voice 接口（`send(msg)` / `onReport`），Deck 不感知差异。
- 解码失败 → 留在 stream 模式，搓碟退化为静音拖动定位，循环按钮禁用，屏幕显示 `STREAM`。
- 内存：Int16 立体声，3 分钟曲目约 35MB/盘；AudioBuffer 用完即释放；分析结果按曲目 LRU 缓存（仅峰值与网格，~100KB）。

### Worklet 消息协议（主线程 → worklet）
`load{L,R,sampleRate}`（transfer）、`unload`、`play{ramp}`、`pause{instant}`、`seek{pos,fade}`、`tempo{rate}`、`bend{amount}`、`scratch{on}`、`scratchMove{target,velocity}`、`loop{in,out,active}`。
worklet → 主线程：每 ~11ms `pos{pos,rate,t}`；`ended`。主线程用 `ctx.currentTime` 外推位置做 60fps 画面。

### 搓碟控制律
主线程把手势角度换算为目标位置（1 圈 = 1.8s，33⅓ 转）与速度估计；worklet 以 `desired = v + (target_extrapolated − pos)·K` 追踪，速度一阶平滑（τ≈4ms），外推最多 40ms，手停则速度归零；`|rate|<0.05` 时淡出避免直流咔嗒。松手后按电机加速（τ≈50ms）回到速度。

## 3. 混音与效果
- EQ：LR4 三分频隔离器（220Hz / 2.4kHz），旋钮 −1…0…1 映射 kill(0)…0dB…+6dB。
- CFX：中心旁通，左低通 20k→60Hz，右高通 20→8kHz，带轻微谐振。
- 推子：通道 v² 曲线；Crossfader 中间两路全开、两端余弦切出（单盘收听音量不变）。
- MASTER 与紧凑播放器 `vol` 是同一个参数（持久化 `devdjam-volume`）；限幅器阈值 −1dB。
- BEAT FX：ECHO / REVERB / FLANGER / PHASER / ROLL / TRANS；拍值 1/8…8；CH 1/2/M；LEVEL/DEPTH；关闭后回声/混响自然拖尾，ROLL/TRANS 立即切回。
- SAMPLER：8 个 WebAudio 合成音色（HORN / SIREN / LASER / RISER / BOOM / KICK / CLAP / STAB），无外部素材。

## 4. 演奏逻辑（Deck）
- 拍网格：有 BPM 元数据时在 ±2 BPM 内细化，否则 60–190 BPM 自相关估算（120 为先验）；相位用梳状搜索低中频起音包络。
- CUE（CDJ 规则）、HOT CUE A–H（按曲目持久化到 localStorage，UI 层负责存取）、LOOP IN/OUT/EXIT/½X/2X（IN 长按 = 4 拍）、BEAT LOOP 1/4–32、BEAT JUMP ±1/2/4/8（循环中移动循环）、QUANTIZE 开关。
- BEAT SYNC：倍速/半速感知的速度匹配 + 相位对齐；被同步盘跟随主盘速度；手动推 TEMPO 退出同步。TEMPO 方向同 Pioneer（上 −、下 +），量程 ±6/10/16/50。
- Deck 1 = 站点播放列表：控制台关闭时播完自动下一首；控制台打开时像真实唱盘一样停在曲尾。Deck 2 只在控制台装载，关控制台后继续播放，紧凑屏显示 `2▶` 提示。

## 5. 界面
- 布局：顶部 LCD 屏（两轨滚动波形 + 信息行 + 总览波形可点击定位）→ Deck 1 | Mixer（BEAT FX、LOAD/BROWSE、双通道条、MASTER 表、Crossfader）| Deck 2（镜像：TEMPO 在外侧）→ 曲库浏览器。
- Deck：LOOP 行 → Jog（外圈=弯音，顶盘=搓碟，顶盘显示封面并随音频位置精确旋转）+ TEMPO 列（SYNC/MASTER/推子/量程）→ 打击垫模式键 → 8 垫 → SHIFT/CUE/PLAY。
- 自定义旋钮/推子组件：`role="slider"`、键盘可调、双击复位、指针拖动；参数存储单一来源，紧凑与控制台两处视图同步。
- 风格：白底黑线、硬阴影、0 圆角（旋钮/转盘为硬件圆形例外）、像素字 + 等宽读数、黑色 LCD、垫灯使用站点星光色板（粉/青/黄/绿/紫）、哥特体 DEVDJAM 铭牌。

## 6. 全站风格统一（R4，子代理）
- 标题栏：去纯黑，改浅色渐变（Win98 渐变结构 + 淡粉 → 白），黑字、1px 黑色下边线；按钮在 ink 主题可见。
- 新增 token：`--bar-a/--bar-b/--bar-ink`、`--accent-soft/--accent-line`；清理硬编码颜色（dock 悬停、分隔线、语言按钮等）。
- 底部状态栏：Win98 status bar（© DEVDJAM | 跑马灯标语 + 正在播放 | LED + 时钟），≥601px 显示，≤600px 由底部任务栏承担；桌面端 dock 中重复的正在播放/时钟隐藏。
- admin bar：视口锁高扣除 `--wp-admin--admin-bar--height`，`.top-lang` 下移，登录后底部不再被截断。
- 滚动条、移动任务栏按钮、遮罩（像素抖动代替模糊）统一到站点风格。

## 7. 兼容与回滚
- 保留 `#devdjam-audio` 及紧凑播放器全部 `data-*` 钩子（跨页不断播、qa 选择器）。
- `window.DEVDJAM` 仍是唯一全局；内联配置改为 `Object.assign` 合并，引擎挂 `DEVDJAM.createEngine`。
- 回滚：还原 `parts/player.php`、`assets/site.js`、`functions.php`，删除三个新文件并把 deck.css 内容并回 site.css 即可。
