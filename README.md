# DEVDJAM

A small corner on the internet for underground music, clouds, beats, and random thoughts.

自托管的 WordPress 音乐博客：cult 电影海报墙、烟黑 Win98 标题栏、实底纸条和 GifCities 贴纸，保留 Neocities 个人站的拼贴感。栏目有音乐分享、Beats、杂谈、链接、关于、留言簿；站内切换栏目时打碟机持续播放。新安装的文章、音乐分享和曲库为空。

## 本地预览

本次预览使用本机已有 Node 24 启动（WordPress 7.1 / PHP 8.3）。当前系统默认 Node 26 与 Playground 的 `fs-ext` 预编译包不匹配；无需升级依赖或改全局 Node。新环境先安装项目依赖，再使用兼容的 Node 版本运行：

```powershell
npm ci
npm run dev
```

本机已有依赖时，可直接运行：

```powershell
& "$env:USERPROFILE/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node.exe" dev/server.mjs
```

- 网站：<http://127.0.0.1:8787/>
- 管理后台：<http://127.0.0.1:8787/wp-admin/admin.php?page=devdjam>
- 本地管理员信息：启动后生成在 `.runtime/preview-access.json`。密码随机生成，不写入源码或发布包。
- 本地数据库和上传文件保存在 `.runtime/preview/wordpress-7.1/wp-content/`，重新启动保留内容。
- 停止当前预览：在运行终端按 `Ctrl+C`。

本地使用官方 WordPress Playground，固定 WordPress 7.1 / PHP 8.3 / SQLite，仅监听 `127.0.0.1`。第一次启动会下载运行文件和中文语言包。它用于开发预览；服务器部署使用正常的 WordPress + MariaDB。

### 本机已有的 DJ 种子测试站（可选）

主检出目录还保留了不入 Git 的 `.runtime/serve-alt.mjs`，运行 `node .runtime/serve-alt.mjs` 可启动 `http://127.0.0.1:8797/`。它读取 `.runtime/seed/manifest.json` 中的测试素材，供音轨与打碟机验证使用；新克隆不保证有这些私有文件。

**8797 与标准预览 8787 共用 `.runtime/preview/` 和 `preview-access.json`，不能当成隔离实例同时运行。** 自动化写入验收仍使用独立的 8788。切换 worktree 前先核对脚本挂载的主题路径，不自动搬走或删除预览数据库、上传文件和种子素材。

## 日常使用

进入后台的 **DEVDJAM / 控制室**：

- **杂谈**：使用 WordPress 文章编辑器；文章详情页、首页最新推荐及归档卡片中完整展示作者与发布时间，且支持通过顶部控制面板进行中/英文（author / 作者）国际化切换。
- **音乐分享**：单独的音乐栏目，可加 Cloud Rap、Jerk Rap 等标签。
- **Beats**：填写标题，选择音频、封面，可选填 BPM、调性和介绍，发布后自动进入曲库。BPM 和调性空着时，选好音频会自动识别；控制室首页可以一键补齐所有缺失的曲目。
- **页面**：编辑「链接」与「关于」的正文。
- **留言簿**：访客留言走 WordPress 原生评论，在「评论」菜单审核或删除。
- 顶部偏好按钮提供 EN / 中文、Milk / Ink / Cherry；动效由横幅眼球贴纸控制。首访跟随浏览器首选语言（`zh-*` 使用中文，其余英文），之后优先采用手动保存的选择；只翻译界面，不翻译正文、曲名或章节名。窗口的 _ □ 可最小化/最大化；桌面左侧是主导航，窄手机屏改为底部任务栏。
- 打碟机窗口放大后是一台仿 Pioneer DDJ 的双盘控制台：有声搓碟、热点 / 循环 / 跳拍 / 采样打击垫、BEAT SYNC、三段隔离 EQ、滤波、BEAT FX 和 Crossfader。给 Beat 填 BPM 能让拍网格更准。顶部按「波形｜紧凑曲库｜BEAT FX」排列；手机大控制台自动横向显示，竖握时界面旋转 90°，小播放器不变。

详细操作见 [站主使用说明](docs/OWNER-GUIDE.md)。

## 部署

两种方式均可：

1. 将 `dist/devdjam-theme.zip` 与 `dist/devdjam-core.zip` 上传到已有 WordPress 的主题、插件管理页。
2. 将 `dist/devdjam-server.zip` 解压到服务器，填写 `.env`，使用项目里的 Docker Compose，再接自己的 HTTPS 反向代理。

现役站点使用 HTTPS，入口及已核对的发布状态见 [服务器部署说明](docs/DEPLOYMENT.md)。`dist/` 是本地生成目录，不代表当前已部署版本；发布前从确认过的代码重新打包，不直接使用遗留压缩包。

## 目录

```text
wp-content/
  themes/devdjam/           专属主题、页面、CSS、播放器；assets/gif 与 assets/tiles 为本地打包的装饰素材
                            assets/audio-engine.js + deck-worklet.js 为打碟机音频引擎，track-analysis.js 为拍速 / 调性分析（前台打碟机与后台自动识别共用），deck.css 为打碟机样式
  plugins/devdjam-core/     内容模型、后台音轨字段、只读曲库 API
deploy/                    初始化脚本、PHP 上传限额、反向代理示例
dev/                       本地启动、语法检查、隔离验收、打包
docs/                      使用/部署/素材说明、截图和验证报告
dist/                      可上传的主题、插件和服务器压缩包
.runtime/                  本地私有数据与测试环境，不进入发布包
```

## 验证与打包

```powershell
npm run check
node dev/check-deck-input.mjs
node dev/check-simplification.mjs
node dev/check-state.mjs
node dev/check-i18n.mjs
```

第二条是无需浏览器的打碟机输入回归：验证普通 / 旋转坐标下的旋钮、推子、搓碟、波形定位、选歌和 resize 收尾。它不替代手机真机的视觉、触摸与试听验收。第三条核对新旧文件枚举集合、嵌套 fixture 中的语法失败传播，以及封面/按钮的静态保留合同；不替代后台特色图片选图、保存和重开实测。

第四条通过受控异步请求验证连续导航、预取超时、滚动恢复、异常存储和后台换音频的识别竞态；不访问网络或写入 WordPress 数据。

导航改动还可运行 `python dev/check-navigation.py`：在 Edge 的本地拦截页面中验证前进/后退、锚点滚动及播放器 DOM 保留，不替代真实音频试听。

文档改动只检查链接和事实；按影响范围选择验证，不自动重跑全套。

前台双语/样式改动使用 `python dev/check-ui-i18n.py` 与 `python dev/check-ui-state.py`，要求 8787 已有本机种子内容。它们拦截外域和非 GET 请求，不提交评论或写入预览数据库；后者使用浏览器拦截的曲库与静音 WAV 验证动态状态。截图与数值保存在 `.runtime/cult-ui/after/`。窗口动效另用 `python dev/check-window-motion.py`；这些均不替代真机触摸或真实音频试听。

需要并获准进行完整浏览器验收时，使用独立的 `8788` 测试站。需要 Python、`dev/requirements.txt` 的依赖，以及 Microsoft Edge：

```powershell
# 分别保持预览站与测试站运行
npm run dev
npm run dev:qa

# 在另一个终端执行
python dev/qa.py
```

打包独立执行 `npm run package`。脚本读取**当前工作区文件**，不是自动读取 HEAD；打包前先检查 `git status --short`，防止把无关本地修改带进发布包。

验收报告：`docs/qa-report.json`。测试脚本只对固定的本地 `8788` 实例创建临时内容，并按创建得到的 ID 清理；不会向 `8787` 的预览站写入文章或 Beat。

贴纸动图来自 GifCities，窗口样式基于 98.css，进站页字体 UnifrakturMaguntia（OFL），详情见 [素材来源](docs/ASSETS.md)。
