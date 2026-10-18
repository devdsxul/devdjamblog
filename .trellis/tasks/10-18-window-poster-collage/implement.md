# 执行计划：窗口海报拼贴

## 1. 素材（先出图，CSS 才有东西可挂）

- [ ] `dev/poster-collect/compose.py` 增加 `layout_irregular()`：替代现有 4×11 网格，随机三档尺寸 + ±4° + 叠压，输出覆盖 `assets/img/poster-wall/giallo-wall.jpg`（2560×1440，q80）。
- [ ] 同文件增加 `make_plate(titles, size, veil)`：2–4 张海报错落叠贴、±6°、带 1px 边与 2px 硬投影，整版烘 22–28% 纱，输出 `win-visitors.jpg` / `win-player.jpg` / `win-content.jpg` / `win-calendar.jpg` / `win-study-group.jpg`。
- [ ] 片单分配：calendar/study-group 用铅黄片；player 用血腥 B 片；content 用地下片；visitors 用混合。避免与桌面墙同一张海报在相邻位置重复。
- [ ] 体积闸：单张 ≤ 180 KB，桌面 ≤ 500 KB。

## 2. 样式

- [ ] `site.css` `:root` 增加 `--on-solid: #ffffff`、`--win-plate: none`；`html[data-theme="ink"]` 增加 `--on-solid: #111111`。
- [ ] `.window`：`background` 改 `transparent`，加 `background-image/size/position`，并在作用域内重定义 `--win` / `--win-2` 为半透；`html[data-theme="ink"] .window` 给深色半透值。
- [ ] 5 条 `.win-*` 规则挂 `--win-plate: url("img/poster-wall/win-*.jpg")`。
- [ ] 替换 11 处 `color: var(--win)` → `color: var(--on-solid)`（`site.css` 8 处、`deck.css` 3 处）。
- [ ] `.win-player.is-max .ddj` 内恢复 `--win: #ffffff`（Ink 为 `#1a1a1a`），保证 LCD 区实底。
- [ ] 检查 `background: var(--win) !important` 两处（`site.css`:2006、2031）是否落在窗口内，落在内则评估视觉再决定。

## 3. 验证

```bash
# 语法
node dev/check.mjs

# 起本地预览（后台）
node dev/server.mjs

# 截图：默认 / Ink / 手机 / 最大化控制器 / 最小化
node .runtime/poster-preview/shot.mjs http://127.0.0.1:8787/ .runtime/poster-preview/w-desktop.png 1440 900 1
node .runtime/poster-preview/shot.mjs http://127.0.0.1:8787/ .runtime/poster-preview/w-ink.png 1440 900 1 ink
node .runtime/poster-preview/shot.mjs http://127.0.0.1:8787/ .runtime/poster-preview/w-mobile.png 430 932 1
```

- [ ] 截图逐张看：5 个窗口各是自己的拼贴，留白处海报可见，正文块不发花。
- [ ] 取正文区块像素算对比度，≥ 7:1；不达标就抬面板 alpha 或降该版亮度。
- [ ] `html[data-theme="cherry"]` 也过一遍（只改强调色，预期无需额外处理）。

## 4. 文档

- [ ] `DESIGN.md`：背景段改成"不规则拼贴 + 窗口拼贴版"，补一句半透面板的可读性下限。
- [ ] `.trellis/spec/frontend/component-guidelines.md` 第 15 条改成新的分层模型；第 14 条（进站门）不变。
- [ ] `docs/ASSETS.md`：海报墙一节补 5 张窗口版；`dev/poster-collect/README.md` 补生成命令。

## 风险与回滚

- **`site.css` 作用域副作用**：`.window` 内 `--win` 变半透会影响所有继承它的背景，包括 deck 内部（`deck.css` 23 处）。先全量截图，出现读数面板发灰就在 `.ddj` 局部还原。
- **对比度**：海报留白处是纯图，最坏情况出现在浅色海报（The Stuff、Blood Feast）。选片时避开纯白海报做主元素。
- **回滚**：`git checkout -- wp-content/themes/devdjam/assets/site.css wp-content/themes/devdjam/assets/deck.css`，并删除 `assets/img/poster-wall/win-*.jpg`；桌面墙可用 `git checkout` 恢复网格版。
