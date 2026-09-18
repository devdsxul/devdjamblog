# Implementation Plan: 移动端响应式布局与触控体验

## Execution Checklist

- [ ] **Step 1: 前置检查与基线确认**
  - 运行 `npm run check` 确保现有 11 个文件语法干净。
  - 备份当前样式基线。

- [ ] **Step 2: 编写 Win98 经典底部任务栏样式 (`.dock`)**
  - 修改 `wp-content/themes/devdjam/assets/site.css`：
  - 在 `<= 600px` 断点下将 `.dock` 改写为 `position: fixed; bottom: 0; left: 0; right: 0; width: 100vw; height: 44px;`。
  - 设置开始按钮 `.dock-logo` 经典凸起像素外观。
  - 设置栏目条 `.dock-nav` 横向平滑滑动、按键样式与高亮激活态。
  - 设置系统托盘 `.dock-foot` 凹陷边框与紧凑托盘时钟。
  - 增加全面屏底部安全区内边距 `env(safe-area-inset-bottom)`.

- [ ] **Step 3: 桌面与窗口 100% 全宽重排**
  - 调整 `.desk-layout` 与 `.desk` 消除左侧 Dock 留白与挤压，底部预留 52px 滚动避让区域。
  - 维持 `.col-main` (主内容) 优先位于 `order: 1`，其次为 `.col-left` (打碟机/访客) 与 `.col-right` (日历)。
  - 针对 `.home-hero`、`.home-split`、`.home-beat-item` 细化小屏比例，杜绝挤压换行异常。

- [ ] **Step 4: 触控人体工程学与防自动缩放**
  - 窗口标题栏控制按钮（最小化/最大化）扩展触控热区至 >= 36px。
  - 播放器按钮与条目播放按键增大触控热区。
  - 移动端滑块 Thumb 触控优化。
  - 所有表单输入框固定 `font-size: 16px !important;` 解决 iOS Safari 获得焦点放大视口问题。
  - 针对 `.prose pre` 与 `.prose table` 添加横向滚动保护，防止宽内容撑裂容器。

- [ ] **Step 5: 进站开屏页 (`.enter`) 与最大化双盘工作台适配**
  - 调整 `.enter-typography` 与 3D 字符尺寸，在 360px~390px 窄屏自然居中不折行。
  - 双盘控制台 `.pro-console` 横向滑动平滑度优化。

- [ ] **Step 6: 代码质量核验**
  - 执行 `npm run check` 确保 PHP 与 JS 语法 100% 校验通过。

- [ ] **Step 7: 移动端视口与功能回归验证**
  - 编写并执行自动化无头浏览器/DOM 属性测试，覆盖 360px、375px、390px、430px、768px、1280px。
  - 验证任务栏固定位置、内容区宽度、触控热区、iOS 防缩放与双盘工作台横滑。

---

## Validation Commands

```bash
# 1. 语法检查
npm run check

# 2. 样式与文件完整性
git diff wp-content/themes/devdjam/assets/site.css
```
