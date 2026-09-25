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
- 固定的 Larry DSH Profile，提供 DeepSeek 执行和 Codex one-shot delegation 能力。

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

DSH 根据 `AGENTS.md + FEATURE_SPEC.md` 开发。普通任务由 DeepSeek 完成；困难问题升级给 Codex；实现完成后由 Codex 根据 Spec、diff 和最新测试结果做最终验收。

## 3. 执行面选择

- 简单、边界明确的小修改：Codex 直接完成。
- 需求模糊、架构复杂或质量优先：使用 OMX。
- Spec 已清晰、需要大量编码和测试：使用 DSH。
- DSH 遇到复杂 bug、安全、并发或核心模块问题：调用 `subagent_codex`。
- 发现产品范围或架构本身有问题：报告 `BLOCKED_ARCHITECTURE`，回到 Human + Codex，不在执行面擅自重构架构。

OMX 与 DSH 是两个可选择的执行面，不应在没有收益时相互嵌套。

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
