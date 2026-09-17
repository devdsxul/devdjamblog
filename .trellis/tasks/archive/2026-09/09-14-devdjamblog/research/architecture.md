# 后台与播放器选型

核对日期：2026-09-14。来源通过 smart-search-cli fetch 获取，原始结果保存在同目录 JSON 文件中。

## 推荐：WordPress + 定制主题 + 小型内容插件

用户当前最重要的工作流是独立写文章、上传 beat 和维护内容，WordPress 已提供媒体库、文章编辑和管理页面。官网媒体库文档明确支持音频预览、上传媒体的编辑与删除。

- 官方媒体库文档：https://wordpress.org/documentation/article/media-library-screen/
- 官方自定义内容类型文档：https://developer.wordpress.org/plugins/post-types/registering-custom-post-types/
- 官方部署要求：https://wordpress.org/about/requirements/

定制主题负责 Neocities 风格，不使用现成商业模板。独立内容插件负责 beat / 音乐分享的数据类型、音频关联和 BPM 等字段，避免换主题时后台内容类型消失。官方文档也建议把内容类型放在插件中。

当前官方推荐环境为 PHP 8.3+，MariaDB 10.11+ 或 MySQL 8.0+，HTTPS。这里是技术部署目标，尚未核实用户服务器的实际环境。

本机有 Node.js 25.2.0，没有从 PATH 找到 PHP 和 Docker。可以先用官方 WordPress Playground CLI 提供本地实际 WordPress 环境；服务器部署采用普通 PHP/数据库或 Docker。Playground 本地验证不能冒充生产 MariaDB 验证。

- 本地 CLI 文档：https://wordpress.github.io/wordpress-playground/developers/local-development/wp-playground-cli
- Windows 显式映射目录使用 `--mount-dir`，避免盘符与冒号映射冲突。

## 备选：Payload + 定制 Next.js 前台

Payload 提供自动生成的内容管理界面，上传集合支持创建、重新上传、编辑和删除；允许限定 audio/* 等文件类型，可使用服务器本地持久化存储。

- 上传文档：https://payloadcms.com/docs/upload/overview
- 自托管文档：https://payloadcms.com/docs/production/deployment

Payload 运行在 Next.js 中，应用之外还须安排数据库和持久化媒体存储。适合计划继续增加复杂内容模型/交互功能的项目；这属于当前工程判断，不是官方对两个方案的优劣结论。

## 共同播放器设计

使用浏览器原生 audio 引擎，自定义可访问的复古外观。播放、暂停、上一首/下一首、进度、音量、队列属于前台工作；后台只管理音源和曲目元信息。播放器保留在页面外壳中，站内内容切换不重建它。刷新整页后不保证自动继续出声，不绕过浏览器的播放限制。

正式内容初始为空。装饰插画、背景纹理不作为歌曲或文章记录；无歌曲时显示空磁带状态并禁用播放按钮。验证用音源仅存在于隔离的测试环境。

## 视觉资源现状

- GifCities：https://gifcities.org/，当前主页可访问，是 Internet Archive 的 Geocities GIF 搜索项目。采用具体资源时仍须记录实际来源，不能把收录等同于统一授权。
- sadgrl.online：https://sadgrl.online/，当前已改版为个人站，不能假定旧工具和组件路径仍可访问。
- 用户参考图为 1312 × 1199 RGBA。图片用作构图、材质和色彩参考，实际页面需要真实文字、链接、列表和播放器。

## 待确认

已向用户说明推荐 WordPress，并提供 Payload 选项。暂不把推荐写成用户已经确认的决定。
