# DEVDJAM

A small corner on the internet for underground music, clouds, beats, and random thoughts.

自托管的 WordPress 音乐博客：白底黑线的 Win98 窗口 + 少量粉色点缀（jfashion 味），GifCities 动图做贴纸。栏目有音乐分享、Beats、杂谈、链接、关于、留言簿；站内切换栏目时打碟机持续播放。文章、音乐分享和曲库初始为空。

## 本地预览

本机安装 Node.js 后，在本目录执行：

```powershell
npm ci
npm run dev
```

- 网站：<http://127.0.0.1:8787/>
- 管理后台：<http://127.0.0.1:8787/wp-admin/admin.php?page=devdjam>
- 本地管理员信息：启动后生成在 `.runtime/preview-access.json`。密码随机生成，不写入源码或发布包。
- 本地数据库和上传文件保存在 `.runtime/preview/wordpress-7.1/wp-content/`，重新启动保留内容。
- 停止当前预览：在运行终端按 `Ctrl+C`。

本地使用官方 WordPress Playground，固定 WordPress 7.1 / PHP 8.3 / SQLite，仅监听 `127.0.0.1`。第一次启动会下载运行文件和中文语言包。它用于开发预览；服务器部署使用正常的 WordPress + MariaDB。

## 日常使用

进入后台的 **DEVDJAM / 控制室**：

- **杂谈**：使用 WordPress 文章编辑器。
- **音乐分享**：单独的音乐栏目，可加 Cloud Rap、Jerk Rap 等标签。
- **Beats**：填写标题，选择音频、封面，可选填 BPM、调性和介绍，发布后自动进入曲库。
- **页面**：编辑「链接」与「关于」的正文。
- **留言簿**：访客留言走 WordPress 原生评论，在「评论」菜单审核或删除。
- 前台右上角「控制面板」可切换中/英文界面、三套配色和动效开关；窗口的 _ □ 可最小化/最大化；左侧常驻侧边栏是主导航；进站先经过一个点击进入的 loading 页。

详细操作见 [站主使用说明](docs/OWNER-GUIDE.md)。

## 部署

两种方式均可：

1. 将 `dist/devdjam-theme.zip` 与 `dist/devdjam-core.zip` 上传到已有 WordPress 的主题、插件管理页。
2. 将 `dist/devdjam-server.zip` 解压到服务器，填写 `.env`，使用项目里的 Docker Compose，再接自己的 HTTPS 反向代理。

具体步骤、首次初始化和备份见 [服务器部署说明](docs/DEPLOYMENT.md)。没有执行远程部署。

## 目录

```text
wp-content/
  themes/devdjam/           专属主题、页面、CSS、播放器；assets/gif 与 assets/tiles 为本地打包的装饰素材
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
```

浏览器验收使用独立的 `8788` 测试站。需要 Python、`dev/requirements.txt` 的依赖，以及 Microsoft Edge：

```powershell
# 分别保持预览站与测试站运行
npm run dev
npm run dev:qa

# 在另一个终端执行
python dev/qa.py
npm run package
```

验收报告：`docs/qa-report.json`。测试脚本只对固定的本地 `8788` 实例创建临时内容，并按创建得到的 ID 清理；不会向 `8787` 的预览站写入文章或 Beat。

贴纸动图来自 GifCities，窗口样式基于 98.css，进站页字体 UnifrakturMaguntia（OFL），详情见 [素材来源](docs/ASSETS.md)。
