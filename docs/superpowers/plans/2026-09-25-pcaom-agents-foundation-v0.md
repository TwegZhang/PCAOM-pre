# PCAOM AGENTS Foundation V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为 PCAOM 仓库建立根 `AGENTS.md`，并提供可供 Reference Compiler 消费的下游项目 wrapper 与 generated-policy 模板，同时用静态契约测试锁定非覆盖、职责边界和验证规则。

**Architecture:** 根 `AGENTS.md` 只承载 PCAOM 仓库专属控制和 source-of-truth 路由；下游模板保存在 `templates/project-agents/`，通过根 wrapper 中的 PCAOM 托管块引用独立的 `.pcaom/AGENTS.generated.md`。本计划不实现对任意外部项目的写入或 merge emitter；该能力在 Reference Compiler 有最小代码骨架后单独按设计文档实现并测试。

**Tech Stack:** Markdown、Python 标准库 `unittest`、`pathlib`；不新增依赖。

---

## Scope Boundary

本计划实现：

- PCAOM 仓库根 `AGENTS.md`；
- 下游项目最小 wrapper 模板；
- 下游项目通用 generated-policy base 模板；
- 模板使用和融合说明；
- 静态契约测试与文档入口。

本计划不实现：

- 修改真实外部项目的 CLI；
- marker merge、原子写入和 rollback 代码；
- Project IR 到项目特化控制的 Compiler emitter；
- `AGENTS.local.md` 或 scoped `AGENTS.md` 的生成；
- 真实项目 dogfood。

这些能力属于后续 Reference Compiler merge-emitter 计划。

## File Structure

- Create: `AGENTS.md` — PCAOM 仓库自身的项目控制入口。
- Create: `templates/project-agents/AGENTS.wrapper.md` — 当下游项目没有根 `AGENTS.md` 时使用的最小 wrapper；已有文件只插入其中的托管块。
- Create: `templates/project-agents/AGENTS.generated.md` — Compiler 生成项目特化政策时使用的通用 base contract。
- Create: `templates/project-agents/README.md` — 解释人工 ownership、托管块、重编译和冲突规则。
- Create: `tests/test_pcaom_agents_contract.py` — 锁定两类 AGENTS 的职责、marker 和非覆盖边界。
- Modify: `README.md` — 增加根控制面和 AGENTS 分层设计入口。
- Modify: `docs/methodology/codex-omx-dsh-usage-guide.md` — 增加两类 AGENTS 与运行时读取关系。
- Modify: `docs/superpowers/plans/2026-09-19-pcaom-v0.md` — 记录 foundation 完成状态，但不勾选 merge emitter 或 dogfood。

仓库当前没有初始 commit/HEAD。执行本计划时不得创建只包含部分 foundation 文件的孤立初始提交；所有 commit 步骤记录为“deferred until repository initialization”。

### Task 1: 锁定 PCAOM 根 AGENTS 契约

**Files:**
- Create: `tests/test_pcaom_agents_contract.py`
- Create: `AGENTS.md`

- [x] **Step 1: 写根 AGENTS 的失败测试**

创建 `tests/test_pcaom_agents_contract.py`：

```python
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PcaomAgentsContractTests(unittest.TestCase):
    def read_required(self, relative: str) -> str:
        path = ROOT / relative
        self.assertTrue(path.is_file(), f"missing required artifact: {path}")
        return path.read_text(encoding="utf-8")

    def test_root_agents_routes_pcaom_work_without_copying_research(self) -> None:
        agents = self.read_required("AGENTS.md")

        for required in (
            "Project Purpose and Boundaries",
            "Source-of-Truth Map",
            "Human owns product scope and architecture",
            "FEATURE_SPEC.md",
            "DSH is the only execution-plane fan-out owner",
            "BLOCKED_ARCHITECTURE",
            "BLOCKED_POLICY_CONFLICT",
            "runtime-smoke-verified",
            "dogfood-verified",
            "docs/methodology/codex-omx-dsh-usage-guide.md",
            "docs/observations/",
        ):
            self.assertIn(required, agents)

        for forbidden in (
            "reimplement an agent runtime",
            "silently overwrite project-owned instructions",
            "claim runtime success from static tests",
        ):
            self.assertIn(forbidden, agents)

    def test_root_agents_source_paths_exist(self) -> None:
        agents = self.read_required("AGENTS.md")
        expected_paths = (
            "README.md",
            "docs/methodology/compiler-contract-v0.md",
            "docs/methodology/codex-omx-dsh-usage-guide.md",
            "docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md",
            "docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md",
            "docs/research/dsh-capability-study.md",
            "templates/larry-dsh-headless/README.md",
            "experience/README.md",
        )
        for relative in expected_paths:
            self.assertIn(relative, agents)
            self.assertTrue((ROOT / relative).exists(), relative)


if __name__ == "__main__":
    unittest.main()
```

- [x] **Step 2: 运行根契约测试并确认 RED**

Run:

```bash
python3 -m unittest tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_root_agents_routes_pcaom_work_without_copying_research -v
```

Expected: FAIL，错误包含 `missing required artifact` 和根 `AGENTS.md` 路径。

- [x] **Step 3: 创建 PCAOM 根 AGENTS.md**

创建 `AGENTS.md`，使用以下完整内容：

```markdown
# PCAOM Project Instructions

## Project Purpose and Boundaries

PCAOM is the Project-Compiled Agent Operating Model. It compiles project facts,
architecture, team policy, risk, cost constraints and evidence-backed practices
into a minimal project operating contract. Human owns product scope and
architecture. PCAOM must not reimplement an agent runtime, workflow engine,
mailbox, scheduler or model provider already supplied by Codex, OMX or DSH.

## Source-of-Truth Map

- `README.md`: current status, completed evidence and startup path.
- `docs/methodology/compiler-contract-v0.md`: Compiler input/output contract and invariants.
- `docs/methodology/codex-omx-dsh-usage-guide.md`: daily Human + Codex + OMX + DSH workflow.
- `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md`: project-level versus feature-level design.
- `docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md`: AGENTS layering, ownership and merge semantics.
- `experience/README.md`: evidence library and compiler guidance.
- `docs/research/dsh-capability-study.md`: pinned DSH capability boundary.
- `templates/larry-dsh-headless/README.md`: current Larry Profile runtime contract.
- `docs/observations/`: real runtime and dogfood evidence.

Do not silently choose between conflicting sources. Identify the conflict,
preserve the narrower verified fact, and update the appropriate source of truth.

## Ownership

- Human owns product scope, architecture, policy exceptions and business acceptance.
- Codex owns requirements clarification, architecture assistance, bounded expert escalation and final review.
- DSH + DeepSeek own cost-first implementation after an approved `FEATURE_SPEC.md` exists.
- During a DSH task, DSH is the only execution-plane fan-out owner.
- OMX is a separate quality-first execution plane; do not nest OMX and DSH without explicit evidence of benefit.

## Task Classification and Context Routing

Before acting, classify the task and read only its required sources:

- methodology or contract: read the relevant `docs/methodology/` and design spec;
- DSH capability or Profile: read the capability study, Profile README and runtime observation;
- Experience Library: read `experience/README.md` and only the referenced entries;
- feature design: read this file, the usage guide, project architecture, relevant code/tests and the current feature discussion;
- dogfood or benchmark: read the approved Spec, manifest, current Profile and prior observation;
- implementation: read the approved implementation plan and execute with fresh verification.

## Feature Spec Design Contract

Every non-trivial project feature receives an approved `FEATURE_SPEC.md` with:

- goal and user value;
- scope and non-goals;
- architecture impact and constraints;
- dependencies, assumptions and risks;
- acceptance criteria;
- exact verification requirements.

`FEATURE_SPEC.md` defines the current iteration. It does not change project
architecture, long-lived policy or Profile ownership. A feature normally reuses
the existing project Profile instead of recompiling it.

## Execution Plane Selection

- Use Codex directly for small, clear and bounded work.
- Use OMX when requirements or architecture remain ambiguous, or quality-first exploration is required.
- Use DSH when the Spec is approved and the remaining work is implementation, testing, fixing and documentation.
- Use Team only when tasks are genuinely independent and coordination cost is justified.

## Escalation and Blockers

Codex escalation from DSH is a bounded one-shot task. Appropriate triggers are
security-sensitive behavior, concurrency or consistency problems, changes across
core boundaries, or repeated reasonable failure on one well-defined problem.

After Codex returns, DeepSeek must re-read the workspace and diff, then run the
required tests independently. Provider text is not completion evidence.

Report `BLOCKED_ARCHITECTURE` when product scope or architecture must change.
Report `BLOCKED_POLICY_CONFLICT` when project-owned and generated policy cannot be
reconciled safely. Do not redesign or silently overwrite project-owned instructions.

## Verification and Status Promotion

Use fresh evidence before every completion or status claim. The status ladder is:

```text
generated-unverified
  -> config-verified
  -> runtime-smoke-verified
  -> dogfood-verified
```

Do not claim runtime success from static tests. Do not promote a status without
recording the command, environment, result and remaining gaps in
`docs/observations/` or the relevant manifest.

## Documentation Synchronization

When a verified runtime capability, Profile version, Compiler contract or project
status changes, update the smallest authoritative set of README, design/research,
template metadata, observation and tests. Preserve historical failures as
superseded evidence rather than deleting them.

## Data and Credential Boundaries

Do not send real repository contents, credentials, tokens or private artifacts to
an external model without authorization. Use synthetic fixtures for smoke tests.
Never record API keys or DSH Web access tokens in repository artifacts.

## Repository-Specific Non-Goals

- Do not reimplement an agent runtime.
- Do not silently overwrite project-owned instructions.
- Do not create Team, Workflow, Schedule or Goal claims unsupported by the pinned DSH version.
- Do not expand complexity without dogfood evidence.
- Do not claim runtime success from static tests.
```

- [x] **Step 4: 运行根 AGENTS 契约测试并确认 GREEN**

Run:

```bash
python3 -m unittest tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_root_agents_routes_pcaom_work_without_copying_research tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_root_agents_source_paths_exist -v
```

Expected: 2 tests PASS。

- [x] **Step 5: Commit gate**

Expected: 输出 `deferred until repository initialization`；不要创建部分初始提交。

### Task 2: 锁定下游项目模板契约

**Files:**
- Modify: `tests/test_pcaom_agents_contract.py`
- Create: `templates/project-agents/AGENTS.wrapper.md`
- Create: `templates/project-agents/AGENTS.generated.md`
- Create: `templates/project-agents/README.md`

- [x] **Step 1: 添加下游模板失败测试**

在 `PcaomAgentsContractTests` 中加入：

```python
    def test_downstream_wrapper_has_one_managed_block_and_preserves_ownership(self) -> None:
        wrapper = self.read_required("templates/project-agents/AGENTS.wrapper.md")

        self.assertEqual(wrapper.count("<!-- PCAOM:START -->"), 1)
        self.assertEqual(wrapper.count("<!-- PCAOM:END -->"), 1)
        self.assertIn("Project-Owned Instructions", wrapper)
        self.assertIn(".pcaom/AGENTS.generated.md", wrapper)
        self.assertIn("Human-maintained project rules", wrapper)
        self.assertIn("BLOCKED_POLICY_CONFLICT", wrapper)
        self.assertLess(
            wrapper.index("<!-- PCAOM:START -->"),
            wrapper.index("<!-- PCAOM:END -->"),
        )

    def test_generated_policy_defines_feature_execution_and_verification(self) -> None:
        policy = self.read_required("templates/project-agents/AGENTS.generated.md")

        for required in (
            "Compiler-Owned Generated Policy",
            "FEATURE_SPEC.md",
            "Human owns product scope and architecture",
            "DSH is the only execution-plane fan-out owner",
            "bounded one-shot",
            "re-read the workspace and diff",
            "BLOCKED_ARCHITECTURE",
            "BLOCKED_POLICY_CONFLICT",
            "PASS",
            "CHANGES_REQUIRED",
        ):
            self.assertIn(required, policy)

    def test_template_readme_documents_non_destructive_recompile(self) -> None:
        readme = self.read_required("templates/project-agents/README.md")

        for required in (
            "PCAOM:START",
            "PCAOM:END",
            "must not modify content outside",
            "AGENTS.local.md",
            "fail closed",
            "Reference Compiler",
        ):
            self.assertIn(required, readme)
```

- [x] **Step 2: 运行下游模板测试并确认 RED**

Run:

```bash
python3 -m unittest \
  tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_downstream_wrapper_has_one_managed_block_and_preserves_ownership \
  tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_generated_policy_defines_feature_execution_and_verification \
  tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_template_readme_documents_non_destructive_recompile -v
```

Expected: 3 tests FAIL，分别报告三个模板文件缺失。

- [x] **Step 3: 创建最小 wrapper 模板**

创建 `templates/project-agents/AGENTS.wrapper.md`：

```markdown
# Project Agent Instructions

## Project-Owned Instructions

Add project-specific architecture, coding, security, directory and verification
rules in this section or in other human-owned sections outside the PCAOM markers.

<!-- PCAOM:START -->
## PCAOM Execution Policy

For PCAOM feature design or DSH execution, read and follow:

- `.pcaom/AGENTS.generated.md`
- the approved project architecture documents
- the current `FEATURE_SPEC.md`

Human-maintained project rules outside this block take precedence over
PCAOM-generated defaults. Report `BLOCKED_POLICY_CONFLICT` instead of silently
overriding a conflict.
<!-- PCAOM:END -->
```

- [x] **Step 4: 创建 generated-policy base 模板**

创建 `templates/project-agents/AGENTS.generated.md`：

```markdown
# PCAOM Compiler-Owned Generated Policy

This file is owned by the PCAOM Compiler. Do not edit it directly. Change the
project-owned instructions, architecture inputs or PCAOM configuration and
recompile instead.

## Authority

System, safety and host permission boundaries remain highest. Human-maintained
project rules keep their native scope and precedence. This generated policy
provides defaults and must not silently override project-owned instructions.
Human owns product scope and architecture.

## Feature Design

Before implementation, require an approved `FEATURE_SPEC.md` containing goal,
user value, scope, non-goals, architecture impact, constraints, assumptions,
risks, acceptance criteria and exact verification requirements.

The Feature Spec defines the current iteration. It cannot change long-lived
project policy or architecture ownership.

## Execution

Use Codex directly for small bounded work, OMX for ambiguous quality-first
exploration, and DSH for implementation after the Spec is approved. During a DSH
task, DSH is the only execution-plane fan-out owner. DeepSeek is the default
implementation, testing, fixing and documentation worker.

## Codex Escalation

Escalation is a bounded one-shot task for security, concurrency, state
consistency, core-boundary changes or repeated failure on one well-defined
problem. Supply the question, constraints, investigated files, attempted work,
evidence and expected result.

After Codex returns, DeepSeek must re-read the workspace and diff and run the
required verification independently. Final provider text is not proof.

## Blockers

Return `BLOCKED_ARCHITECTURE` when implementation requires a product or
architecture decision. Return `BLOCKED_POLICY_CONFLICT` when project-owned and
generated instructions cannot be reconciled safely. Stop the affected work
instead of silently redesigning or overriding policy.

## Completion

Completion evidence includes the final diff summary, fresh commands and exit
codes, relevant test results, remaining gaps and the Codex verdict when required.
Final review returns `PASS` or `CHANGES_REQUIRED`; DSH applies corrections and
reruns verification before presenting another review package.
```

- [x] **Step 5: 创建模板使用说明**

创建 `templates/project-agents/README.md`：

```markdown
# PCAOM Project AGENTS Templates

These templates define the integration boundary between project-owned
instructions and the policy emitted by the Reference Compiler.

## Files

- `AGENTS.wrapper.md`: minimal root file for projects without an existing `AGENTS.md`.
- `AGENTS.generated.md`: common base for `.pcaom/AGENTS.generated.md`.

## Existing Projects

When a project already has `AGENTS.md`, the Compiler inserts or replaces exactly
one block bounded by `PCAOM:START` and `PCAOM:END`. It must not modify content outside
that block. Human-maintained project rules remain project-owned and take
precedence over generated defaults.

## Projects Without AGENTS.md

The Compiler creates the wrapper, after which every section outside the managed
block is project-owned. Recompilation still updates only the managed block and
`.pcaom/AGENTS.generated.md`.

## Other Instruction Files

V0 does not create, replace or claim ownership of scoped `AGENTS.md` files or
`AGENTS.local.md`. Their native scope and precedence remain unchanged.

## Failure Boundary

Malformed, reversed, incomplete or duplicate markers fail closed. Policy
conflicts produce `BLOCKED_POLICY_CONFLICT` and a compile report. The Compiler
does not repair ambiguity by deleting or replacing project instructions.

The deterministic merge implementation belongs to the Reference Compiler and
is not performed by copying these templates manually.
```

- [x] **Step 6: 运行下游模板测试并确认 GREEN**

Run the three-test command from Step 2.

Expected: 3 tests PASS。

- [x] **Step 7: Commit gate**

Expected: 输出 `deferred until repository initialization`；不要创建部分初始提交。

### Task 3: 接入项目文档与阶段状态

**Files:**
- Modify: `README.md`
- Modify: `docs/methodology/codex-omx-dsh-usage-guide.md`
- Modify: `docs/superpowers/plans/2026-09-19-pcaom-v0.md`
- Test: `tests/test_pcaom_agents_contract.py`

- [x] **Step 1: 为文档入口添加失败测试**

在测试类中加入：

```python
    def test_repository_docs_link_agents_foundation(self) -> None:
        readme = self.read_required("README.md")
        guide = self.read_required(
            "docs/methodology/codex-omx-dsh-usage-guide.md"
        )

        self.assertIn("AGENTS.md", readme)
        self.assertIn("templates/project-agents/README.md", readme)
        self.assertIn("PCAOM AGENTS.md 分层与融合设计", readme)
        self.assertIn(".pcaom/AGENTS.generated.md", guide)
        self.assertIn("Human-maintained", guide)
        self.assertIn("PCAOM:START", guide)
```

- [x] **Step 2: 运行文档入口测试并确认 RED**

Run:

```bash
python3 -m unittest tests.test_pcaom_agents_contract.PcaomAgentsContractTests.test_repository_docs_link_agents_foundation -v
```

Expected: FAIL，首先报告 README 缺少模板入口或设计标题。

- [x] **Step 3: 更新 README 入口与状态**

在 README 当前状态的“已完成”列表增加：

```markdown
- 建立 PCAOM 根 `AGENTS.md` 与下游项目 AGENTS wrapper/generated-policy 模板，锁定项目人工规则优先和非破坏式融合边界。
```

在“下次启动入口”中加入：

```markdown
- [PCAOM AGENTS.md 分层与融合设计](docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md)
- [下游项目 AGENTS 模板](templates/project-agents/README.md)
```

不要声明 Reference Compiler merge emitter 已实现。

- [x] **Step 4: 更新组合工作流指南**

在 `docs/methodology/codex-omx-dsh-usage-guide.md` 的项目级配置之后加入：

```markdown
### AGENTS 融合边界

项目人工维护的 `AGENTS.md` 保持权威。PCAOM 将完整生成政策写入
`.pcaom/AGENTS.generated.md`，并只维护根文件中 `PCAOM:START` 与
`PCAOM:END` 之间的薄引用块。Human-maintained 内容、scoped
`AGENTS.md` 和 `AGENTS.local.md` 不被覆盖；无法安全合并时返回
`BLOCKED_POLICY_CONFLICT`。
```

- [x] **Step 5: 更新 phased plan**

在 Phase 3 增加并勾选：

```markdown
- [x] 建立 PCAOM 根 AGENTS contract 和下游 wrapper/generated-policy 静态模板。
```

保留 Reference Compiler merge emitter、真实项目融合和 dogfood 为未完成。

- [x] **Step 6: 运行文档入口测试并确认 GREEN**

Run the single-test command from Step 2.

Expected: PASS。

- [x] **Step 7: Commit gate**

Expected: 输出 `deferred until repository initialization`；不要创建部分初始提交。

### Task 4: 完整验证与交接

**Files:**
- Verify: `AGENTS.md`
- Verify: `templates/project-agents/`
- Verify: `tests/test_pcaom_agents_contract.py`
- Verify: existing Larry Profile contract

- [x] **Step 1: 运行完整单元测试**

Run:

```bash
python3 -m unittest discover -s tests -v
```

Expected: 现有 Larry Profile 5 tests 和新增 AGENTS contract 6 tests 全部 PASS；总计 11 tests，0 failures，0 errors。

- [x] **Step 2: 检查 marker 和 ownership 词汇**

Run:

```bash
rg -n 'PCAOM:START|PCAOM:END|Human-maintained|BLOCKED_POLICY_CONFLICT|AGENTS.local.md' \
  AGENTS.md templates/project-agents docs/methodology/codex-omx-dsh-usage-guide.md
```

Expected: wrapper 各出现一个 start/end marker；模板 README 和指南都说明人工 ownership 与 local/scoped 文件不被接管。

- [x] **Step 3: 检查未实现能力没有被标成完成**

Run:

```bash
rg -n 'merge emitter|dogfood|未完成|not implemented|does not' \
  README.md templates/project-agents docs/superpowers/plans/2026-09-19-pcaom-v0.md
```

Expected: README/plan 不声称 merge emitter 或真实项目 dogfood 已完成；模板 README 明确静态模板不执行 merge。

- [x] **Step 4: 检查计划与设计覆盖**

Run:

```bash
rg -n '根 `AGENTS.md`|AGENTS.generated.md|PCAOM:START|fail closed|验收标准' \
  docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md \
  docs/superpowers/plans/2026-09-25-pcaom-agents-foundation-v0.md
```

Expected: 设计的两类 artifact、托管块、失败边界和验收要求都能映射到实施任务。

- [x] **Step 5: 记录 Git 边界并结束**

Run:

```bash
git status --short
git log -1 --oneline
```

Expected: `git log` 仍报告没有 commit；新增/修改文件保留在工作区，等待仓库统一初始化版本历史。
