# Experience Library V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将已归一化的 PCAOM 研究提取成一套结构统一、可追溯、可供 Compiler 选择和删除控制的 Experience Library V0。

**Architecture:** `experience/README.md` 定义条目 schema、证据等级和编译使用规则；五个主题文件分别承载 Native Codex、Superpowers、OMX、verification 和 anti-patterns。条目只总结当前仓库已记录的结论，并显式标注待 dogfood 验证的推导，不复制第三方完整文档。

**Tech Stack:** Markdown、仓库内 PCAOM foundations/methodology/research/design 文档、`rg`/shell 静态检查。

---

### Task 1: 定义 Experience Library schema

**Files:**
- Create: `experience/README.md`

- [x] **Step 1: 定义条目必需字段**

写明每条经验必须包含 `ID`、`Pattern`、`Level`、`Residency`、`Target`、`When Useful`、`When Harmful`、`Cost`、`Evidence`、`Source` 和 `Compiler Guidance`。

- [x] **Step 2: 定义证据等级**

使用 `documented-capability`、`mechanism-inference`、`project-observation` 和 `dogfood-validated`；禁止把前三者写成已经 benchmark 证明的收益。

- [x] **Step 3: 定义 Compiler 选择规则**

规定无触发条件、与现有能力重复、成本无法解释或没有 removal condition 的候选控制不得输出。

### Task 2: 提取 Native Codex 经验

**Files:**
- Create: `experience/native-codex.md`

- [x] **Step 1: 记录 Native-first baseline 与项目规则模式**

覆盖默认使用既有 harness、仅对重复项目遗漏增加常驻规则，以及强 Native Codex/DIY 作为 dogfood 比较基线。

- [x] **Step 2: 记录原生 subagent 与 durable goal 的条件使用**

明确只有任务独立或跨 session 状态确有需要时才升级，并记录协调成本和移除条件。

### Task 3: 提取 Superpowers 与 OMX 经验

**Files:**
- Create: `experience/superpowers.md`
- Create: `experience/omx.md`

- [x] **Step 1: 提取 Superpowers 的任务级方法模式**

覆盖前置澄清、TDD/systematic debugging、fresh verification 和独立 review，并把 ceremony、过细拆分和重复 review 记录为成本。

- [x] **Step 2: 提取 OMX 的宏编排模式**

覆盖 durable state、Goal、Team、mailbox、worker lifecycle、恢复与 shutdown；只在跨任务、跨 session 或真实并行收益存在时启用。

- [x] **Step 3: 固化唯一 fan-out owner**

明确 OMX、DSH、Skill 和 Native subagent 不得同时拥有同一任务树的分发权。

### Task 4: 提取 Verification 与 Anti-patterns

**Files:**
- Create: `experience/verification.md`
- Create: `experience/anti-patterns.md`

- [x] **Step 1: 提取验证模式**

覆盖从 acceptance 派生验证、fresh evidence、分层验证、独立高风险复核、验证缺口显式化和 Larry 目标的 Codex final review。

- [x] **Step 2: 建立反模式条目**

至少覆盖 duplicate planning、nested orchestration、recursive fan-out、永久高成本模型、无收益 Team、逐 Feature 重编译 Profile、伪 Project Overlay 和执行面擅自重做架构。

### Task 5: 交叉验证并关闭 Phase 2

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-09-19-pcaom-v0.md`
- Modify: `docs/superpowers/plans/2026-09-25-experience-library-v0.md`

- [x] **Step 1: 检查 schema 完整性**

运行：

```bash
for field in 'Pattern' 'When Useful' 'When Harmful' 'Cost' 'Evidence' 'Compiler Guidance'; do rg -L -F "**$field:**" experience/*.md; done
```

预期：除定义 schema 的 `experience/README.md` 外，不输出主题文件。

- [x] **Step 2: 检查唯一 ID 与占位符**

运行：

```bash
rg '^## [A-Z]+-[0-9]+' experience/*.md | sed 's/.*## //' | sort | uniq -d
rg -n 'TBD|FIXME|PLACEHOLDER' experience README.md docs/superpowers/plans/2026-09-19-pcaom-v0.md
```

预期：两条命令均无匹配。

- [x] **Step 3: 人工检查边界**

确认每个条目有来源、触发条件、成本、编译动作和 removal condition；确认 Larry DSH 的假设未被写成已验证事实。

- [x] **Step 4: 更新项目状态**

将主 phased plan 的 Phase 2 三项标记为完成，并在 README 将 Experience Library V0 移入已完成列表。
