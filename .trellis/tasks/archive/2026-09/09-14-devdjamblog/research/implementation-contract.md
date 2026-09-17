# 新项目实现约定

项目根目录 `C:/Users/Administrator/Desktop/devdjamblog`，只写本项目及其 Trellis task。现有 AI / nq-evaluator 项目规范不适用于本独立 WordPress 项目。

- 使用 WordPress 原生内容与媒体系统，不自己实现认证或 SQL 内容存储。后台新增独立音乐分享和 beat 内容类型，代码前缀使用 `devdjam_` / `dj_`，内容类型 ID 使用 `dj_music` / `dj_beat`。
- 内容插件持有内容模型，主题只展示。主题与插件都不删除用户内容；初始化流程不得清空已有站点。
- 输出按上下文使用 esc_html / esc_attr / esc_url 或 wp_kses_post。写入检查 nonce 和 current_user_can，注册 REST 元字段提供 auth_callback 和 sanitize_callback。
- 音频必须为本地媒体库中有效 audio attachment。BPM 是可选有限正整数。媒体资源地址只向前台暴露已发布 beat 的播放清单；不将 WordPress 草稿当作私有文件存储保证。
- 音频及图片使用普通服务器持久化 uploads，初始数据无歌曲和文章。专用测试环境可以含自动生成的短测试音，不复制到交付实例。
- 原生 JS/CSS，避免生产前端打包依赖。通过真实 WordPress 模板支持无 JS 的基本导航，JS 增强站内无刷新切换并保留单一 audio 元素。
- 操作控件有 label、焦点、错误提示；异步导航支持竞态取消、前进后退和异常回退。播放器处理 play() rejection、空队列、无效音源与 media error。
- Windows 本地验证使用官方 Playground CLI。生产 Compose 使用 WordPress/PHP 和 MariaDB，数据卷持久化，只绑定回环端口以便接现有反向代理。不得把 Playground 或默认测试凭据当作生产部署。
- 使用 reference artwork 的独立装饰裁片和原创 SVG/CSS 细节，实际文字、导航、内容列表与控件均为可交互页面。素材来源在 docs 中记录。
