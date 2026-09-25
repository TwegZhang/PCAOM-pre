# PCAOM Anti-patterns

## ANTI-001 Duplicate planning

**Pattern:** Human/Codex、Skill、OMX、DSH 或 worker 对同一范围重复制定互不引用的计划。

**Level:** L2–L5

**Residency:** conditional

**Target:** 所有多层 workflow。

**When Useful:** 仅当第二次计划是明确的独立 critique，并产生可追踪修订时才可能有价值。

**When Harmful:** 重复消耗上下文、产生两个事实源并让执行者无法判断哪个计划有效。

**Cost:** 规划 Token、延迟、同步和漂移修复。

**Evidence:** 当前为 `mechanism-inference`，待 dogfood 记录重复计划成本。

**Source:** `docs/research/superpowers-omx-study.md`。

**Compiler Guidance:** 指定唯一计划 owner 和单一计划 artifact；review 只能批注或修订该 artifact。

**Removal Condition:** 任务只有一个权威计划且所有下游均引用它。

## ANTI-002 Nested orchestration

**Pattern:** 一个 workflow/runtime 启动另一个拥有相同生命周期和任务分发职责的 workflow/runtime。

**Level:** L4–L5

**Residency:** conditional

**Target:** OMX、DSH、Skills 和 Native subagents 的组合。

**When Useful:** 只有上下层职责、状态和终态完全分离且收益有证据时例外。

**When Harmful:** 出现双重 scheduler、重复状态、取消不一致和责任边界模糊。

**Cost:** 协调、恢复、失败诊断和 Token 乘法放大。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/compiler-contract-v0.md`。

**Compiler Guidance:** Regularize 阶段删除重复 orchestration；一个任务树只保留一个 execution plane。

**Removal Condition:** 上下层不再共享调度职责，或其中一层被完全移除。

## ANTI-003 Recursive fan-out

**Pattern:** leader 分发任务后，worker 未经边界授权继续递归创建 worker 或 Team。

**Level:** L4–L5

**Residency:** conditional

**Target:** 所有并行执行模式。

**When Useful:** 没有默认有用场景；需要新的 fan-out 时必须上报唯一 owner 重新划分任务树。

**When Harmful:** worker 数量、重复上下文、冲突和聚合难度呈乘法增长。

**Cost:** Token 求和放大、监督缺失、合并和验证成本。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** Emit 唯一 fan-out owner invariant；worker 只能请求 handoff，不得自行扩张任务树。

**Removal Condition:** 所有 lane 都由同一 owner 分配，worker 不再递归调度。

## ANTI-004 Permanent expensive model

**Pattern:** 高成本模型长期担任可由低成本模型稳定完成的执行循环 Leader 或 worker。

**Level:** L0–L6

**Residency:** conditional

**Target:** Larry DSH 及其他分层模型方案。

**When Useful:** 任务整体高度模糊或高风险，持续高级推理收益已被证明高于成本时才可能合理。

**When Harmful:** 搜索、文档、常规编码和测试也默认消耗高级模型。

**Cost:** 货币、Token 机会成本和并发资源占用。

**Evidence:** 成本差异是设计输入；质量/成本净收益仍为 `mechanism-inference`，待 dogfood。

**Source:** `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** 默认低成本执行，按任务难度升级 bounded Codex；将模型选择与 Team/Goal 选择分开。

**Removal Condition:** 高成本模型只在明确 Think、Escalate、Verify 触发器下使用。

## ANTI-005 Premature Team

**Pattern:** 在任务规模、独立性和 wall-clock 收益未知时启动 Team。

**Level:** L4

**Residency:** conditional

**Target:** Native、OMX 和 DSH 并行执行。

**When Useful:** 没有；Team 必须先满足独立 lane 与聚合验证条件。

**When Harmful:** 小任务被拆碎、共享文件冲突、协调时间超过执行时间。

**Cost:** worker 启动、上下文复制、mailbox、合并与监督。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/methodology/escalation-model.md`；`docs/research/superpowers-omx-study.md`。

**Compiler Guidance:** 默认单 Agent；只有显式估计并行收益、ownership 和验证后才允许 Team。

**Removal Condition:** 退回单 Agent，或补全可证明的并行条件。

## ANTI-006 Per-feature profile recompilation

**Pattern:** 每个 Feature Spec 都重新生成整个 Project Profile。

**Level:** L1–L3

**Residency:** conditional

**Target:** Larry DSH Profile 与其他项目级编译目标。

**When Useful:** 只有 Feature 暴露项目级架构、风险、工具链或资源政策变化时才触发 recompile。

**When Harmful:** 稳定执行制度随需求频繁漂移，无法比较成本和效果。

**Cost:** 编译、review、版本噪声和运行时不一致。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`；`docs/methodology/compiler-contract-v0.md`。

**Compiler Guidance:** Feature Spec 是高频运行输入；只有项目级 recompile trigger 成立时才生成 Profile 新版本。

**Removal Condition:** Profile 恢复低频版本化，Feature 只引用已有有效版本。

## ANTI-007 Fake project specialization

**Pattern:** 项目没有有效差异时仍生成非空 Overlay 或大量定制规则，以显示 Compiler 做了工作。

**Level:** L1–L2

**Residency:** conditional

**Target:** 所有 PCAOM 编译目标。

**When Useful:** 没有；没有差异时空 Overlay 是合法结果。

**When Harmful:** 复制通用最佳实践、增加上下文和维护成本，并掩盖真正项目约束。

**Cost:** Token、review、规则冲突和长期漂移。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/methodology/compiler-contract-v0.md`；`docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** 每项 Overlay control 必须引用项目事实；无法引用时删除，允许输出空 Overlay。

**Removal Condition:** 删除无项目来源的控制，只保留仓库命令或有证据的差异。

## ANTI-008 Execution plane redesigns architecture

**Pattern:** DSH/DeepSeek 在 Feature 执行中自行改变产品范围或核心架构来绕过 blocker。

**Level:** L0–L5

**Residency:** conditional

**Target:** Larry DSH execution plane。

**When Useful:** 没有；局部实现选择可以在授权边界内裁决，但架构变更必须升级。

**When Harmful:** 施工过程偏离 Human + Codex 确认的 Spec，验收基准失效。

**Cost:** 隐性范围扩张、返工、架构漂移和业务风险。

**Evidence:** 当前为 `mechanism-inference`，待 dogfood 观察 blocker 分类。

**Source:** `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`；`docs/theory/pcaom-foundations.md`。

**Compiler Guidance:** Emit `BLOCKED_ARCHITECTURE` 路径：暂停相关 Goal，交还 Human + Codex 形成 Spec 新版本。

**Removal Condition:** 执行面只处理实现决策，所有架构分支均按协议升级。

## ANTI-009 Unverifiable control

**Pattern:** 输出没有来源、触发条件、验证方式或移除条件的规则、Skill 或 escalation。

**Level:** L1–L6

**Residency:** conditional

**Target:** PCAOM Compiler 所有输出。

**When Useful:** 没有；无法验证的控制不属于 V0 输出。

**When Harmful:** 控制无法解释、无法评估收益，最终只会永久堆积。

**Cost:** 常驻 Token、维护、冲突和人类审查成本。

**Evidence:** 属于 Compiler Contract V0 的不变量。

**Source:** `docs/methodology/compiler-contract-v0.md`；`docs/methodology/compiler-model.md`。

**Compiler Guidance:** 在 emit 前拒绝条目并输出 blocker；不得用笼统“最佳实践”补齐缺失字段。

**Removal Condition:** 控制补齐可追溯 schema 并通过选择规则，或从输出中删除。

## ANTI-010 Assumption presented as validated capability

**Pattern:** 将尚未核实的 DSH 接口、模型表现或成本收益写成已验证事实。

**Level:** L0–L6

**Residency:** conditional

**Target:** Larry DSH Profile 和所有外部 harness 集成。

**When Useful:** 没有；设计假设必须显式标注并在实现前验证。

**When Harmful:** Compiler schema 和 workflow 建立在不存在或版本不兼容的能力上。

**Cost:** 返工、错误配置、虚假 benchmark 和集成失败。

**Evidence:** 当前 Larry DSH 能力声明属于待验证设计假设。

**Source:** `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** 未核实能力进入 assumptions/blockers，不进入 `documented-capability`；实现前查实际版本与配置格式。

**Removal Condition:** 能力经官方/实际版本验证，或从设计中删除。

