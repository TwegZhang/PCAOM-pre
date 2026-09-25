# Superpowers Experience

## SP-001 Clarify high-impact ambiguity before implementation

**Pattern:** 对产品目标、架构边界、非目标或验收标准存在实质歧义的任务，先进行结构化澄清再计划和实现。

**Level:** L2

**Residency:** conditional

**Target:** 模糊、探索性或高影响需求；Larry 流程中的 Human + Codex Think 阶段。

**When Useful:** 不同答案会改变架构、范围、数据模型或验收结果。

**When Harmful:** 对明确、低风险、可逆的小任务强制长访谈，增加等待与人类注意力。

**Cost:** 前置延迟、对话 Token 和决策参与成本。

**Evidence:** 价值来自 `mechanism-inference`；尚无本项目 dogfood 对照。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** 只为高影响歧义生成澄清触发器；明确任务直接执行。输出必须落为 Spec 或决策记录。

**Removal Condition:** 需求模板已消除该类歧义，或澄清成本长期高于减少的返工。

## SP-002 Test-first behavior lock

**Pattern:** 在修改可观察行为前先定义失败检查或回归测试，再实现最小变更。

**Level:** L2

**Residency:** conditional

**Target:** 有可执行测试环境、回归风险明确的 feature 和 bugfix。

**When Useful:** 行为可被自动断言，修改容易产生回归，或 cleanup 需要证明语义不变。

**When Harmful:** 原型探索、纯文档变更、不可稳定测试的外部系统，或测试搭建成本远超变更风险。

**Cost:** 测试设计与运行时间、fixture 维护和可能的脆弱测试。

**Evidence:** 当前为 `mechanism-inference`；具体收益需项目测试记录支持。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/compiler-contract-v0.md`。

**Compiler Guidance:** 根据行为风险和测试可行性条件启用，不作为所有文件修改的无条件 ceremony。

**Removal Condition:** 测试无法证明目标行为、持续产生误报，或项目风险画像不再支持其成本。

## SP-003 Hypothesis-driven debugging

**Pattern:** 遇到异常行为时先复现、收集证据和定位根因，再提出并验证修复。

**Level:** L2

**Residency:** conditional

**Target:** bug、测试失败、性能退化和非预期行为。

**When Useful:** 症状可能由多层原因造成，直接试错容易掩盖根因或制造新问题。

**When Harmful:** 已有确定、局部、机械性修复仍重复执行完整调查流程。

**Cost:** 诊断时间、日志与实验 Token、复现环境维护。

**Evidence:** 当前为 `mechanism-inference`；应通过修复成功率和复发率 dogfood。

**Source:** `docs/research/superpowers-omx-study.md`。

**Compiler Guidance:** 对异常类任务路由到调试流程，要求区分证据与假设，并以复现测试作为完成条件。

**Removal Condition:** 问题已经稳定归类为机械性修复，或调试流程未改善根因定位与复发率。

## SP-004 Plan with bounded checkpoints

**Pattern:** 将多步骤、依赖明确的任务写成可验证计划，在阶段边界检查结果而非每个微步骤等待人工确认。

**Level:** L2

**Residency:** conditional

**Target:** 多文件或多阶段实现；不适用于一步可完成的修改。

**When Useful:** 顺序、依赖、验收和文件 ownership 需要在执行前明确。

**When Harmful:** 计划粒度过细、重复需求文档，或 reviewer checkpoint 多于风险所需。

**Cost:** 计划 Token、维护漂移、checkpoint 等待和重复 review。

**Evidence:** 当前为 `mechanism-inference`。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/compiler-model.md`。

**Compiler Guidance:** 只在任务复杂度超过直接执行阈值时启用；计划必须引用验收标准并限制 review 次数。

**Removal Condition:** 任务可以安全直接执行，或计划维护和等待成本超过减少的返工。

## SP-005 Independent review for bounded high-risk changes

**Pattern:** 对高风险或影响面大的变更，在实现后使用独立上下文进行审查。

**Level:** L6

**Residency:** conditional

**Target:** 安全、并发、迁移、权限、资金或跨核心边界变更。

**When Useful:** 实现者盲点的后果高，且 reviewer 能获得 Spec、diff 和验证证据。

**When Harmful:** 每个小改动都重复 review，或 reviewer 只是复述实现者结论而无独立检查。

**Cost:** 额外模型 Token、延迟、上下文准备和 finding 处理成本。

**Evidence:** 当前为 `mechanism-inference`；Larry Codex final review 尚待 dogfood。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`。

**Compiler Guidance:** 依据风险触发，明确 reviewer 输入、判定标准和 `PASS/CHANGES_REQUIRED` 输出，避免常驻双重 review。

**Removal Condition:** 风险下降、自动验证充分覆盖，或独立 review 长期没有有效 finding。
