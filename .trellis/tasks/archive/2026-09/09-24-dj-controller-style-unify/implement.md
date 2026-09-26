# Implement — 执行计划

## 顺序清单

1. [x] 拆分样式：把 site.css 中打碟机相关规则（紧凑播放器 + 旧双盘台 + 其响应式规则）迁到新文件 `assets/deck.css`；functions.php 注册 `devdjam-deck`(css)、`devdjam-core-dsp`(deck-worklet.js 作普通脚本)、`devdjam-audio`(audio-engine.js)，内联配置改 `Object.assign` 并新增 `workletUrl`；资源版本号 → 3.1.0。
2. [x] 启动本地测试站（`node .runtime/serve-alt.mjs`，端口 8797，含种子曲目）。
3. [x] 派发风格子代理（并行）：只改 `site.css` / `index.php`，实现 design §6。
4. [x] 主线：`deck-worklet.js`（DeckCore + 处理器注册 + 主线程导出）。
5. [x] 主线：`audio-engine.js`（Engine / Deck / 混音 / BeatFx / Sampler / 分析 / voice 适配器）。
6. [x] 主线：`parts/player.php`（紧凑播放器微调 + DDJ 控制台新标记）。
7. [x] 主线：`assets/deck.css`（控制台完整样式 + 响应式）。
8. [x] 主线：`site.js`（引擎接入、参数存储、旋钮/推子组件、紧凑视图、控制台视图、播放列表、托盘多处同步）。
9. [x] 集成子代理成果，统一复查三套主题、四个断点。
10. [x] 更新规格文档：DESIGN.md、`.trellis/spec/frontend/*`（目录结构、组件、状态、质量）。
11. [x] 提交 → 推送功能分支 → 创建 PR。
12. [x] 生产部署（见下）→ 生产验证。
13. [x] Trellis 收尾：日志记录、任务归档。

## 验证命令

```bash
npm run check                                   # PHP/JS 语法
node .runtime/serve-alt.mjs                     # 本地测试站 http://127.0.0.1:8797
python <job tmp>/verify-deck.py                 # Playwright(msedge) 功能+截图脚本（worklet 与 ScriptProcessor 两条路径）
```

浏览器验收要点：
- 1366×768、1920×1080 控制台完整；320/390/768/1440 无横向溢出（`scrollWidth <= innerWidth`）。
- 两盘 LOAD/PLAY/CUE/SYNC；搓碟时引擎报告负速度且电平表有信号；热点/循环/跳拍/采样/BEAT FX 生效。
- 紧凑播放器：跨页不断播、进度拖动、上下曲、队列选曲、错误重试。
- 三套主题截图；登录态（admin bar）底部完整。
- 无 `pageerror` / console error。

## 生产部署（用户已授权"做完直接部署生产"）

服务器地址、登录方式与目录见本地运维手册 `docs/PRODUCTION.md`（gitignore，不入库）。

1. 在服务器上把 `compose.yaml`、`deploy/`、`wp-content/`、`.env` 打包备份（带时间戳）。
2. 本地把 9 个主题文件打成一个 tar，上传后一次性解压到主题目录（`functions.php`、`index.php`、`parts/player.php`、`views/archive.php`、`assets/{site.css,site.js,deck.css,audio-engine.js,deck-worklet.js}`），避免访客读到新旧混合的文件。
3. 验证：首页 200、新资源 200、容器日志无 PHP 报错、无头浏览器（纯 HTTP 回退路径）无控制台错误，控制台可解码播放。

## 回滚点
- 代码：功能分支未合并 main 之前，main 不受影响；生产回滚 = 用备份包中 `wp-content/themes/devdjam` 覆盖（或 scp 回 main 分支对应文件）。
- 生产备份文件名在部署日志中记录。
