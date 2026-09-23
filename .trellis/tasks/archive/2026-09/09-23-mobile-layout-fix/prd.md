# 移动端布局优化

## Goal

修复站点在手机与窄屏平板（≤ 720px）上的布局缺陷，让开屏页、首页、弹出窗口（最大化）、打碟机在
320px ~ 720px 全部可用、可见、不遮挡、不飞出屏幕。延续 Win98 白底黑线美学与已有的底部任务栏方案。

## Background / Confirmed Facts（仓库与真机模拟截图证据）

- 主题样式集中在 `assets/site.css`（3005 行），移动端规则分两层：
  `@media (max-width: 720px)`（2557 行起）与 `@media (max-width: 600px)`（2628 行起）。
- 工作区存在**未提交**的 site.css 改动（+100/-103 行）与规范文件一行新增，方向是：手机端解除
  `html/body` 的 100dvh 锁高改为整页自然滚动、横幅改纵向、`.pro-console` 改单列。
  该改动没有 journal 记录，本次扫描即基于这份工作区代码。
- 上一个移动端任务 `09-18-mobile-responsive` 已归档（提交 `506ccfe`），落地了 ≤600px 底部任务栏、
  触控热区、iOS 16px 输入字号。
- 验收工具：`npm run check`（语法）与 `python dev/qa.py`（Playwright，视口 320/390/768/1440 无横向溢出、
  导航项不出界）。本次扫描用 Playwright 真机模拟（iPhone UA、触屏、DPR 2）跑了 320/390/430/640 四个宽度，
  覆盖开屏页、首页、Beats 列表、留言簿、文章页、最大化内容窗、最大化打碟机。

### 扫描结论：正常的部分

- 320/390/430/640 全部页面 `scrollWidth == innerWidth`，无全局横向溢出；任务栏 12 项全部在视口内。
- 首页、Beats、留言簿、文章页在 ≤600px 纵向流动正常，日历表格铺满窗口，表单输入正常。

### 扫描结论：缺陷清单（按严重度）

| ID | 严重度 | 现象 | 根因 / 锚点 |
|----|--------|------|-------------|
| D1 | 高 | 600–720px（如 640px）最大化打碟机整个飞出屏幕（实测窗口 left -225 / top -388），完全不可用 | `.window.win-player.is-max { transform: none }`（site.css:2606）无 `!important`，被 `winPlayerMaxIn` 动画 `fill-mode: both` 的末帧 `translate(-50%,-50%)`（site.css:563-570）覆盖。≤600px 那层用了 `!important` 所以正常 |
| D2 | 高 | ≤600px 开屏页（you are now entering）被底部任务栏盖在上面 | `.enter` z-index 999（site.css:2315）< `.dock` 移动端 z-index 9999（site.css:2683） |
| D3 | 中 | ≤600px 任意窗口最大化后，右上角 EN/中文 语言切换器压住窗口标题栏的 最小化/最大化 按钮 | `.top-lang` z-index 250（site.css:2261）> `.window.is-max` z-index 150（site.css:591）；移动端 `.top-lang` 改 static 后仍与 fixed 弹窗重叠 |
| D4 | 中 | 600–720px 首页头图封面变成全宽 1:1 大方块（640px 下高约 600px），首屏被一张图占满 | 720 层 `.home-hero-cover { width:100%; aspect-ratio:1/1 }`（site.css:2613），600 层才改回左侧 112px 小方块（site.css:2950） |
| D5 | 中 | ≤390px 最大化打碟机内 曲库表格（pro-library）比窗口宽（320px 下右边 367 > 320），内容被裁 | `.pro-library-table` 5 列固定 padding，`.pro-library-table-wrap` 只有 `overflow-y:auto`（site.css:1315-1345） |
| D6 | 低 | ≤600px 首页 Music / Beats 两个分栏每栏只有 1 条时下方留大片空白（每栏 min-height 120px，条目 72px） | `.home-pane-music/.home-pane-beats { min-height:120px }`（site.css:2615-2616） |
| D7 | 低 | 队列与 Deck B 标题显示原始实体 `purplebeat &#8211; 142`（桌面端同样存在，非布局问题） | REST 返回 `wp_strip_all_tags(get_the_title())` 保留了实体（devdjam-core.php:302），JS 用 `textContent` 写入（site.js:146/458） |

## Requirements

- R1（D1）：600–720px 区间最大化打碟机与内容窗必须完整落在视口内，可通过 Esc / 遮罩 / 再次点最大化关闭。
- R2（D2）：开屏页在所有宽度都覆盖任务栏；进站后任务栏恢复正常。
- R3（D3）：窗口最大化时，标题栏两个按钮在 ≤720px 全部可点，语言切换器不遮挡。
- R4（D4）：600–720px 首页头图采用与 ≤600px 一致的"左侧小封面 + 右侧标题摘要"结构，封面不超过 165px。
- R5（D5）：最大化打碟机的曲库表格在 320px 起不超出窗口；宽表允许在表格容器内横向滑动，不撑破窗口。
- R6（D6）：首页分栏在条目少于填满时不留固定空白，高度随内容。
- R7（D7）：曲目标题按解码后的文本显示（用户 2026-09-23 确认纳入）。
- 约束：不引入外部依赖；不改桌面端（> 720px）视觉；保留窗口只有 最小化/最大化 两键；
  布局修改集中在 `site.css`，R7 只改 devdjam-core.php 的标题输出一行。

## Key Decisions

- 用户 2026-09-23 确认：D1–D7 全部修复；保留工作区未提交的"整页自然滚动"移动端方向，在其之上修，不回退。
- 任务为轻量级（PRD-only）：改动集中在两个文件、无新模块，不需要 design.md / implement.md。
- 复核阶段追加 R8（安全）：R7 把标题解码为纯文本后，site.js:637 曲库表格把 `track.title` 拼进 `innerHTML`
  会变成存储型 XSS（任何能发 beat 的账号都能触发）。改为渲染后 `tr.cells[1].textContent = track.title`。
  其余 7 处 `track.title` 用法均为 `textContent` / `aria-label` / MediaSession，安全。

## Acceptance Criteria（2026-09-23 验收脚本 22/22 通过，桌面端截图人工比对一致）

- [x] AC1：640px 视口最大化打碟机，窗口 `getBoundingClientRect()` 的 left ≥ 0、top ≥ 0、right ≤ 640、bottom ≤ 844。（实测 62/17/636/827）
- [x] AC2：320/390/430px 首屏开屏页截图中看不到任务栏；点击 entering 后任务栏出现。
- [x] AC3：390px 最大化 dj deck 后，标题栏 最小化/最大化 按钮命中区域不与 `.top-lang` 相交，且可点击关闭。
- [x] AC4：640px 首页 `.home-hero-cover` 宽高 ≤ 165px，`.home-hero` 为横向布局。（实测 112×145）
- [x] AC5：320px 最大化打碟机内 `.pro-library` 的 right ≤ 窗口 right。（表格在容器内横向滑动）
- [x] AC6：390px 首页 `.home-pane-music` / `.home-pane-beats` 高度 ≤ 条目总高 + 16px。
- [x] AC7：`npm run check` 通过；视口边界检查（320/390/768/1440）通过。
- [x] AC8：1440px 桌面端首页与最大化打碟机截图与修改前一致。
- [x] AC9：队列与 Deck B 标题显示 `purplebeat – 142`，不再出现 `&#8211;`。

## Out of Scope

- 不重做底部任务栏形态、不改导航结构。
- 不调整桌面端三栏布局与窗口动画。
- 不处理后端路由、REST 数据结构（R7 例外，仅解码标题）。
- 真机横屏、iOS 地址栏收起高度、深色 ink 主题未在本次扫描范围，用户未报告相关现象，不处理。
