# 框架实施与检查记录（2026-09-30）

## 完成范围

R1/R2/R4 已实施并经独立检查：七个原入口均保留为八行 wrapper，共享三个实现；Codex 独有 SessionStart 仅删除 run_script；CLIAdapter 删除，原模板哈希条目保留。

主代理集成前以 AST 比较原始/共享实现，除确认无调用的 run_script 外均等价；先放共享模块，再原子替换各入口，最后删除无消费者模块。主工作区注册 JSON 与模板基线在集成前后原始字节相同。

## 检查结果

- 实现代理与独立检查均运行差分回放。检查代理额外补强 relative_entry/check_agent/research_agent 的非空与协议内容断言，避免新旧都无输出而误通过。
- 最终主工作区运行 python dev/check_trellis_hooks.py，通过160组新旧差分（320次入口子进程），约53秒。
- task.py current --source、task.py --help、get_context.py --mode packages 均通过。
- 更新器分类复用实施前的实际 analyzeChanges 隔离验证；未运行真实 update 或修改全局安装。
- git diff --check 通过，仅有既有 LF/CRLF 检出提示。

## 保留的旧行为与边界

31字节的某些UTF-8产物截断出现替换字符；绝对路径祖先含 .claude 时部分 argv 平台回退优先 Claude。新旧行为一致，未夹带正确性修复。

早期 fixture 排查发现向上Git/开发者查找风险，最终已用GIT_CEILING_DIRECTORIES、环境白名单、隔离身份和上层空 .trellis 阻断。未观察到真实会话写入。父研究中的24条观察仅是早期参考，最终以160组隔离回放为验收证据。

真实 Claude/Codex/Cursor 宿主、权限交互与真实会话桥接仍未人工验收。当前未提交、推送或部署，隔离工作区保留作复核现场。

## 提交记录（2026-10-02）

用户授权提交并推送，本子任务代码提交为 `c21a689`；推送范围与结果由父任务统一记录。先前“未提交”描述为实施验收当时的状态。未验证人工项目、生产部署和清理边界不变。
