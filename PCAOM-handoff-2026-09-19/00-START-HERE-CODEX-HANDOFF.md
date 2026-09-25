# PCAOM / Codex Agent Orchestration — Codex CLI Handoff

> Date: 2026-09-19  
> Status: research direction defined; theory v0 ready; reference implementation not yet started  
> Primary goal: continue PCAOM research and build the smallest useful reference compiler without drifting into another heavyweight agent framework.

---

# 1. What this package contains

Read these files in order:

1. `01-codex-agent-orchestration-research-plan.md`  
   Original research scope and questions. Defines the comparison baseline, combination analysis, DIY Text Framework, community-evidence requirements, and Token Economics research plan.

2. `02-codex-agent-orchestration-research-v1.md`  
   First completed research synthesis. Covers Native Codex, DIY Text Framework, Superpowers, OMX, their overlap, combined usage, over-orchestration risks, community feedback, and preliminary Token / efficiency models.

3. `03-pcaom-theory-roadmap-and-implementation-plan.md`  
   Current top-level direction. Defines **PCAOM — Project-Compiled Agent Operating Model**, its theoretical ancestry, closest related projects, formal model, implementation roadmap, repo structure, and governance recommendations.

This file is the operational handoff for continuing work in Codex CLI.

---

# 2. Current top-level conclusion

The project direction is no longer simply “compare Superpowers and OMX.”

The higher-level idea is:

> **Use expensive methodology and architectural reasoning up front, then compile that knowledge into the smallest project-specific Agent Operating Model. Run Native Codex lightly by default and escalate to Skills, Goals, Subagents, or OMX only when evidence justifies the added complexity.**

Short form:

```text
Design Expensively
        ↓
Compile Project Policy
        ↓
Run Minimally
        ↓
Escalate Selectively
        ↓
Learn from Failures
        ↓
Recompile
```

Core phrase:

> **Compile the Minimum Sufficient Harness for This Project.**

Working name:

# PCAOM — Project-Compiled Agent Operating Model

---

# 3. Why PCAOM exists

Current Native Codex already provides strong primitives:

- `AGENTS.md`
- Skills
- subagents
- custom agents
- `/goal`
- worktrees
- shell/tool execution
- verification capabilities

Superpowers contributes strong software-engineering methodology and task-level micro-orchestration.

OMX contributes durable macro-orchestration, team coordination, worker lifecycle, task state, and long-running execution patterns.

But stacking all layers permanently can create:

- duplicated planning
- duplicated context
- duplicated review
- dual schedulers
- recursive fan-out
- unnecessary ceremony
- token amplification
- human attention overhead

PCAOM therefore treats generic frameworks primarily as **experience / source material for compilation**, not as mandatory permanent runtime layers.

---

# 4. The most important design principle

## One control point, one owner

In particular:

> **One fan-out owner.**

Avoid structures like:

```text
OMX Team
  ↓
Worker
  ↓
Superpowers SDD
  ↓
Implementer subagent
  ↓
Reviewer subagent
  ↓
Native Codex autonomous delegation
```

unless recursive orchestration is explicitly intended and measured.

Default architecture should look more like:

```text
Human
  │
  │ architecture / scope / acceptance
  ▼
Project Agent Policy (PCAOM)
  │
  ▼
Native Codex
  │
  ├─ selected tactical skills
  ├─ /goal when persistence is needed
  └─ OMX Team only when genuine parallel durable lanes exist
```

---

# 5. What has already been established

## 5.1 Native / DIY baseline is strong

A skilled AI coding engineer can get substantial value from:

```text
~/.codex/AGENTS.md
repo/AGENTS.md
architecture docs
implementation plan conventions
selected Skills
/goals
native subagents
worktrees
```

Therefore any added framework must beat a **strong Native Codex + project-specific text policy** baseline, not a naive one-agent baseline.

## 5.2 Superpowers is not only “methodology”

It is better modeled as:

```text
Software Engineering Methodology
+
Plan-centric Micro-Orchestration
```

Useful ideas to distill include:

- requirement / design clarification
- TDD where appropriate
- systematic debugging
- verification before completion
- scoped review
- fresh task context

Do not automatically reproduce the full workflow at runtime.

## 5.3 OMX is not only “multi-agent”

It is better modeled as:

```text
Workflow Operating Layer
+
Durable Macro-Orchestration Runtime
```

Useful ideas to distill include:

- durable task state
- task ownership
- worker lifecycle
- bounded worker context
- explicit evidence return
- single scheduler
- parallelism only for genuinely independent lanes

Do not automatically reproduce the entire OMX runtime unless needed.

## 5.4 Both projects are themselves simplifying

A significant research observation is that both Superpowers and OMX have evolved toward reducing ceremony, duplicate skills, redundant review, and hard workflow gates.

This supports the PCAOM premise:

> More orchestration is not automatically better.

---

# 6. Theoretical positioning already researched

PCAOM is not an isolated invention. It sits at the intersection of:

- Harness Engineering
- Spec-Driven Development
- Context Engineering
- Project Steering
- SOP / Workflow-as-Code
- Automated Agent Design
- DSPy-style compilation
- Partial Evaluation

Closest related engineering / research directions include:

- GitHub Spec Kit
- OpenSpec
- BMAD
- Kiro
- SpecD / SpecDD
- AI Project Rules Generator
- AI Agent Rules Generator
- MetaGPT
- AFlow
- AgentSquare / ADAS
- DSPy

The important distinction is:

> Existing systems often compile **context**, **specs**, **rules**, or **agent workflows**. PCAOM aims to compile a **minimal project-specific operating model** including behavior, context-routing, verification, escalation, and orchestration policy.

---

# 7. Current formal model

PCAOM can be expressed as:

```text
M = Compile(
    S,   # requirements / spec
    A,   # architecture
    C,   # codebase
    P,   # organization / project policy
    K,   # methodology / experience knowledge
    H,   # available agent / harness capabilities
    R    # risk / cost profile
)
```

Output:

```text
M = {
    AlwaysOnRules,
    ConditionalSkills,
    ContextRouting,
    TaskPolicy,
    VerificationPolicy,
    ParallelismPolicy,
    HumanEscalationPolicy,
    OrchestrationEscalationPolicy
}
```

Optimization target:

```text
min Cost(M)
```

where conceptually:

```text
Cost =
α · tokens
+ β · latency
+ γ · human_attention
+ δ · maintenance_complexity
```

subject to:

```text
architecture_compliance >= threshold
correctness >= threshold
risk <= allowed_risk
```

---

# 8. Methodology work that remains

Do **not** continue unlimited literature exploration. The direction is sufficiently grounded to move into formalization.

The next methodology work should focus on four contracts:

## 8.1 Compiler Input / Output Contract

Define exactly:

- mandatory inputs
- optional inputs
- generated outputs
- what is explicitly out of scope

## 8.2 Minimum Sufficient Harness criterion

Every generated rule / skill / control should have:

```text
Reason
Expected benefit
Runtime cost
Trigger
Removal condition
```

Default rule:

> If Native Codex can already do it reliably, do not add another control layer.

## 8.3 Escalation Model

Candidate levels:

```text
L0 Native Agent
L1 Project Rules
L2 Conditional Skill
L3 Goal / durable long-running state
L4 Subagent / parallel execution
L5 Multi-Agent Runtime
L6 Extra review / high-assurance mode
```

Define evidence-based transitions between levels.

## 8.4 Recompile Loop

A new rule should usually be considered only after evidence such as:

- repeated failure
- repeated human intervention
- repeated token waste
- repeated architecture violation
- repeated review finding

This should become **Evidence-Driven Harness Evolution**.

---

# 9. Implementation recommendation

Build a reference implementation, but **do not build a new agent runtime**.

The first implementation should only be a:

# PCAOM Compiler

Minimal concept:

```text
requirements
+ architecture
+ repo
+ experience library
        ↓
    pcaom compile
        ↓
AGENTS.md
+ selected skills
+ context map
+ verification policy
+ escalation policy
+ rationale
```

V0 should be explainable and small.

---

# 10. Recommended V0 output

```text
AGENTS.md

.pcaom/
├── manifest.yaml
├── rationale.md
├── context-map.md
├── escalation-policy.md
└── generated/

.codex/
└── skills/
    ├── <selected-skill-a>/
    └── <selected-skill-b>/
```

Important requirement:

`rationale.md` must explain each generated control:

```text
Rule
Why
Source
Expected runtime cost
Removal condition
```

This is intended to prevent the compiler from generating an opaque “1000-line prompt monster.”

---

# 11. Experience Library V0

Keep it simple and Markdown-based.

Suggested starting structure:

```text
experience/
├── native-codex.md
├── superpowers.md
├── omx.md
├── harness-engineering.md
├── context-engineering.md
├── parallelism.md
├── verification.md
└── anti-patterns.md
```

Recommended entry format:

```text
Pattern
When Useful
When Harmful
Cost
Evidence
Compiler Guidance
```

This library is the compiler's methodology “standard library.”

---

# 12. Repo strategy

## Current recommendation: ONE repo

Suggested repo name:

```text
pcaom
```

Do not split theory and implementation yet.

Reason:

PCAOM is still in a strong theory ↔ implementation co-evolution phase:

```text
Theory
 ↓
Compiler
 ↓
Dogfood
 ↓
Failure / friction
 ↓
Theory revision
```

Splitting now would create unnecessary synchronization and context costs.

Recommended structure:

```text
pcaom/
│
├── README.md
├── AGENTS.md
│
├── docs/
│   ├── theory/
│   ├── methodology/
│   ├── research/
│   └── decisions/
│
├── experience/
│
├── compiler/
│   ├── src/
│   ├── prompts/
│   ├── templates/
│   └── tests/
│
├── examples/
└── evals/
```

Split repositories only later if:

- PCAOM becomes an independent stable spec / standard;
- multiple compiler implementations appear;
- theory and implementation release cadence diverge substantially;
- contributor communities clearly separate.

---

# 13. Recommended workstreams

Keep all three in one repo but separate by directory.

## Track A — Theory / Methodology

Outputs:

```text
docs/theory/
docs/methodology/
```

Responsibilities:

- terminology
- formal model
- related work
- compiler objective
- escalation model
- anti-patterns

## Track B — Reference Compiler

Output:

```text
compiler/
```

Responsibilities:

- project profiling
- experience selection
- policy synthesis
- template generation
- rationale generation

## Track C — Evidence / Evals

Outputs:

```text
examples/
evals/
docs/research/
```

Responsibilities:

- dogfood cases
- generated frameworks
- failure records
- token / latency observations
- recompile examples

---

# 14. Recommended implementation roadmap

## V0 — Method Compiler

```text
Spec + Architecture + Repo + Experience
        ↓
LLM compiler
        ↓
AGENTS.md + policies + selected skills
```

Goal: prove that project-specific compilation is useful.

## V1 — Explainable Compiler

Add:

- manifest
- rationale
- source attribution
- approximate runtime-cost annotation
- escalation map

## V2 — Evidence-Guided Recompiler

Read:

- failure notes
- human interventions
- review findings
- token / latency observations

Then recommend:

```text
add / modify / remove controls
```

## V3 — Optimization / Search

Only later consider:

- AFlow-style workflow search
- DSPy-like optimization
- automatic policy selection
- benchmark-driven synthesis

Do not start here.

---

# 15. Suggested immediate tasks for Codex CLI

Work in this order.

## Task 1 — Bootstrap the repo

Create the single-repo structure described above.

Do not write implementation code yet beyond minimal placeholders.

## Task 2 — Normalize existing research into repo docs

Convert the three supplied research documents into:

```text
docs/theory/pcaom-foundations.md
docs/theory/related-work.md
docs/methodology/compiler-model.md
docs/methodology/escalation-model.md
docs/research/superpowers-omx-study.md
```

Avoid duplicating full passages between documents. Use links.

## Task 3 — Create Experience Library V0

Extract only reusable patterns and anti-patterns from the research.

Do not copy full project documentation.

## Task 4 — Define Compiler Contract V0

Before implementation, write a concrete spec describing:

- inputs
- outputs
- invariants
- non-goals
- complexity regularization
- rationale schema

## Task 5 — Build the smallest `pcaom compile`

The first implementation may simply:

1. read project inputs;
2. summarize project profile;
3. select experience entries;
4. generate policy artifacts;
5. emit rationale.

No daemon, server, UI, team runtime, database, or workflow engine.

## Task 6 — Dogfood one real project

Use an existing real codebase and existing architecture/spec documents.

Primary question:

> Did PCAOM produce a policy that is smaller and more project-specific than a generic framework while remaining sufficient for reliable execution?

## Task 7 — Feed failures back into methodology

The first major methodology revision should come from dogfood evidence, not from adding more conceptual complexity.

---

# 16. Constraints for all future work

Keep these principles stable unless evidence strongly contradicts them:

1. Human owns high-leverage architecture.
2. Spec before compilation.
3. Compile project-specific behavior, not generic best-practice dumps.
4. Native capability is the default.
5. Every additional control has permanent runtime cost.
6. One control point, one owner.
7. One fan-out owner.
8. Escalate complexity only with evidence.
9. Verification requires evidence.
10. Compile infrequently; execute frequently.
11. Recompile from observed failure and friction.
12. No control without evidence.

Additional implementation constraint:

> Do not allow PCAOM itself to become another heavyweight orchestration framework.

---

# 17. Recommended Codex starting prompt

Use the following as the first prompt after placing these files in the new repo:

```text
Read 00-START-HERE-CODEX-HANDOFF.md and the three numbered research documents in order.

We are building PCAOM (Project-Compiled Agent Operating Model): a methodology and minimal reference compiler that turns project requirements, architecture, repo facts, methodology/experience knowledge, available native agent capabilities, and risk/cost constraints into the minimum sufficient project-specific agent operating model.

Do not build another agent runtime. Preserve the core philosophy: Design Expensively, Compile Project Policy, Run Minimally, Escalate Selectively, Learn from Failures, Recompile.

First:
1. summarize the current theory in your own words;
2. identify ambiguities or contradictions across the documents;
3. propose the initial repo tree;
4. propose a concrete Compiler Contract V0;
5. create a phased implementation plan where every phase is independently verifiable.

Do not start implementation until the architecture/spec phase is coherent. Prefer YAGNI, minimal runtime ceremony, native Codex capabilities, and explainable generated policy.
```

---

# 18. End state of this handoff

At handoff time, the project has:

- a defined research problem;
- an initial evidence-based study of Native Codex, DIY, Superpowers, and OMX;
- a higher-level theoretical model (PCAOM);
- related-work positioning;
- a formal compile model;
- an implementation strategy;
- a repo/governance recommendation.

It does **not** yet have:

- a PCAOM repo;
- a finalized formal specification;
- a working compiler;
- dogfood evidence;
- stable benchmarks.

The next stage is therefore:

```text
Formalize
   ↓
Build Minimal Compiler
   ↓
Dogfood
   ↓
Collect Evidence
   ↓
Refine Methodology
```

That is the intended continuation point for Codex CLI.
