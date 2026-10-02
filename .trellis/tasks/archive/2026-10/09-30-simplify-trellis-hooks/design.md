# Trellis 共享入口设计

## 模块与边界

在 `.trellis/scripts/hooks/` 新建三个模块：

- `shared_subagent_context.py`：原 1216 行共享子代理注入逻辑。
- `shared_session_start.py`：Claude/Cursor 相同的启动逻辑。
- `shared_workflow_state.py`：Claude/Codex 相同的工作流状态逻辑。

原七个 hook 脚本仍在原路径，使用 `Path(__file__).resolve().parents[2]` 定位共享目录，普通 import 后调用 `main()`。不通过 runpy、不重写 sys.argv，不从当前工作目录猜共享模块位置。

共享目录不触发 `common/__init__.py` 的额外提早初始化；实现自身仍按旧逻辑在需要时加载 common。保持原代码，先做物理搬移和删除已证明未调用的函数，不把业务重构掺入共享改造。

Codex 专有 `session-start.py`、Cursor `inject-shell-session-context.py` 与其他非重复入口保留。前者仅删除无调用 run_script，后者不修改。

## 可删除模块

`.trellis/scripts/common/cli_adapter.py` 在仓库运行代码和当前安装的 CLI 执行 JS 中没有消费者；模板读取/注册不算运行调用。实施前再次核对，若发现新的实际消费者则暂停该删除并回报，不悄悄留下破损入口。

## 更新机制

不手改 `.template-hashes.json`。0.6.17 已将“文件缺失但有原记录”作为 userDeletedFiles，将定制文件作为 changedFiles。保留原记录即可保持删除与冲突提示；新共享模块使用不与模板重名的文件名。

正常升级先 dry-run，对本地定制选择保留或审阅 .new。强制覆盖和未来上游改名不在保护承诺内。不得添加空文件墓碑、额外更新守护器或修改全局 npm 包。

## 测试结构

使用 Python 标准库 subprocess/tempfile/unittest 构造独立仓库 fixture，放入最小任务、规范和运行状态。清理真实平台环境变量后只设置当前用例必要字段，防止读取主项目活动任务。

先对旧入口收集基线，再用新入口回放。验证入口行为而不只验证共享模块；对确实变化的临时根路径/时间做受限规范化，不忽略 stderr、退出码或正文差异。永久测试保留协议断言，不把整份旧 hook 复制进测试造成另一套实现。

## 回退

共享模块与原入口成组回退，保持至少一种完整可调用实现。任何测试导致真实会话状态变化立即停止并定位，不清空主项目 runtime 补救。
