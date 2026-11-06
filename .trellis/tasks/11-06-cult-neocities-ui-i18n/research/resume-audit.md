# 接续核验 — 2026-11-06

## 工作停止点与授权

- 实际仓库：`D:\Desktop\devdjamblog`；本次环境提示的 `C:\Users\Administrator\Desktop\devdjamblog` 是空目录且不是 Git 仓库。
- 当前 HEAD `042c9b7`，分支 `main`。接续前工作区仅有 `.playwright-mcp/`、本任务目录未跟踪；产品代码没有未提交差异。
- `get_context.py` 在本会话没有 active pointer；目录内本任务 `task.json.status=planning`。旧 `10-18-window-poster-collage` 仍标记 in_progress，不能据此将本次继续指向旧任务，也不在本任务中归档它。
- 原始要求是「在现有站点的 ui 上优化，统一，标准化风格，做好 i18n，关键词 cult，neocities」。原会话确认「建任务并先规划」「不提交」。后续只有多次「继续」，未发现对 Q1/Q2/Q3 的回答或已完成方案的批准。
- 上一会话在 PRD 保存后遇到后台代理 429 与最终 524 错误。预览随后被低内存机制终止。错误不是业务决策，也不是实现完成证据。
- 原会话证据：`C:\Users\Administrator\.claude\projects\D--Desktop-devdjamblog\3f95fc07-81bf-4d9d-8522-c8accbb37877.jsonl`，用户要求 L27，规划/不提交答复 L188，PRD 写入 L527，后续继续 L545/559/578/592/611，代理失败 L600，最终错误 L645，预览停止 L649。仅为本机接续出处，不复制会话原文件或私人数据到发布包。

## 本次核验与既有证据

- 本次只做代码静态核验、历史答复定位、保存报告结构检查和两张基线截图目检；没有启动浏览器、访问生产、写入 WordPress 或重跑产品测试。
- 既有 `.runtime/cult-ui/before/i18n-report.json` 含 38 组记录：24 组桌面页面/语言、6 组备用主题、8 组移动页面/语言。所有保存项 `js_errors=[]`，`h_overflow_px=0`。仅含 1440 与 390 两种宽度。
- 目检 `home-en-milk-1440.png` 与 `post-en-milk-1440.png`：正文直接压在海报/点阵上，弱化的正文和亮粉色元信息缺乏稳定底色；这是推荐实底文字区域的直接依据，不是已测对比度数值。
- 本机已有 Node 24 可执行文件仍存在；端口 8787/8788/8797 未发现监听。后续启动需再核对挂载、锁与端口，不能把上一会话的成功当作现状。

## 代码定位与设计约束

| 入口（相对仓库根目录） | 核验事实 / 实现时约束 |
| --- | --- |
| `wp-content/themes/devdjam/functions.php:42,46-47` | 头部语言默认与 `dj_text()`；后者只输出英文键与 `data-i18n` 的 span，属性使用 `esc_attr`，文本使用 `esc_html`。 |
| `wp-content/themes/devdjam/assets/site.js:5-7,35-62` | 语言模块处于播放器依赖检查之后；无音频/引擎会提前返回。字典仅中文，英文键作回退；`applyLanguage()` 只处理 textContent、语言按钮与 submit.value。 |
| `wp-content/themes/devdjam/assets/site.js:1278-1282,1302-1314` | PJAX 只换 `#site-content`，标题标签同步后先翻译再 `initNovelReader()`；动态创建节点需要明确刷新时机。不能将标记放到含图标/作者内容的父节点。 |
| `wp-content/themes/devdjam/assets/site.js:1310,1338` | 导航 live region 的正在打开/已打开文案为硬编码中文；页面标题应保留为参数。 |
| `wp-content/themes/devdjam/assets/site.js:377,401,442,670,933-935` | 播放、曲目按钮、队列、Hot cue 与装载存在多个动态文本/aria 出口；切换后不能被状态更新覆写回旧语言。 |
| `wp-content/themes/devdjam/functions.php:124-125`；`assets/site.js:1509,1550-1551,2073` | 窗口和动效有静态及动态属性，两处都需覆盖。窗口状态与事件属性保持。 |
| `wp-content/themes/devdjam/views/novel.php:45-119`；`assets/site.js:2179,2224,2295` | 小说对话框、目录、阅读设置、上一/下一章、进度、全屏属性分属 PHP 和 JS。保留章节内容、字号/字体偏好与阅读进度。现有阅读器返回/关闭属于专用对话框，不按普通桌面窗口规则删除。 |
| `wp-content/themes/devdjam/index.php:196`；`comments.php:11,17-27`；`views/archive.php:68` | 日历、评论表单/导航、分页的局部入口可用；评论 cookies 字段依赖 WP 默认合并。必须检查实际 WP 核心 hook/参数，不能凭名称猜过滤器。 |
| `wp-content/themes/devdjam/assets/site.css:5-52` | 已有 Milk/Ink/Cherry 与基础变量；标题栏实际是烟黑半透明。正文面板变量与前景反色需分开，不能拿 transparent 的 `--win` 充当前景色。 |
| `dev/check-state.mjs:65`；`dev/check-navigation.py:27` | 既有状态/导航测试将 applyLanguage 替换为空函数，能验证状态契约，不能证明真实双语联动。 |

## 扫描局限与新增验收依据

`.runtime/cult-ui/audit.py:23` 将整个队列/曲库表体/跑马灯/日历 caption 与 thead 当用户内容排除；L31 用字符集启发式判定，L41 容许含中文的混合属性漏过，L45 按属性和值去重丢节点位置；L58-62 仅直接访问。新验收应：

1. 以明确的 UI 节点/键/参数断言两种语种，保留节点位置；品牌/硬件例外逐项列出。
2. 作者内容只排除实际叶节点；队列装载/播放按钮、跑马灯系统提示、日历月份/星期保留检查。
3. 初始、切换、刷新、PJAX、窗口状态、队列晚返回、小说设置/滚动分别触发。
4. 检查真实翻译实现，不能沿用将 applyLanguage 置空的测试来声称双语通过。
5. 本地浏览器审计拦截访问统计 POST 和外域请求，避免访问动作污染计数；不得向现有预览提交评论或创建内容。需要数据 fixture 时使用独立站或浏览器拦截响应。

## 明确未覆盖

本次不建立任何实现后运行证据。WP 核心具体过滤器、无 JS 与首屏脚本加载顺序、真实音频连续播放、物理手机触摸/转屏、生产 MariaDB 与真实评论提交仍需各自适当验证或单独声明边界。文件中将前台界面 i18n 与后台管理/外部 Feed 文档内容区分，不通过全局 gettext 或字符串替换改动作者内容。
