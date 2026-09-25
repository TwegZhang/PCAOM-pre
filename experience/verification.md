# Verification Experience

## VER-001 Derive checks from acceptance criteria

**Pattern:** 在执行前把每条验收条件映射到可观察证据或明确的人工判定。

**Level:** L1

**Residency:** standing

**Target:** 所有编译目标和任务类型。

**When Useful:** 任务有明确完成声明，且错误完成会产生返工或风险。

**When Harmful:** 将不可量化的产品判断伪装成自动测试，或为了覆盖表格制造无意义检查。

**Cost:** 前置验证设计、环境准备和证据保存。

**Evidence:** 当前为 `mechanism-inference`；具体 check 的有效性需要项目观察。

**Source:** `docs/theory/pcaom-foundations.md`；`docs/methodology/compiler-contract-v0.md`。

**Compiler Guidance:** 要求 Feature Spec 或项目 policy 同时声明 acceptance 与 verification mapping；无法验证时标记人工验收或 blocker。

**Removal Condition:** 验收条件被删除，或检查不能区分成功与失败且无法修复。

## VER-002 Fresh evidence before completion claims

**Pattern:** 在声明完成前运行能够证明该声明的最新验证，并读取实际输出。

**Level:** L1

**Residency:** standing

**Target:** 所有执行者和 reviewer。

**When Useful:** 任何代码、配置、生成物或行为变化需要完成声明。

**When Harmful:** 重复运行与变更无关的昂贵检查，或把旧日志当作当前证据。

**Cost:** 测试、构建、静态分析时间和结果阅读成本。

**Evidence:** `mechanism-inference`；每次任务需产生新的 `project-observation`。

**Source:** `docs/theory/pcaom-foundations.md`；`docs/methodology/compiler-contract-v0.md`。

**Compiler Guidance:** 常驻“证据先于声明”不变量；具体命令由 repo facts 和 acceptance 决定。

**Removal Condition:** 不删除原则；若某项具体检查不再相关，则替换该检查而非取消 fresh evidence。

## VER-003 Smallest proving check before broader suites

**Pattern:** 先运行能证明当前变更的最小检查，再按风险扩展到 lint、typecheck、build、集成或 smoke test。

**Level:** L1

**Residency:** standing

**Target:** 有多层验证工具的代码库。

**When Useful:** 需要快速反馈，同时最终仍要覆盖受影响系统边界。

**When Harmful:** 只运行局部检查就外推整个系统通过，或机械运行全部套件浪费成本。

**Cost:** 多阶段命令执行和失败定位；通常低于盲目全量验证。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/theory/pcaom-foundations.md`；`docs/methodology/compiler-model.md`。

**Compiler Guidance:** 根据影响面生成有序验证链，并明确每一步证明的 claim；不得以局部结果替代未运行的全局检查。

**Removal Condition:** 项目只有单一验证入口，或分层顺序不能改善反馈与成本。

## VER-004 Aggregate validation after parallel work

**Pattern:** 并行 lane 各自提交局部证据后，由唯一 owner 运行跨 lane 的集成验证。

**Level:** L4

**Residency:** conditional

**Target:** Native subagents、OMX Team 或 DSH Team 的并行执行。

**When Useful:** lane 输出在最终系统中存在接口、构建或行为交互。

**When Harmful:** 把 worker 的局部通过直接当作整体通过，或重复运行没有集成价值的验证。

**Cost:** 聚合上下文、集成测试、冲突处理和最终 owner 时间。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/methodology/compiler-contract-v0.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 任何 parallelism control 必须同时 emit aggregate verification 和 owner；缺少其中之一则禁止并行。

**Removal Condition:** 工作不再并行，或 lane 完全独立且没有共同交付物。

## VER-005 Independent review for high assurance

**Pattern:** 风险、合规或影响面超过项目阈值时，由未承担主要实现的 reviewer 检查 Spec、diff 和验证证据。

**Level:** L6

**Residency:** conditional

**Target:** 高风险变更和 Larry Codex final review。

**When Useful:** 单一实现者错误的代价高于额外 review 成本。

**When Harmful:** 低风险任务也强制昂贵复核，或 reviewer 没有 acceptance 和测试结果。

**Cost:** reviewer Token、延迟、上下文准备与修复循环。

**Evidence:** 当前为 `mechanism-inference`；需记录有效 finding、误报和一次通过率。

**Source:** `docs/methodology/escalation-model.md`；`docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** 根据风险选择 reviewer 和严格度；输出必须是 `PASS`、`CHANGES_REQUIRED` 或明确 blocker。

**Removal Condition:** 风险阈值下降、自动证据充分覆盖，或 review 持续无有效 finding 且成本不合理。

## VER-006 Larry Codex final review

**Pattern:** DSH 完成实现和测试后，把当前 Feature Spec、diff 和测试结果交给 Codex 做有边界的最终验收。

**Level:** L6

**Residency:** conditional

**Target:** Larry DSH Profile。

**When Useful:** 低成本执行者完成了实质代码变更，且高级模型复核成本低于潜在遗漏成本。

**When Harmful:** 所有微小改动都无条件复核，或 Codex 缺少 Spec、diff、测试证据而重新探索整个项目。

**Cost:** 高级模型 Token、review 延迟和 `CHANGES_REQUIRED` 修复循环。

**Evidence:** 设计为 `mechanism-inference`，尚无 `dogfood-validated` 证据。

**Source:** `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** Base Profile 定义接口；Project Overlay 根据风险决定必选或抽样，并记录一次通过率、有效 finding 和成本。

**Removal Condition:** dogfood 表明 final review 无有效增益，或只对高风险类别有收益时缩小触发范围。
