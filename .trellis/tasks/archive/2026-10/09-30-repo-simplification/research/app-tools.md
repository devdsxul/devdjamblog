# 应用与检查工具精简证据

核对日期：2026-09-30。当前环境为 Node v25.2.0 / Python 3.12.10。以下均为只读核对，不代表已经实施。

## 原生特色图片替换（R3）

- 主题 `functions.php:8` 已启用 `post-thumbnails`；插件 `devdjam-core.php:21` 的公共 post type 配置包含 `thumbnail`，作用于 `dj_music` 与 `dj_beat`。
- 全仓未发现移除 `postimagediv` 的代码。本机 WordPress 7.1 的 `wp-admin/includes/meta-boxes.php:1492,1612` 确认原生 `post_thumbnail_meta_box()` 和对应注册存在。
- 可删除的重复实现为 `admin.js` 封面区 40 行，以及插件中的封面准备变量 5 行、表单 12 行、手动保存 8 行。音频选择和自动识别与封面处理不是同一块，必须保留。
- 允许的可见变化是移除重复自定义封面区，只保留原生特色图片框。前台 `devdjam_default_cover_url()`、曲目封面返回和锁屏 artwork 不属于删除范围。
- 原生框的保存与移除由 WordPress 负责；测试应覆盖两种内容类型，不能只检查 HTML 中少了几个 ID。

## 死代码与纯转发（R5/R8/R9）

- `functions.php:144` 的 `dj_recent()`、`dj_post_rows()` 无调用者，共 19 行。当前首页和归档直接查询、渲染，不依赖它们。
- `functions.php:174` 的 `dj_beat_button()` 只是转发给 `dj_track_button()`；唯一运行调用位于 `views/home.php:142`。直接调用原函数即可，相关规范表中的名字一并更新。
- 紧凑封面 `parts/player.php:85` 被 `deck.css:34` 永久隐藏。删除该节点、隐藏规则和 `site.js:442` 的五行赋值分支；`data-jog-cover`、曲库封面以及 `MediaMetadata.artwork` 必须保留。

## 按钮样式合并（R6）

- `site.css:1331-1382` 的基类已规定透明背景和无阴影；hover / active / playing 再次重复这些值。
- 保留父选择器范围 `.home-split` 和 `.archive-track-list`；公共颜色可集中到 `:is(.home-split,.archive-track-list) .track-button:is(:hover,:active,.is-playing)`。
- hover 的 `scale(1.15)` 和 active 的 `scale(0.92)` 分开保留；playing 不应覆盖两者的 transform。
- 不改变 `[hidden]`、图标切换、两个列表的不同按钮尺寸，也不顺便处理已知的焦点规范争议。

## Node 原生枚举（R7）

- `dev/check.mjs:9-18` 手写递归搜集 `wp-content` 下所有非目录项，随后只处理 `.php` / `.js`。
- 采用 `fs.readdirSync(..., { recursive: true, withFileTypes: true })`；必要时利用 `entry.parentPath ?? entry.path` 取得父目录，避免自行递归或引入依赖。
- 原生 recursive API 的最低运行时为 Node 18.17 / 20.1；当前 Node 25.2.0 支持。实施时明确文档中的工具要求，并在当前支持环境验证，不宣称覆盖未运行的旧 Node 版本。
- 保留旧枚举的非目录处理边界，尤其不要无意把原本可能检查的文件符号链接排除。用嵌套目录 fixture 对比集合与扩展名筛选，再以无效 PHP/JS fixture 证明错误会令检查失败。

## 检查范围

- `npm run check`：应用 PHP/JS 语法。
- `node dev/check-deck-input.mjs`：普通/旋转输入回归。
- 新增的最小结构/枚举测试不得靠字符串替换伪造“验证已通过”。
- 不默认启动 Playwright 或向生产写入。需要后台实测时先使用独立本地测试实例；8797 与 8787 共用预览数据，不能拿它们冒充隔离环境。
- 原生图片框的浏览器操作、手机触摸和三平台真实宿主均需独立标注证据；未执行就记未验证。
