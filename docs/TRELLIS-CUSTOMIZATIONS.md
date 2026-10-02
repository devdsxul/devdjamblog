# 本项目的 Trellis 定制

本项目使用 Trellis 0.6.17 的生成入口，但不是 Trellis CLI 源码仓库。下列定制只在本项目维护，不修改全局安装、平台注册或上游模板。

## 共享 hook

原平台注册路径保留为 8 行入口，普通 import 后调用 `main()`：

| 原入口 | 共享实现 |
| --- | --- |
| Claude / Codex / Cursor 的 `inject-subagent-context.py` | `.trellis/scripts/hooks/shared_subagent_context.py` |
| Claude / Cursor 的 `session-start.py` | `.trellis/scripts/hooks/shared_session_start.py` |
| Claude / Codex 的 `inject-workflow-state.py` | `.trellis/scripts/hooks/shared_workflow_state.py` |

入口通过 `__file__` 定位项目，不依赖启动 cwd，不改写 `sys.argv[0]`。平台探测、输入输出协议和退出规则仍由原实现负责。Codex 独有的 `session-start.py` 不合并；仅删除未被调用的 `run_script()`。共享 SessionStart 中的同名死函数也已删除。

`.trellis/scripts/common/cli_adapter.py` 没有运行消费者，已删除。文档中的历史示例和模板哈希管理记录不属于运行调用。

## 升级时保留定制

- **不要改写或删除 `.trellis/.template-hashes.json` 中的原记录。** 不能将本地定制哈希冒充上游基线，也不能移除已删除文件的基线条目。
- 0.6.17 更新器将有基线但缺失的文件归为 `userDeletedFiles`，将修改过的入口归为 `changedFiles`；共享模块使用未占用的文件名。
- 升级前先审阅 `trellis update --dry-run`。该命令仍可能查询 npm，应在允许联网的维护环境中运行。
- 对定制冲突选择保留（`--skip-all`），或生成 `.new` 候选（`--create-new`）后人工合并。不要直接对本项目使用 `--force`。
- 保护依赖当前更新器语义和完整基线，不保证抵抗强制覆盖、元数据丢失或未来上游改名。
- 上游 hook 有修复时，应合入共享实现，不把短入口重新扩成三套副本。回退时原入口与共享模块必须成组处理。

## 本地验证

运行 `python dev/check_trellis_hooks.py`。测试依赖本地基准提交 `e5d63f2`，缺失时明确报错，不自动联网获取。

测试在当前 worktree 的 `.runtime/` 内创建临时含空格及中文路径并复制脚本，使用隔离任务、会话和环境；以原路径绝对入口运行旧版与当前版，对比退出码、stdout 和 stderr，另补相对入口验证。不会复制真实任务状态、日记、平台注册或环境文件；环境使用白名单，并设置 Git 向上查找边界和隔离开发者身份。fixture 不含项目版本文件，因此启动回放不会触发版本更新查询。

协议回放不能代替真实 Claude Code / Codex / Cursor 宿主验收；尤其不能据此声称完成平台注册、权限交互或真实会话桥接的人工检查。
