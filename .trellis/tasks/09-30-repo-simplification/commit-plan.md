# 提交计划（已授权）

2026-10-02 用户明确回复「提交并推送」，批准按此三笔范围执行。授权不包含生产部署或复核 worktree 清理。详细验证与边界见 `execution.md`。

## 1. refactor(app): 原生封面与播放器辅助代码精简

- `.trellis/spec/frontend/component-guidelines.md`
- `README.md`
- `dev/check.mjs`
- `dev/check-simplification.mjs`
- `docs/OWNER-GUIDE.md`
- `wp-content/plugins/devdjam-core/admin.css`
- `wp-content/plugins/devdjam-core/admin.js`
- `wp-content/plugins/devdjam-core/devdjam-core.php`
- `wp-content/themes/devdjam/assets/deck.css`
- `wp-content/themes/devdjam/assets/site.css`
- `wp-content/themes/devdjam/assets/site.js`
- `wp-content/themes/devdjam/functions.php`
- `wp-content/themes/devdjam/parts/player.php`
- `wp-content/themes/devdjam/views/home.php`

## 2. refactor(trellis): 共享平台 hook 并删除闲置适配层

- `.claude/hooks/inject-subagent-context.py`
- `.claude/hooks/inject-workflow-state.py`
- `.claude/hooks/session-start.py`
- `.codex/hooks/inject-subagent-context.py`
- `.codex/hooks/inject-workflow-state.py`
- `.codex/hooks/session-start.py`
- `.cursor/hooks/inject-subagent-context.py`
- `.cursor/hooks/session-start.py`
- `.trellis/scripts/common/cli_adapter.py`（删除）
- `.trellis/scripts/hooks/shared_session_start.py`（新增）
- `.trellis/scripts/hooks/shared_subagent_context.py`（新增）
- `.trellis/scripts/hooks/shared_workflow_state.py`（新增）
- `dev/check_trellis_hooks.py`（新增）
- `docs/TRELLIS-CUSTOMIZATIONS.md`（新增）
- `AGENTS.md`

## 3. docs(task): 记录全仓精简规划与验证

- `.trellis/tasks/09-30-repo-simplification/`
- `.trellis/tasks/09-30-simplify-app-tools/`
- `.trellis/tasks/09-30-simplify-trellis-hooks/`

## 保留与后续

- **不纳入** `wp-content/themes/devdjam/index.php` 的 Spotify 修改。
- 平台注册 JSON、模板哈希记录、依赖声明与锁文件无修改，不做无意义暂存。
- 用户确认提交后，先建立功能分支并更新任务分支字段，再按以上范围提交；是否推送以用户明确授权为准。
- 此次不包含生产部署。发布前还须处理缓存版本、执行生产只读预检并取得单独写入授权。
- 三个隔离实现/审查 worktree 保留作复核现场，没有获准清理：`agent-a233a1876f99de914`、`agent-a6f8671c1e0da0c04`、`agent-a976beb95be346b84`。
- 真实后台封面操作、真机与三个平台真实宿主仍未人工验收；两项旧 hook 行为按原样保留，详见框架子任务 execution.md。

## 已生成的代码提交

- `dafd7a1`：应用与检查工具精简。
- `c21a689`：共享 hook 与闲置适配层精简。
- 任务记录随第三笔提交保存；最终推送结果以远端 main 核验为准。
