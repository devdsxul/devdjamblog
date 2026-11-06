# 前台视觉统一与 i18n（cult / neocities）

> 状态：2026-11-06 本地实现与验收完成，用户追加明确授权“提交推送，部署”。采用已评审的三套配色、浏览器默认语言与实底纸条方案。核验与接续记录见 `research/resume-audit.md`。

## Goal

在**现有**前台 UI 上做演进式打磨，不推倒重来：把散落的颜色、字体、间距、组件写法收拢成一套标准；沿 cult（cult 电影海报墙、哥特字、地下拼贴）与 neocities（手作个人站：贴纸、计数器、留言簿、跑马灯）方向把气质推得更纯；中英文界面切换做完整。

## 用户原话

> 你是一位拥有小众高级审美的另类先锋艺术家。尽你所能，在现有站点的ui上优化，统一，标准化风格，做好i18n，关键词 cult，neocities。

以 `/loop` 自定节奏执行。用户选择：建 Trellis 任务并先规划；**不做 git 提交**（改动留在工作区）。

## Confirmed Facts（仓库与浏览器证据）

- 前台由 `index.php` 输出整页骨架：进站门 `.enter`、横幅 `.site-banner`、左侧 dock、三栏 desk、底部状态栏；窗口统一走 `dj_window_open()`（`functions.php:119`）。
- 视觉现状：海报拼贴桌面 + 每窗口海报版（上一任务 `10-18-window-poster-collage`，已提交并部署，task 仍挂 in_progress）、烟黑半透标题栏（`site.css` `--bar-a/--bar-b`）、粉色强调 `#ff3d8a`、98.css 像素字体。`DESIGN.md` 仍写「粉白渐变标题栏」，与代码不一致。
- 字体：`site.css` 至少 9 套 font-family（像素 UI、Courier、黑体字、Georgia 斜体、系统字、宋体/仿宋小说栈等）。`assets/fonts/` 里 GrenzeGotisch / LuckiestGuy / Modak / RubikBubbles / TitanOne 五个文件（约 1.03 MB）没有任何 `@font-face` 引用；`assets/img/` 下 astro-bg.svg、banner-devdjam.png、site-bg.jpg、lavender-tile.png、stars-tile.png（约 0.71 MB）也未被引用，但都会进主题包。
- i18n 机制：`dj_text($key)` 输出 `<span data-i18n="key">key</span>`（`functions.php:46`）；`site.js:36-49` 有 79 键中文字典，`applyLanguage()` 只替换 `[data-i18n]` 的 textContent，**不处理 aria-label / title / placeholder / alt**。WordPress 站点语言为 zh_CN，核心输出（日历、评论表单 cookie 勾选、Feed 标题、分页 aria）永远是中文。
- 首访默认语言：`functions.php:42` 头部脚本与 `site.js:51` 均为「本地没存 zh 就用英文」，不看浏览器语言。中文用户整页加载时，文字在页脚 `site.js` 执行后才从英文切到中文。
- 基线扫描（`.runtime/cult-ui/audit.py` → `.runtime/cult-ui/before/i18n-report.json`）：共 38 组记录，分别为 12 页 × EN/ZH × 1440 宽的 24 组、3 页 × Ink/Cherry × EN × 1440 宽的 6 组、4 页 × EN/ZH × 390 宽的 8 组；不是完整的页面/语言/尺寸笛卡尔积。
  - EN 模式每页 4–6 处可见中文（学习小组卡「《我们是一个学习小组》」「第一章:」「已更 3 章」、日历「« 9 月」、留言簿 cookie 勾选文案），小说页约 100 处（阅读器整套界面是硬编码中文）；每页 47–73 个中文 aria-label / title（打碟机控件、日历星期、`主导航`、`站内打碟机` 等）。
  - ZH 模式每页 11–17 处可见英文 UI（skip link、学习小组卡 `we're a study group` / `read our novel` / `READ CH.01` / `NOVEL`、社交链接名等）；每页 60–70 个英文 aria-label（`Minimize`、`Deck 1 loop`、`Hot cue A: empty` 等）。
  - 已保存的 38 组记录均无 JS 报错与横向溢出，仅覆盖 1440 / 390 两个宽度；320 / 768 不在这份报告中。
  - 扫描排除了整个队列、曲库表体、跑马灯与日历表头等区域，且未操作语言切换、PJAX 或小说设置；错语言计数是启发式线索，不等于完整覆盖（`audit.py:23,31,41,45,58-62,75-81`）。
- 控制面板：README 写「前台控制面板可切换中/英文界面、三套配色和动效开关」，但模板只渲染 `.top-lang` 的 EN / 中文按钮。`site.js` 仍保留 `button[data-theme]`、`[data-lang-select]`、`[data-motion-toggle]` 的处理逻辑。Ink / Cherry 两套配色访客无法切换到；动效只能通过横幅上的 `eyeball-cyber` 贴纸（`data-sticker="fx"`）切换。`dev/qa.py:93` 仍断言 `[data-motion-toggle]` 存在。
- 本机 Node 为 v26，Playground 的原生模块 `fs-ext` 只带到 Node 25 的预编译包，`npm run dev` 启动失败；用本机已有的 Node 24（`%USERPROFILE%/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe`）运行 `dev/server.mjs` 正常。
- 2026-11-06 接续核验：上述 Node 24 路径仍存在；8787 / 8788 / 8797 当前未发现监听。启动成功是上一会话证据，本次没有重启或重跑浏览器。代码与主要风险定位见 `research/resume-audit.md`。

## Requirements

- **R1 统一视觉体系**：颜色、字号、间距、边框、阴影收成 token；按钮、徽章/标签、列表行、标题、表单、空状态、窗口外壳各有一份标准写法，删掉同义不同形的变体。
- **R2 cult / neocities 气质**：在现有素材（海报墙、GifCities 贴纸、Cameron's World、黑体字、计数器、留言簿、跑马灯）上加强手作拼贴感；不引入远程素材和新 JS 库，不造假内容（假徽章、假计数）。
- **R3 可读性**：海报继续可见，正文在任何主题下都清楚。正文、列表与表单使用实底纸条，海报留在外缘和空白处。
- **R4 完整 i18n**：前台 UI 的可见文字与 aria-label / aria-valuetext / title / placeholder / alt 都随语言切换；运行时生成的文案、小说阅读器界面、学习小组卡、前台出现的 WordPress 核心文案都覆盖。作者写的正文、标题、曲名、章节名保持原样。装饰图继续空 alt；品牌与 DJ 硬件缩写须有逐项例外表，不能整块排除控件。
- **R5 不破坏行为**：PJAX 切页、播放器跨页不断、打碟机输入坐标、窗口拖拽/最小化/最大化、贴纸拖拽、层级顺序、减少动态等契约保持；现有检查脚本通过，已过时的断言随实际行为更新。
- **R6 文档同步**：`DESIGN.md`、相关 spec、README / OWNER-GUIDE 与最终实现一致。

## Out of Scope

- wp-admin 后台与插件后台界面文案（站主自用，中文）。
- 小说正文、文章与音乐条目正文。
- 打碟机音频引擎与 DSP 行为。
- 原本地实施阶段不提交、推送或部署；2026-11-06 用户已另行授权本次提交、推送与生产部署。
- 服务器按语言渲染（语言仍是客户端偏好）。
- 删除未使用字体/图片、升级依赖、重建海报素材、改写管理员工具栏与外部平台界面。

## Acceptance Criteria

- [x] 12 类页面 EN / ZH 直接访问与切换语言后，应用拥有的 UI 文本及无障碍属性与预期字典一致；作者内容与明确的品牌/硬件例外单独记录。旧 `audit.py` 只作补充扫描，不以其零条结果替代定向断言。
- [x] 动态检查覆盖 PJAX/前进后退、播放/暂停、队列/曲库晚返回、Hot cue 空/已设、窗口最小化/最大化/还原、小说目录/设置/进度/换章；切换语言不重建音频对象，不重置阅读位置或表单输入。
- [x] 1440×900 与 390×844 截图：各窗口用同一套按钮、标签、列表行、标题写法；文字直接压在海报上的情况消失。
- [x] 正文对比度 ≥ 7:1，小字（日期、BPM、标签）≥ 4.5:1，覆盖保留的每套主题。
- [x] 320 / 390 / 768 / 1440 宽无横向溢出，无 JS 报错；减少动态与动效关闭时装饰动画停止。
- [x] `npm run check`、`node dev/check-simplification.mjs`、`node dev/check-state.mjs`、`node dev/check-deck-input.mjs` 通过。
- [x] 未保存偏好、已保存偏好、无效偏好、存储访问抛错均有明确定义；文档 `lang` 与最终 UI 语言一致，音频初始化失败不阻断基本翻译。

本地验收证据、取样范围与未覆盖边界见 [实施验收记录](research/implementation-validation.md)。生产发布事实另记于 `docs/DEPLOYMENT.md`。

## 已确认决策

- 配色：恢复 Milk / Ink / Cherry 的访客入口，沿用合法已存配色，三套均验收。
- 语言：尊重已存选择，首次按浏览器首选语言（zh-* → 中文，其余 → 英文）。
- 海报：正文、列表和表单使用实底纸条，海报留在外缘与空白区。
- 用户在评审摘要后明确“开始实现”；仅本地实现与验证，不暂存、提交、推送、打包或部署。
- 实施中追加确认：展开打碟机调亮（所有主题亮色面板，保留深色读数屏）；移除右上角动效按钮（原眼球贴纸保留）；访客区域只保留标题栏中的可见标签。
- 本地验收后，用户追加“提交推送，部署”：允许提交本任务代码/文档、推送 main，并按已核对清单增量部署主题。发布资源版本为 3.3.9；不包含数据库、文章、媒体或环境变更。
