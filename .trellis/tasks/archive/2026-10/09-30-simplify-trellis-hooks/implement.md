# Trellis 执行清单

## 前置门禁

- [x] 用户已批准父任务最新规划，应用/工具子任务独立检查完成。
- [x] 由 `task.py start` 激活本任务；读取父研究、本 PRD/design 和上下文清单。
- [x] 核对七个入口、注册、现有差异及哈希基线；不写平台注册文件或模板记录。

## 先建证据

- [x] 新增 `dev/check_trellis_hooks.py` 最小回放测试；先对旧入口运行并保存受控基线。
- [x] 覆盖无任务、planning、in_progress、非目标 agent、无效输入、限额/路径边界、UTF-8、含空格路径和非项目 cwd。
- [x] 使用独立 fixture 会话，不读写真实活动任务或用户日记。

## 精简

- [x] 原样搬移三组共享实现到 hooks/shared_* 模块。
- [x] 七个原脚本变为短入口，保留 argv0 和既有输入/输出。
- [x] 删除剩余未调用 run_script；不合并不同的 Codex 启动实现。
- [x] 再查 CLIAdapter 消费者，确认后删模块，保留哈希条目。

## 验证与记录

- [x] `python dev/check_trellis_hooks.py`：旧/新协议差分及永久回归。
- [x] `python .trellis/scripts/task.py --help`、`python .trellis/scripts/get_context.py --mode packages`：基本命令链仍正常。
- [x] 校验模板记录字节未改；核对更新器对定制/删除的分类。若调用 CLI dry-run，只在隔离副本执行，不真实 update 主项目。
- [x] 删除符号运行引用检查；文档示例与管理基线单独归类。
- [x] 同步本项目框架维护说明，不改 bundled skill 或全局安装。
- [x] `git diff --check`；检查变更只在入口、共享模块、死代码、测试和必要说明。
- [x] 报告实际行数，去重与死函数删除不重复计算；真实宿主验收未做则保留未验证。

完成本组后由父任务做九项全范围集成检查；仍不自动提交、推送或部署。
