# Trellis 共享 hook 与死代码精简

## 目标与来源

完成[父需求](../09-30-repo-simplification/prd.md)中的 R1/R2/R4：消除重复 hook 实现和无消费者辅助层，保留 Claude Code / Codex / Cursor 的原注册入口与行为。此任务在应用/工具子任务完成独立检查后实施；父子关系本身不表示已经满足该先后条件。

## 需求

- R1：三份子代理注入、两份相同 SessionStart、两份工作流提示改为共享实现加原路径入口。
- R2：复核无执行消费者后删除 CLIAdapter 生成模块，保留原模板哈希条目作为用户删除记录。
- R4：删除剩余无调用的 `run_script()`；不同的 Codex SessionStart 不强行合并。
- 保留输入负载、argv、环境变量的平台识别顺序，输出协议、上下文大小限制、路径校验及失败边界。
- 不修改 `.claude/settings.json`、`.codex/hooks.json`、`.cursor/hooks.json`、全局安装、上游源码或 `.template-hashes.json`。

证据与路径定位见[Trellis 研究](../09-30-repo-simplification/research/trellis-runtime.md)。

## 验收

- 父 AC1/AC2/AC3/AC7/AC8 在本任务范围内满足。
- 七个原入口仍可调用，真实消费者不指向已删除模块。
- 同输入差分回放中输出协议与退出行为等价；包含三平台、不同任务状态、非法/非目标输入、UTF-8、路径含空格和非项目 cwd。
- 更新器将定制入口归为用户修改，将 CLIAdapter 归为用户删除；管理基线字节不变。
- 不污染真实会话/任务/日记状态；未运行的真实平台宿主验证明确注明。
- 不新增依赖或自动补丁系统，净削减量只统计一次。

## 范围外

重设计工作流、修复其他 hook 问题、改变平台支持范围、删除独有入口、修改模板上游或全局配置、提交推送及部署。
