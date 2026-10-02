# 应用/工具设计

## 文件边界

- `wp-content/plugins/devdjam-core/admin.js`：删除封面区监听及状态变量，保留音频和识别代码。
- `wp-content/plugins/devdjam-core/devdjam-core.php`：删除自定义封面变量、HTML、手动 thumbnail 保存段；不删除 post type thumbnail 支持、音频保存验证和公开封面回退。
- `wp-content/plugins/devdjam-core/admin.css`：只移除确因本次删除而无消费者的封面样式，不格式化整份压缩 CSS。
- 主题 `functions.php` / `views/home.php`：清除两个死 helper 和一个别名，改动唯一调用点。
- 主题 `parts/player.php` / `assets/site.js` / `assets/deck.css`：清除紧凑隐藏封面链。
- 主题 `assets/site.css`：在现有父选择器范围内合并重复按钮状态，保留不同 transform 与 `[hidden]` 规则。
- `dev/check.mjs`：用原生递归目录枚举；不新建通用文件扫描层。
- 最小测试与相关说明：验证原生能力保留、枚举等价及删除链完整；不夹带其他规则清理。

## 合同

公开数据字段、元数据键、按钮 data 属性及播放器事件均不变。原生特色图片框已有 `post_thumbnail_meta_box()` 注册和 thumbnail 支持，不再维护第二个同职责表单。前台磁带默认封面维持在现有回退函数。

原生枚举用 `withFileTypes`，保持旧实现对非目录项及 `.php` / `.js` 的筛选边界；父目录路径兼容 `entry.parentPath ?? entry.path`。不为了简化而 悄悄跳过旧逻辑会检查的目标。

CSS 的 `:is()` 只合并相同 specificity 的父类/状态。公共颜色不改变 hover 与 active 的先后覆盖，playing 不额外覆盖 transform。

## 验证与回退

使用已有 PHP parser 和 Node 检查，不添加依赖。新增小型 fixture 测试验证嵌套枚举及错误传播；native 图片支持/无重复表单可静态检查，实际选图保存流程另行在隔离本地实例验证或标未验证。

应用各切片可独立回退；任何可见图片误删或播放按钮变化先恢复该切片，不改音频引擎抵消差异。
