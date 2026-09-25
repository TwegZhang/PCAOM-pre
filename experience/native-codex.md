# Native Codex Experience

## NATIVE-001 Native-first baseline

**Pattern:** 优先使用当前 harness 已有的项目指令、工具、shell 和验证能力，再考虑增加编排层。

**Level:** L0

**Residency:** standing

**Target:** 通用；强 Native Codex/DIY 也是 PCAOM dogfood 的比较基线。

**When Useful:** 普通任务边界清楚，原生能力能直接读取仓库、修改文件并运行验证。

**When Harmful:** 将“原生优先”误解为永不升级，导致跨 session 状态、独立复核或真实并行需求得不到满足。

**Cost:** 最低额外 Token 和协调成本；复杂任务可能增加单线程 wall-clock。

**Evidence:** `documented-capability` 支持能力存在；“优先原生整体更优”仍是 `mechanism-inference`。

**Source:** `docs/theory/pcaom-foundations.md`；`docs/research/superpowers-omx-study.md`。

**Compiler Guidance:** 默认不生成额外 workflow；只记录项目入口、边界和验证命令。将 Native/DIY 保留为 dogfood baseline。

**Removal Condition:** 若目标 harness 不具备任务必需能力，或可复查数据证明额外控制持续提高净收益，则升级而非坚持此默认。

## NATIVE-002 Repeated omission becomes a project rule

**Pattern:** 只有同类项目约束或完成定义反复遗漏时，才把它固化为项目常驻规则。

**Level:** L1

**Residency:** standing

**Target:** 所有支持项目级指导文件的 harness。

**When Useful:** 约束跨多数任务有效，遗漏会造成真实返工、风险或验收失败。

**When Harmful:** 规则仅适用于少数任务，或 Native Agent 已稳定遵守，常驻后只增加上下文和维护成本。

**Cost:** 每次任务的上下文 Token、规则冲突风险和长期维护成本。

**Evidence:** 当前为 `mechanism-inference`；具体规则必须引用 `project-observation` 或 dogfood finding。

**Source:** `docs/methodology/escalation-model.md`；`docs/methodology/compiler-contract-v0.md`。

**Compiler Guidance:** 将重复观察改写为简短、可验证的项目规则；在 manifest 记录触发证据、成本和 owner。

**Removal Condition:** 连续观察期内不再发生对应遗漏，或底层 harness 已原生可靠覆盖该约束。

## NATIVE-003 Conditional skill for procedural tasks

**Pattern:** 当某类任务需要可复用、按需加载的程序化步骤时，生成或选择条件 Skill，而不是扩张常驻规则。

**Level:** L2

**Residency:** conditional

**Target:** 支持渐进式 Skill 加载的 harness。

**When Useful:** 任务类型可识别、步骤稳定、遗漏步骤有成本，且触发频率不足以常驻。

**When Harmful:** 触发条件含糊、步骤只是通用常识，或 Skill 与项目规则、其他 workflow 重复规划。

**Cost:** 触发判断、加载上下文、维护版本和执行 ceremony。

**Evidence:** `documented-capability` 支持条件加载；净收益为 `mechanism-inference`。

**Source:** `docs/theory/pcaom-foundations.md`；`docs/methodology/compiler-model.md`。

**Compiler Guidance:** 仅在能定义明确 trigger、验证和 removal condition 时 emit；默认关闭。

**Removal Condition:** 任务消失、步骤不再稳定、原生能力覆盖，或 Skill 成本超过减少的失败与人工干预。

## NATIVE-004 Bounded native subagent parallelism

**Pattern:** 将上下文可隔离、输出可独立验证的任务交给原生 subagent 并行处理。

**Level:** L4

**Residency:** conditional

**Target:** 支持原生 subagent 的 harness；Larry DSH 目标中必须服从 DSH 的唯一 fan-out ownership。

**When Useful:** 至少两个任务无共享写入依赖，并行节省的 wall-clock 大于上下文复制与聚合成本。

**When Harmful:** 任务共享文件或决策状态、需要频繁协调，或已有 DSH/OMX 在分发同一任务树。

**Cost:** 各 worker Token 求和、重复上下文、合并冲突、协调和聚合验证。

**Evidence:** 能力属于 `documented-capability`；收益条件来自 `mechanism-inference`，待 dogfood 量化。

**Source:** `docs/research/superpowers-omx-study.md`；`docs/methodology/escalation-model.md`。

**Compiler Guidance:** 要求声明任务独立性、唯一 fan-out owner、文件 ownership 和聚合验证；否则保持单 Agent。

**Removal Condition:** 并行未降低 wall-clock、返工或冲突增加，或上层 execution plane 已拥有任务分发。

## NATIVE-005 Durable goal only for continuity risk

**Pattern:** 只有任务跨 session、容易丢失进度或确需检查点时，才启用持久 Goal/state。

**Level:** L3

**Residency:** conditional

**Target:** 支持 durable goal 的 Native harness 或 runtime。

**When Useful:** 长任务不能在单次会话安全完成，且恢复点、剩余工作和验证状态必须持久保存。

**When Harmful:** 短任务也创建状态机，造成额外生命周期、过期状态和取消复杂度。

**Cost:** 状态维护、检查点、恢复、取消和人工理解成本。

**Evidence:** 能力属于 `documented-capability`；启用阈值为 `mechanism-inference`。

**Source:** `docs/methodology/escalation-model.md`；`docs/research/superpowers-omx-study.md`。

**Compiler Guidance:** 默认关闭；只有 continuity risk 明确时 emit，并记录完成、恢复和取消条件。

**Removal Condition:** 任务可稳定在单 session 完成，或 durable state 未减少丢失进度与人工恢复。

