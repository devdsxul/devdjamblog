# Trellis 共享入口与更新保护研究

核对日期：2026-09-30。范围：当前仓库及当前安装的 Trellis 0.6.17 发布包，只读检查；未修改全局包、配置或产品代码。

## 本地来源与边界

- `.trellis/.version` 与 `trellis --version` 均为 `0.6.17`。
- 项目不是 Trellis CLI 源码仓库：`git ls-files '*templates*' '*cli_adapter*'` 仅列出生成的 `common/cli_adapter.py`。npm 发布包中可以读取生成器，但不是本次写入目标。
- `.trellis/.template-hashes.json` 为 `{ __version: 2, hashes: ... }`，是更新器的基线记录，不是可随意删改的生成配置。
- 当前平台注册保持不变：Claude 的 SessionStart / PreToolUse / UserPromptSubmit；Codex 的 UserPromptSubmit / SubagentStart；Cursor 的 sessionStart / preToolUse / beforeShellExecution。只替换重复 hook 的内部实现位置，不改注册或其他桥接脚本。

## 重复实现与共享方案依据

逐字比较已确认：

| 原文件组 | 行数 | 处理边界 |
| --- | ---: | --- |
| `.claude/.codex/.cursor` 各自的 `hooks/inject-subagent-context.py` | 每份 1216 | 三个入口保留，共享同一个实现 |
| `.claude/.cursor` 各自的 `hooks/session-start.py` | 每份 949 | 两个入口保留；Codex 的不同启动实现不强行合并 |
| `.claude/.codex` 各自的 `hooks/inject-workflow-state.py` | 每份 488 | 两个入口保留，共享同一个实现 |

实现读取 `sys.argv[0]` 推断平台（子代理注入 119 行、SessionStart 245 行、工作流提示 128 行），且输入负载/环境变量优先级各有明确逻辑。共享入口应普通 import 后调用 `main()`，不能让 runpy 或重写 argv 把原平台路径换成共享模块路径。

推荐共享模块放到现有 `.trellis/scripts/hooks/` 下的 `shared_subagent_context.py`、`shared_session_start.py`、`shared_workflow_state.py`。七个原路径保留短入口，由 `Path(__file__).resolve().parents[2]` 定位项目。使用该目录而非自动执行大量初始化的 `common` 包，可尽量保持原脚本的导入和编码初始化顺序。

## 0.6.17 更新器的已核对行为

证据：本机已安装发布包的 `dist/commands/update.js:625-689`、`:793-845` 与 `dist/utils/template-hash.js`。这些是观察证据，不是本次待修改文件。

- 文件不存在但原哈希记录存在时，`analyzeChanges` 将其加入 `userDeletedFiles`，不作为新增文件恢复。
- 文件存在且不同于原记录时，进入 `changedFiles`；默认冲突选项为 skip，另有 `.new` 副本选项。
- `trellis update --dry-run` 只预览；`--skip-all` 保留修改；`--create-new` 生成候选副本；`--force` 明确允许覆盖修改。
- 因此 R2 删除模块后必须保留其原哈希记录，不能按“删生成清单条目”的直觉处理。R1 修改入口后也不重新计算记录、将定制内容伪装成上游模板。
- 新共享模块不占用现有生成模板文件名。后续升级先 dry-run，再审阅本地定制冲突；不承诺抵抗强制覆盖、元数据丢失或未来上游改名。

## CLIAdapter 与 run_script 的消费者

- 仓库运行代码没有导入 `common.cli_adapter`，也没有调用两个工厂；当前安装包 JS 的命中仅为模板读取和注册，未发现执行该 Python 适配层的消费者。
- `run_script()` 仅有三个定义：Claude/Cursor 同一份 28 行、Codex 独立 20 行。删除重复副本后再移除剩余定义，净行数不得重复计算。
- 实施时重查运行代码引用，文档示例和保留的哈希记录不应被误当作运行调用，也不能为了得到“零命中”删除管理记录。

## 验证要求

1. 修改前在隔离 fixture 中记录代表性输入输出；不在本项目真实会话上反复模拟 SessionStart。
2. 覆盖每个平台入口、无任务/规划任务/实现任务、非目标子代理、有效/无效上下文、从非项目 cwd 以绝对路径启动、含空格路径及 UTF-8 文案。
3. 验证 stdout 协议、退出码和注入内容，不只测试共享模块能 import；仅允许规范化确实非确定性的时间或临时根路径。
4. 比较修改前后 `.template-hashes.json` 字节不变；对定制入口和已删除模块检查更新器分类，必要时在隔离副本 dry-run，不能用实际 update 覆盖主项目。
5. 真实 Claude/Codex/Cursor 宿主中的人工检查与协议回放分开记录。任何未运行的宿主检查保留为未验证。

## 更新分类的隔离验证（实施前）

在独立临时目录中调用安装包的原始 analyzeChanges 函数及 computeHash：有基线的缺失文件进入 userDeletedFiles，改过的入口进入 changedFiles，两个对象均不进入 newFiles/autoUpdateFiles。验证通过；未运行 update 命令，未改主项目哈希或全局包。
回放 SessionStart 时必须清除真实 CLAUDE_ENV_FILE、TRELLIS_CONTEXT_ID 及各平台项目环境变量，再设置 fixture 值；原函数会写 shell 上下文桥接和本地提示标记，不能对真实会话直接反复试验。

## 回放输入细节

- 会话记录形状：`.trellis/.runtime/sessions/<context_key>.json` 的 `current_task` 指向相对任务目录；可在 fixture 使用公开 `set_active_task(task_path, repo_root, platform_input, platform)` 构造，绝不写真实目录。
- Claude/Cursor 子代理输入走 `tool_name=Task|Agent|Subagent` 与 `tool_input.subagent_type/prompt`；Cursor 带 cursor_version。Codex 原生输入为 `hook_event_name=SubagentStart`、agent_type、父 session_id。
- 工作流提示还应覆盖 skip keyword 与禁用 hook 环境变量；SessionStart 会优先使用平台项目目录环境变量，必须全部清理或指向 fixture。
- 当前安装包的 `trellis update --dry-run` 仍会查询 npm 版本，故默认复用已做的纯分类函数隔离验证，不为测试强行触发网络或真实 update。

## 实施后的证据更新

最终框架验收使用 dev/check_trellis_hooks.py 的160组新旧差分及独立审查。早期 old-hook-baseline.json 的24条记录仅供参考，不用作完整隔离或全分支覆盖证明。主工作区集成前后已直接核对注册文件与模板记录字节保持不变；不同worktree与Git blob之间的比较另按换行归一，不能混称同一证据。
