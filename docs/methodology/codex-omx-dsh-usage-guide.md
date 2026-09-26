# Codex + OMX + DSH 组合工作流使用指南

## 1. 核心分工

```text
Human + Codex：想清楚产品、架构与验收标准
OMX：处理模糊、复杂、质量优先的问题
DSH + DeepSeek：按明确规格低成本持续施工
Codex subagent：解决执行过程中的困难 bounded task
Codex：最终高级验收
```

核心原则是：贵模型集中用于 **Think、Escalate、Verify**，便宜模型负责主要 **Execute** 循环。Human 始终拥有产品范围和架构决策权。

## 2. 三个工作层次

### 2.1 项目级配置：低频变化

每个研发项目维护：

- `AGENTS.md`：开发原则、架构边界、成本策略、升级条件和验证规则；
- 架构与项目约束文档；
- 显式选择 Larry DSH Profile，或 [Codex + OMX + DS41 bundle](../../templates/codex-omx-ds41-supervised-team/README.md)，每次执行只激活一个目标。

当前 Larry Profile 安装于：

```text
$DSH_HOME/profiles/larry-dsh-headless
```

Profile 不随每个小需求重新生成。只有项目技术栈、架构边界、风险等级或成本策略发生显著变化时，才进行项目级低频重编译。

### AGENTS 融合边界

项目人工维护的 `AGENTS.md` 始终保有权威，Human-maintained 项目规则优先于 PCAOM 生成的默认政策。按预期的 Compiler 集成设计，PCAOM 将完整生成政策写入 `.pcaom/AGENTS.generated.md`，在根 `AGENTS.md` 中仅维护 `PCAOM:START` 与 `PCAOM:END` 之间的薄引用块。

托管块外的人工内容、子目录 scoped `AGENTS.md` 和 `AGENTS.local.md` 不被覆盖，并保留宿主原生作用域和优先级；无法安全解决的政策冲突返回 `BLOCKED_POLICY_CONFLICT`。当前仅已建立静态模板，Reference Compiler 的非破坏式 merge emitter 尚未实现，也未验证实际融合运行行为。

### 2.2 需求级 Spec：高频变化

每次功能迭代由 Human + Codex 讨论并生成 `FEATURE_SPEC.md`，至少包含：

- 目标与用户价值；
- 范围和非目标；
- 架构约束；
- 验收标准；
- 测试与验证要求。

`AGENTS.md` 决定“怎样工作”，`FEATURE_SPEC.md` 决定“这次做什么”。

### 2.3 执行与验收

Larry 路径由 DSH 根据 `AGENTS.md + FEATURE_SPEC.md` 开发，困难问题升级给 Codex。DS41 路径由独立 DS41 Leader 按相同的已批准 Spec 执行；官方 Codex 监督并在执行生命周期结束后独立验收。

## 3. 执行面选择

- 简单、边界明确的小修改：Codex 直接完成。
- 需求模糊、架构复杂或质量优先：使用 OMX。
- Spec 已清晰、需要大量编码和测试：显式选择 Larry DSH 或 Codex + OMX + DS41。
- DSH 遇到复杂 bug、安全、并发或核心模块问题：调用 `subagent_codex`。
- 发现产品范围或架构本身有问题：报告 `BLOCKED_ARCHITECTURE`，回到 Human + Codex，不在执行面擅自重构架构。

Larry DSH 与 DS41 Team 不得嵌套或同时拥有同一任务树。切换必须等待现有执行生命周期终结，再显式交接。

## 4. 示例：增加“订单 CSV 导出”

### 第一步：用 Codex / OMX 编译需求

在 Codex 会话中描述需求。需求仍有明显歧义时，依次调用：

```text
$deep-interview
$ralplan
```

这两个是 Codex/OMX 工作流指令，不是 shell 命令。最终输出 `FEATURE_SPEC.md`，例如规定：

- 新增 `/api/orders/export`；
- 复用现有权限系统；
- 不修改订单数据结构；
- 覆盖无权限、空数据和大数据量场景；
- `npm test` 与 `npm run lint` 必须通过。

### 第二步：交给 DSH 施工

在项目目录运行：

```bash
cd /path/to/project

dsh --profile larry-dsh-headless \
  "Read AGENTS.md and FEATURE_SPEC.md. Implement the feature, run all required tests, and report changed files, commands, exit codes and remaining risks. Use subagent_codex only for a bounded difficult problem."
```

DeepSeek负责搜索、编码、测试、修复和结果汇总。默认单 Agent 执行，只有真正独立、可并行的任务才增加并发。

### 第三步：困难问题升级

若出现复杂权限、并发一致性、安全或跨核心模块问题，DSH 通过 `subagent_codex` 发起一次明确、有限的任务。请求应包含问题、相关约束、已尝试方案、关键文件和期望结果。

Codex 返回的是 final-text-only 结果。DeepSeek 必须重新读取工作区、检查 diff 并独立运行测试，不能把 Codex 的文字结论直接当作完成证据。

### 第四步：Codex 最终验收

回到 Codex 会话，调用：

```text
$code-review

根据 FEATURE_SPEC.md、当前 diff 和最新测试结果审查。
只给出 PASS 或 CHANGES_REQUIRED，并列出证据。
```

- `PASS`：进入 Human acceptance，完成本次需求；
- `CHANGES_REQUIRED`：交回 DSH 修复、重新测试并再次审查；
- `BLOCKED_ARCHITECTURE`：回到 Human + Codex 修改架构或生成 Spec V2。

## 5. 完成边界

一次需求只有同时满足以下条件才算完成：

- 实现符合 `FEATURE_SPEC.md`；
- 必要测试、lint、typecheck 或 build 使用最新代码运行并通过；
- Codex escalation 后，DeepSeek 已重新检查工作区和验证结果；
- Codex 最终审查给出 `PASS`；
- 剩余风险和未执行检查已明确披露；
- Human 完成业务验收。

## 6. Official Codex supervisor：DS41 路径

这是与第 4 节 Larry 命令并行的可选路径。Human + 官方 Codex 先形成并批准 `FEATURE_SPEC.md`，包含架构边界、验收与精确验证命令；明确授权发送给 DeepSeek 的项目上下文。按 [bundle README](../../templates/codex-omx-ds41-supervised-team/README.md) 安装并检查固定版本、Profile 与环境密钥。安装、静态测试不证明 provider 可运行；当前整体 `generated-unverified`，真实执行 `runtime-unverified`。

Bridge 要求 `FEATURE_SPEC.md` 包含以下精确整行注释与 `## Verification` 标题，标题下至少有一个非空的 shell 代码块（nonempty fenced `sh` or `bash` block）。下面片段可复制；验证命令应替换为该项目 Spec 的实际验收命令：

````markdown
<!-- PCAOM_APPROVED: yes -->
<!-- PCAOM_CONTEXT_TRANSFER: DeepSeek authorized -->

## Verification
```bash
python3 -m unittest discover -s tests -v
```
````

这些是 machine-readable preflight gates，不能替代 Human 审批或真实的数据外发授权；只有已取得相应授权才写入。缺少精确 marker、标题或非空 `sh`/`bash` fence 时，start 在创建 window 前失败。

用户始终在 tmux 内的官方 Codex 调用下游 Skill（以下是 Codex 指令，不是 shell 命令）：

```text
$pcaom-ds41-team start --spec FEATURE_SPEC.md --workers 3
$pcaom-ds41-team status --team <exact-team>
$pcaom-ds41-team await --team <exact-team> --timeout-ms 60000
$pcaom-ds41-team steer --team <exact-team> --message "<instruction>"
$pcaom-ds41-team inspect --team <exact-team> --pane leader
$pcaom-ds41-team resume --team <exact-team>
$pcaom-ds41-team finalize --team <exact-team>
$pcaom-ds41-team abort --team <exact-team>
```

启动在同一 session 的 `ds41-team-<slug>` window 创建独立 DS41 Codex，Leader 和 Workers 使用 `--profile pcaom-ds41`。DS41 Leader 是唯一 Ultragoal、Team、fan-out 和执行写入 owner；官方 Codex 在 Team 活跃时不修改代码、不写其 ledger、不启动竞争 Team。全部用户交互留在 Codex/tmux，不需要新的 dashboard。

启动为两阶段 ACK → GO：Leader 校验上下文、独占写入 `leader-accepted.json` 后结束 turn；Bridge 验证后才提交独立 GO。GO 提交不等于 Team 已启动，不自动重放不确定 GO。每个 run 使用隔离 `.omx-pcaom-team-state/<run_id>`，由 `OMX_TEAM_STATE_ROOT` 传入 Leader/Workers。Leader 必须用真实启动结果和配对 config/manifest 发布 `team-bound.json`。`<exact-team>` 是 Bridge run name，实际 OMX internal name 从该绑定取得，不能由显示名猜测。

监督使用 passive 文件读取与 event-driven `omx team api await-event`；不使用顶层 `omx team status` / `omx team await`，它们在固定版本会监控、分派或集成并改变状态。Bridge 的本地等待不调用模型，无事件时不产生后台监控模型 Token；DS41 自身工作仍可能使用 Token。no daemon：官方 Codex 当前 turn 结束后没有后台模型监控或自动唤醒，下一次 Human 消息先 status，确需恢复时再 resume；resume 会改变和监控状态，不能充当只读检查。

Steering 当前为 `experimental-one-way-file-ack`：sender 未认证，反向 supervisor mailbox 不受支持。发送 `message_id` 后必须得到精确 file ACK；失败则显式降级为同 ID 的已回读 named-buffer，Leader 去重。ACK 仅证明该通道的确认，不是双向 mailbox 验证，不能据此晋升 runtime status。完整参数和失败边界见 [Skill](../../templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/SKILL.md)。早期 [设计](../superpowers/specs/2026-09-26-pcaom-codex-omx-ds41-supervised-team-design.md) 的双向 mailbox 与顶层 await 设想不作为当前能力保证。

DS41 Leader 聚合代码、独立验证并 checkpoint，全部任务 `completed` 后写入 `leader-final.json` 与 handoff；finalize 保存证据并执行精确 shutdown。失败或 `shutdown_uncertain` 不代表完成，不自动重试/force。abort 是显式破坏性终止，不能冒充成功。Team 终结后官方 Codex 重新读取工作区和 diff，独立运行 Spec 验证，给出 `PASS` 或 `CHANGES_REQUIRED`；Human 保有业务验收。记录 topology、模型、worktree、ACK、binding、resume、shutdown 与最终审查证据后才能逐能力晋升。
