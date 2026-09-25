# OMX Experience

## OMX-001 Durable macro-goal orchestration

**Pattern:** 对跨任务、跨 session、需要检查点和恢复的工作使用 OMX durable goal，而不是用对话记忆维持进度。

**Level:** L3

**Residency:** conditional

**Target:** Quality-first、长周期或多目标工作。

**When Useful:** 任务状态、依赖、完成证据和恢复点必须跨 session 持久化。

**When Harmful:** 单 session 小任务也进入完整状态机，造成额外 ceremony 和取消成本。

**Cost:** 状态文件、ledger、checkpoint、恢复和生命周期管理。

**Evidence:** 能力为 `documented-capability`；相对收益为 `mechanism-inference`。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 只有 continuity risk 明确时允许升级；普通 Larry Feature Spec 默认留在 DSH execution plane。

**Removal Condition:** 工作可稳定在单 session 或 DSH Goal 内完成，或 OMX 状态未减少恢复成本。

## OMX-002 Team for independent parallel lanes

**Pattern:** 任务可划为独立 lane 且 wall-clock 收益大于协调成本时，使用 OMX Team 并行执行。

**Level:** L4

**Residency:** conditional

**Target:** Quality-first 的多模块任务；不与 DSH Team 同时拥有同一任务树。

**When Useful:** lane 有明确 ownership、低共享状态和统一聚合验证。

**When Harmful:** 任务强依赖、共享文件多、规模太小，或只是为了增加 Agent 数量。

**Cost:** worker Token 求和、mailbox、任务生命周期、合并与监督成本。

**Evidence:** Team 能力为 `documented-capability`；收益阈值为 `mechanism-inference`。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 要求 lane 独立性、文件 ownership、唯一 leader 和最终集成验证；否则不启用。

**Removal Condition:** 并行未降低 wall-clock、冲突或返工上升，或任务已由 DSH 分发。

## OMX-003 Mailbox and worker lifecycle for persistent coordination

**Pattern:** 只有协作者需要认领、异步汇报、恢复和明确终态时，使用 mailbox 与 worker lifecycle。

**Level:** L5

**Residency:** conditional

**Target:** 持久多 Agent runtime。

**When Useful:** worker 生命周期长于单次调用，协调状态不能安全依赖即时对话。

**When Harmful:** 一次性 bounded subagent 也进入持久 worker 协议，增加协议和状态故障面。

**Cost:** ACK、claim、状态迁移、mailbox、恢复和 shutdown 管理。

**Evidence:** 能力为 `documented-capability`；采用价值为 `mechanism-inference`。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 仅为真实持久协同选择；one-shot expert 保持一次调用和明确返回，不升级为 worker runtime。

**Removal Condition:** 协作可由 bounded subagent 或单 Agent 完成，或生命周期协议未降低丢失任务和恢复成本。

## OMX-004 Explicit recovery and shutdown

**Pattern:** 对持久 Team/Goal 定义恢复、取消和 shutdown 的精确终态，不依赖隐式进程结束。

**Level:** L5

**Residency:** conditional

**Target:** OMX Team、durable workflow 和其他持久 runtime。

**When Useful:** 中断、失败或取消后仍需要保持任务与 artifact 一致。

**When Harmful:** 非持久的一次性任务被迫承担复杂终态协议。

**Cost:** 状态检查、身份校验、终态等待和清理逻辑。

**Evidence:** 生命周期需求为 `documented-capability` 与 `mechanism-inference` 的组合。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 仅随 L5 runtime 一起 emit；必须使用 runtime 的权威状态和精确 scope。

**Removal Condition:** 不再使用持久 runtime，或目标 runtime 已完全托管且可证明覆盖这些终态。

## OMX-005 OMX owns macro fan-out when active

**Pattern:** OMX 作为宏编排层启用时，由其 leader 独占该任务树的任务分发；worker 内只执行 bounded slice。

**Level:** L4–L5

**Residency:** standing

**Target:** 活跃 OMX Team 或其他 OMX 宏编排流程。

**When Useful:** 防止 worker、Skill、Native subagent 和其他 runtime 对同一任务递归拆分。

**When Harmful:** 将 ownership 规则扩大到无关任务树，阻止安全的局部工具使用或独立工作。

**Cost:** 需要显式 lane 边界和向 leader 上报边界穿越。

**Evidence:** `mechanism-inference`；递归 fan-out 的实际成本待 dogfood 量化。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 编译为 ownership invariant，而非额外 scheduler；明确其 scope 只覆盖当前任务树。

**Removal Condition:** OMX 宏编排退出，或任务树已正式移交给另一个唯一 execution plane。
