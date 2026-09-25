# PCAOM：理论定位、研究路线与实践落地方案
## Project-Compiled Agent Operating Model

> 状态：方向研究 / 方法论形成期  
> 日期：2026-09-19  
> 用途：作为 PCAOM 方向的长期总入口文档，供后续理论研究、原型开发、实验、团队协作和 AI Coding Agent 读取。

---

# 0. Executive Summary

PCAOM（Project-Compiled Agent Operating Model）不是一个“新的重型 Agent Framework”。

它提出的是一种更高层的软件研发与 Agent Engineering 方法：

> **把通用的 Agent 方法论、编排经验、项目架构、项目约束和工具能力，在项目开发前进行一次“编译 / 特化 / 蒸馏”，生成一个项目专用、最小充分的 Agent Operating Model；日常开发尽量由 Native Agent 轻量执行，只有必要时再升级到 Skill、Goal、Subagent 或 Multi-Agent Runtime。**

核心原则：

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

更进一步：

> **Compile the Minimum Sufficient Harness for This Project.**

PCAOM 的目标不是让 Agent 系统拥有更多能力，而是：

- 减少运行时重复推理；
- 减少通用 Workflow 的 ceremony；
- 减少重复 Planning / Review / Fan-out；
- 降低 Token 与 Wall-clock 成本；
- 让 Human 只保留高杠杆架构决策；
- 让项目运行时保持足够薄；
- 通过证据驱动逐步增加控制，而不是一次性装满“最佳实践”。

---

# 1. 原始研究问题

此前研究从以下问题出发：

> Native Codex、Superpowers、Oh My Codex（OMX）分别如何理解 Agent、Task、Workflow 与 Orchestration？

进一步发现：

1. Native Codex 已具备：
   - AGENTS.md
   - Skills
   - Subagents
   - Custom agents
   - Goal / long-running execution
   - Worktrees
   - Verification tools

2. Superpowers 更接近：

```text
Software Engineering Methodology
+
Plan-centric Micro-Orchestration
```

3. OMX 更接近：

```text
Workflow Operating Layer
+
Durable Macro-Orchestration Runtime
```

4. 两者联合使用的主要风险不是“不能组合”，而是：

```text
Duplicate Planner
Duplicate Review
Duplicate Context
Dual Scheduler
Nested Fan-out
Duplicated Cognition
```

因此形成一个新的问题：

> 为什么长期运行通用重型 Framework？
>
> 能否在项目启动时，用这些成熟方法和经验做一次高质量设计，然后把结果“编译”为一个项目专用的轻量 DIY Text Framework？

由此形成 PCAOM。

---

# 2. PCAOM 的基本结构

PCAOM 建议将 AI Coding 生命周期分为四层。

```text
                 HUMAN
                   │
          High-Leverage Decisions
                   │
                   ▼
┌──────────────────────────────┐
│ Architecture / Spec Layer    │
│ Superpowers-assisted         │
└──────────────────────────────┘
                   │
                 Compile
                   ▼
┌──────────────────────────────┐
│ Project Agent Policy Layer   │
│ PCAOM / DIY Text Framework   │
└──────────────────────────────┘
                   │
             Lightweight Runtime
                   ▼
┌──────────────────────────────┐
│ Native Agent Execution       │
│ Codex / equivalent harness   │
└──────────────────────────────┘
                   │
            Exceptional Need
                   ▼
┌──────────────────────────────┐
│ Escalation Layer             │
│ Skill / Goal / Subagent /    │
│ OMX Team / Reviewer          │
└──────────────────────────────┘
```

这与传统堆栈不同。

传统：

```text
Human
 ↓
Superpowers
 ↓
OMX
 ↓
Codex
```

PCAOM：

```text
Heavy Methodology
       ↓
    Compile
       ↓
Thin Project Policy
       ↓
Native Execution
       ↓
Escalate only when needed
```

---

# 3. PCAOM 的理论定位

本轮研究发现，PCAOM 并不是凭空产生的。

它位于以下成熟或快速发展的思想交叉处。

---

## 3.1 Harness Engineering

Harness Engineering 关注：

- repository knowledge
- constraints
- feedback loops
- verification
- context isolation
- tools
- runtime environment

核心思想：

> 不只是优化模型，而是优化模型工作的工程环境。

PCAOM 可以被看作：

```text
Harness Engineering
        │
        └── Project-Specific Harness
                 │
                 └── Compiled / Specialized Harness
                         │
                         └── PCAOM
```

PCAOM 的差异在于：

> 不仅维护 Harness，还把“如何为一个具体项目构造 Harness”本身定义为一个编译问题。

---

## 3.2 Spec-Driven Development

已有大量实践证明：

```text
Requirement
 ↓
Spec
 ↓
Plan
 ↓
Task
 ↓
Implementation
```

比依赖聊天历史更可靠。

相关路线包括：

- GitHub Spec Kit
- OpenSpec
- SpecDD
- SpecD
- BMAD

PCAOM 完全继承这条思想，但把 Spec 作为“编译器输入”，而不是只作为运行时文档。

---

## 3.3 Context Engineering

大量项目已经使用：

- AGENTS.md
- CLAUDE.md
- project-context.md
- steering files
- repository-specific instructions

来显式保存项目知识。

研究和工程实践也逐渐形成共识：

> 更多 Context 不等于更好；Context 应该相关、分层、可按需加载。

PCAOM 因此不是：

> 生成一个巨大 AGENTS.md。

而是：

> 编译最少必要的 Always-On Rules + Conditional Context + Skills。

---

## 3.4 Project Steering

Kiro 等系统已经实现：

```text
Repository
 ↓
Analysis
 ↓
product.md
tech.md
structure.md
 ↓
Persistent Agent Steering
```

BMAD 也有：

```text
Architecture
 ↓
project-context.md
```

说明：

> 项目级上下文自动生成已经是明确存在的工程方向。

---

## 3.5 Workflow-as-Code / SOP-as-Code

MetaGPT 提出了：

```text
Code = SOP(Team)
```

即：

> 软件团队的 SOP 可以编码为 Agent Workflow。

Superpowers 也在实践：

```text
Brainstorm
TDD
Debugging
Review
Verification
```

的可执行化。

PCAOM 的不同在于：

> 通用 SOP 不直接作为永久 Runtime，而要先针对项目特化。

---

## 3.6 Automated Agent Design

AFlow、AgentSquare、ADAS 等研究已经提出：

> Agent Workflow / Agent Architecture 可以通过搜索、优化或 Meta-Agent 自动设计。

典型结构：

```text
Agent Design Space
+
Task / Benchmark
+
Evaluation
        ↓
Search / Optimizer
        ↓
Specialized Agent System
```

这证明：

> “让 AI 设计 Agent 系统”本身已经是独立研究方向。

---

## 3.7 DSPy 风格的 Compilation

DSPy 提供了最接近 PCAOM 的“Compiler”理论语言：

```text
Generic LM Program
+
Data
+
Metric
        ↓
Optimizer.compile()
        ↓
Optimized LM Program
```

PCAOM 对应：

```text
Generic Development Methodology
+
Project Spec
+
Architecture
+
Codebase
+
Experience Library
+
Risk / Cost Target
        ↓
PCAOM Compiler
        ↓
Project-Specific Agent Operating Model
```

---

## 3.8 Partial Evaluation

这是 PCAOM 最重要的经典计算机科学类比之一。

对于一个通用 Framework：

```text
Framework(Project, Task)
```

如果 Project 在 Runtime 前已经知道：

```text
Project = fixed
```

则可以提前求值：

```text
ProjectFramework(Task)
```

也就是：

```text
Generic Framework
        +
Known Project Properties
        ↓
Partial Evaluation
        ↓
Specialized Framework
```

很多运行时判断因此可以提前消除：

```text
是否需要 Brainstorm？
是否需要 Plan？
是否需要 TDD？
是否允许改架构？
什么时候 Reviewer？
什么时候 Fan-out？
什么时候 Human Approval？
```

---

# 4. 当前最接近 PCAOM 的现有项目

目前没有发现一个成熟项目完整覆盖 PCAOM，但已有多个重要先例。

| 项目 / 理论 | 已覆盖能力 | 与 PCAOM 的主要差距 |
|---|---|---|
| Harness Engineering | Agent 工程环境、约束、反馈循环 | 未系统定义 project-specific compile |
| GitHub Spec Kit | Constitution → Spec → Plan → Tasks | Workflow 仍是通用的 |
| OpenSpec | 轻量 Spec artifacts | 不生成 project agent operating model |
| BMAD | Architecture → project-context | 主要编译 Knowledge，而不是行为与编排策略 |
| Kiro | Repo → steering files | 主要编译 Context |
| SpecD | Spec → compiled task context | 编译单任务 Context，不是项目 Operating Model |
| AI Project Rules Generator | Project + skills → AGENTS.md | 工程规模小，优化目标和评估不足 |
| AI Agent Rules Generator | Codebase → rules / skills / lifecycle | 偏脚手架生成，容易“大而全” |
| MetaGPT | SOP-as-Agent-Workflow | 通用 SOP，不做项目特化 |
| AFlow | 自动搜索 Agent Workflow | Benchmark / task 导向，不是长期 repo operating model |
| AgentSquare / ADAS | 自动 Agent Architecture Design | 通用 Agent 设计，而非 coding-project harness |
| DSPy | Compile + Optimization | 不针对 Software Engineering Harness |

因此：

> PCAOM 的“零件”已经被广泛验证，但“项目级最小充分 Harness 编译器”这一完整闭环尚未形成主流成熟方案。

---

# 5. PCAOM 真正应该定义的新东西

如果 PCAOM 只是：

> AI 自动生成 AGENTS.md

价值不足。

至少需要包含以下四个核心。

---

## 5.1 Project Specialization

Compiler 的输入必须至少包括：

```text
Requirements / Spec
Architecture Decisions
Codebase
Team Preferences
Risk Profile
Tool / Harness Capabilities
```

---

## 5.2 Experience Distillation

Compiler 还应该读取一个 Experience Library：

```text
Superpowers Experience
OMX Experience
Native Agent Best Practices
Organization Knowledge
Historical Project Failures
Internal Playbooks
```

但不是全部复制。

而是：

```text
Select
→ Specialize
→ Compress
→ Emit
```

---

## 5.3 Explicit Optimization Objective

这是 PCAOM 与普通 Rules Generator 的关键区别。

Compiler 应求解：

```text
minimize:

Runtime Token Cost
+ Wall Clock
+ Human Interruptions
+ Framework Complexity
+ Maintenance Cost
```

同时满足：

```text
Architecture Compliance ≥ threshold
Verification Reliability ≥ threshold
Risk ≤ Rmax
```

---

## 5.4 Escalation Instead of Permanent Complexity

默认输出应当尽量薄：

```text
Native Agent
+
Project Policy
```

只有满足条件才升级：

```text
Skill
→ Goal
→ Subagent
→ Multi-Agent Team
→ Additional Reviewer
```

---

# 6. PCAOM 的形式化表达

可以将 PCAOM 定义为：

```text
M = Compile(
    S,   # Requirements / Spec
    A,   # Architecture
    C,   # Codebase
    P,   # Organization / Project Policy
    K,   # Methodology / Experience Knowledge
    H,   # Available Agent / Harness Capabilities
    R    # Risk / Cost Profile
)
```

输出：

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

目标：

```text
min Cost(M)
```

其中：

```text
Cost(M) =
α · Tokens
+ β · Latency
+ γ · HumanAttention
+ δ · MaintenanceComplexity
```

约束：

```text
ArchitectureCompliance ≥ Q1
Correctness ≥ Q2
Risk ≤ Rmax
```

---

# 7. PCAOM 的运行生命周期

PCAOM 不应该是 Compile Once Forever。

更准确的生命周期：

```text
Architecture / Spec
        ↓
Compile v1
        ↓
Run
        ↓
Observe
        ↓
Failures / Friction / Waste
        ↓
Update Experience / Policy
        ↓
Recompile v2
```

即：

> **Compile Infrequently, Execute Frequently, Recompile from Evidence.**

---

# 8. 方法论研究还需要继续吗？

答案：需要，但不应该无限理论化。

当前理论已经足够支撑一个 V0 方法论与原型。

继续理论研究的目标应该从：

> 继续寻找更多概念

转向：

> 把已经找到的概念统一成一套可执行、可证伪、可迭代的方法。

建议接下来只补齐四个方法论问题。

---

## 8.1 定义 Compiler 的输入与输出 Contract

必须明确：

### 输入

哪些是必需：

- spec
- architecture
- repo facts

哪些可选：

- risk profile
- team preferences
- organization conventions
- methodology libraries

### 输出

必须明确产物：

```text
AGENTS.md
project policy
conditional skills
verification policy
escalation policy
context map
```

避免 Compiler 变成无限制文档生成器。

---

## 8.2 定义 Minimum Sufficient 的判定标准

必须回答：

> 为什么这条 Rule 应该存在？

建议每一个生成的控制项都要求：

```text
Reason
Expected Benefit
Runtime Cost
Trigger
Removal Condition
```

如果无法解释，就默认删除。

---

## 8.3 定义 Escalation Model

至少建立一个稳定的层级：

```text
L0 Native Agent
L1 Project Rules
L2 Conditional Skill
L3 Goal / Long-running State
L4 Subagent / Parallel Execution
L5 Multi-Agent Runtime
L6 Extra Review / High-Assurance Mode
```

并定义：

> 什么条件才允许从 L(n) 升级到 L(n+1)。

---

## 8.4 定义 Learning / Recompile Loop

什么时候修改 PCAOM？

不应该：

> 每次觉得可能有用就加 Rule。

更合理：

```text
Repeated Failure
Repeated Human Intervention
Repeated Token Waste
Repeated Architecture Violation
Repeated Review Finding
```

才进入候选修改。

即：

> Evidence-Driven Harness Evolution.

---

# 9. 实践层面必须有自己的实现

只做理论不够。

原因：

1. PCAOM 的关键主张是：
   > Compile Heavy, Run Light

2. 是否真的“轻”，必须通过真实生成物验证。

3. 如果没有实现，很容易逐步退化成：
   > 一套漂亮的方法论文档。

因此建议：

> 理论和原型同步演进。

但第一版实现必须极小。

---

# 10. V0 实现不应该做什么

不要立即实现：

- 多 Agent Runtime
- Web UI
- Workflow Engine
- State Machine
- Server
- Dashboard
- 自定义 Agent Harness
- 新 DSL
- 完整自动 Benchmark 平台

因为这些都违反 PCAOM 自己的理论。

---

# 11. V0 最小实现

建议 V0 是一个：

# Project Agent Model Compiler

可以是：

```text
CLI + Prompt/Skill + Templates
```

输入：

```text
docs/requirements.md
docs/architecture.md
repo/
experience/
```

运行：

```text
pcaom compile
```

输出：

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
    ├── <selected skill A>
    └── <selected skill B>
```

---

# 12. V0 Compiler 的核心能力

只做五件事：

## 1. Project profiling

识别：

- language
- repo structure
- testing
- deployment
- module boundaries
- architecture facts

---

## 2. Method selection

从经验库判断：

- 哪些规则适合项目
- 哪些 Skill 值得保留
- 哪些通用 workflow 应删除

---

## 3. Policy generation

生成：

- Always-on Rules
- Task Policy
- Verification Policy
- Human Escalation
- Orchestration Escalation

---

## 4. Complexity regularization

强制 Compiler 做删除：

```text
Can Native Agent already do this reliably?
If yes:
do not add control.
```

---

## 5. Explainability

每条规则都在：

```text
.pcaom/rationale.md
```

解释：

```text
Rule:
Why:
Source:
Runtime cost:
Remove when:
```

这会防止 Framework 黑盒膨胀。

---

# 13. Experience Library 的第一版

不要做数据库。

直接使用 Markdown：

```text
experience/
├── native-codex.md
├── superpowers.md
├── omx.md
├── context-engineering.md
├── harness-engineering.md
├── parallelism.md
├── verification.md
└── anti-patterns.md
```

每条经验使用统一格式：

```text
Pattern
When Useful
When Harmful
Cost
Evidence
Compiler Guidance
```

这实际上就是 PCAOM 的“标准库”。

---

# 14. Repo 应该一个还是两个？

当前建议：

# 先一个 Repo。

原因不是简单，而是 PCAOM 当前处于：

> Theory ↔ Implementation 强耦合的形成期。

如果现在拆两个 Repo：

```text
pcaom-theory
pcaom
```

会过早制造：

- 两套 Issue
- 两套版本
- 两套 PR
- 双向引用
- 理论与实现不同步
- AI Agent context 分裂
- 发布管理成本

而现在真正需要的是：

```text
一个想法
 ↓
实现验证
 ↓
理论修正
 ↓
再实现
```

这是一个非常紧的 loop。

---

# 15. 推荐 Repo 结构

建议建立：

```text
pcaom/
```

而不是一开始分 theory / implementation 两仓。

推荐：

```text
pcaom/
│
├── README.md
│
├── AGENTS.md
│
├── docs/
│   ├── theory/
│   │   ├── pcaom-foundations.md
│   │   ├── related-work.md
│   │   ├── minimum-sufficient-harness.md
│   │   └── terminology.md
│   │
│   ├── methodology/
│   │   ├── compiler-model.md
│   │   ├── escalation-model.md
│   │   ├── lifecycle.md
│   │   └── evaluation.md
│   │
│   ├── research/
│   │   ├── superpowers-omx-study.md
│   │   └── research-notes/
│   │
│   └── decisions/
│       └── ADR-*.md
│
├── experience/
│   ├── native-codex.md
│   ├── superpowers.md
│   ├── omx.md
│   └── anti-patterns.md
│
├── compiler/
│   ├── src/
│   ├── prompts/
│   ├── templates/
│   └── tests/
│
├── examples/
│   ├── minimal-python/
│   ├── web-app/
│   └── multi-module/
│
└── evals/
```

---

# 16. 为什么理论和实现现在应该同仓

## 16.1 PCAOM 本身强调 Co-Evolution

理论必须从实现失败中学习。

如果分仓，容易形成：

```text
Theory repo:
越来越漂亮

Implementation repo:
越来越现实

最后两者不是同一个东西
```

---

## 16.2 Codex / Agent 更容易工作

一个 Agent 在同一个 repo 中可以：

```text
read theory
read methodology
read compiler
run evals
update ADR
```

非常符合 AI Coding。

---

## 16.3 Git History 能保存理论 → 实现演化

例如：

```text
commit:
Define one-fan-out-owner principle

↓

commit:
compiler emits parallelism policy

↓

eval:
nested-agent cost reduced
```

这种 history 非常有研究价值。

---

# 17. 什么时候应该拆成两个 Repo？

不是永远不拆。

满足以下任一条件时再考虑：

## 条件 A：理论成为独立标准 / 论文

例如出现：

```text
PCAOM Specification v1.0
```

且不依赖某个具体实现。

---

## 条件 B：出现多个 Compiler 实现

例如：

```text
pcaom-spec
pcaom-codex
pcaom-claude
pcaom-enterprise
```

这时标准与实现自然分离。

---

## 条件 C：社区 Contributor 明显分化

理论研究者和工具开发者已经是两批人。

---

## 条件 D：版本节奏完全不同

例如：

```text
Methodology:
半年一个版本

Compiler:
每周发布
```

这时拆仓有意义。

---

# 18. 长期可能演化成“两层多仓”

成熟后可能是：

```text
pcaom
  # spec / methodology / standard

pcaom-compiler
  # reference compiler

pcaom-experience
  # methodology / pattern library

pcaom-evals
  # benchmark suite
```

但现在绝对不要一步走到这里。

---

# 19. 建议的研发组织模型

PCAOM 方向可以拆成三个 Workstream。

---

## Track A — Theory / Methodology

负责：

- definitions
- formal model
- terminology
- related work
- escalation theory
- compiler objective
- anti-patterns

产物：

```text
docs/theory/
docs/methodology/
```

---

## Track B — Reference Compiler

负责：

- input parsing
- project profiling
- experience selection
- policy synthesis
- template generation
- rationale output

产物：

```text
compiler/
```

---

## Track C — Evidence / Evals

负责：

- case studies
- generated frameworks
- token observations
- failures
- comparisons
- recompile examples

产物：

```text
examples/
evals/
docs/research/
```

三个 Track 同 Repo，独立目录，可以并行。

---

# 20. 第一阶段不要追求“自动优化”

PCAOM 最终可以走向：

```text
AFlow / DSPy-style optimizer
```

例如根据实际指标自动搜索：

- rules
- skills
- review strategy
- fan-out policy

但 V0 不需要。

V0 应该是：

```text
Human-designed methodology
+
LLM compiler
+
explicit templates
+
explainable output
```

先证明：

> Project-specific compiled policy 本身有价值。

再研究 optimizer。

---

# 21. V0 → V3 演进建议

## V0 — Method Compiler

```text
Spec + Architecture + Repo + Experience
        ↓
LLM
        ↓
AGENTS.md + policies + selected skills
```

目标：

> 能用。

---

## V1 — Explainable Compiler

增加：

- manifest
- rationale
- rule source
- cost estimate
- escalation map

目标：

> 能理解为什么生成这些东西。

---

## V2 — Evidence-Guided Recompiler

读取：

- failure notes
- token observations
- human interventions
- repeated review findings

建议：

```text
add / modify / remove rules
```

目标：

> 能演进。

---

## V3 — Optimization / Search

再考虑：

- AFlow-style workflow search
- DSPy-like optimization
- automatic policy selection
- benchmark-driven synthesis

目标：

> 能优化。

---

# 22. 研究和实现之间的版本关系

建议统一版本：

```text
PCAOM v0.x
```

不是：

```text
Theory v0.3
Compiler v0.8
```

初期保持：

> 方法论和 Reference Compiler 是一个产品的两部分。

每个 Minor Release 必须同时回答：

```text
Theory changed?
Compiler changed?
Evidence?
```

---

# 23. 建议维护四类文档

## 1. Stable Theory

```text
docs/theory/
```

只放相对稳定结论。

---

## 2. Methodology

```text
docs/methodology/
```

定义怎么 Compile / Run / Recompile。

---

## 3. Research Notes

```text
docs/research/
```

允许：

- 未验证假设
- 新论文
- 项目分析
- 社区经验

---

## 4. ADR

关键设计决策使用 ADR：

```text
ADR-001-one-repo.md
ADR-002-one-fanout-owner.md
ADR-003-runtime-minimalism.md
ADR-004-experience-library-markdown.md
```

避免方法论演进失去决策历史。

---

# 24. 建议的核心原则

PCAOM 目前可以先冻结以下原则。

## Principle 1

Human owns high-leverage architecture.

## Principle 2

Spec before compilation.

## Principle 3

Compile project-specific behavior, not generic best-practice dumps.

## Principle 4

Native capability is the default.

## Principle 5

Every additional control has permanent runtime cost.

## Principle 6

One control point, one owner.

## Principle 7

One fan-out owner.

## Principle 8

Escalate complexity only with evidence.

## Principle 9

Verification requires evidence.

## Principle 10

Compile infrequently; execute frequently.

## Principle 11

Recompile from observed failures and friction.

## Principle 12

No control without evidence.

---

# 25. 下一步建议

当前最合适的顺序：

## Step 1 — 建 Repo

```text
pcaom
```

一个 Repo。

---

## Step 2 — 固化理论 v0

将当前研究整理成：

```text
docs/theory/pcaom-foundations.md
docs/theory/related-work.md
docs/methodology/compiler-model.md
docs/methodology/escalation-model.md
```

不要继续无限研究。

---

## Step 3 — 建 Experience Library v0

先只收：

```text
Native Codex
Superpowers
OMX
Harness Engineering
Context Engineering
Anti-patterns
```

---

## Step 4 — 做最小 Compiler

一个 CLI：

```text
pcaom compile
```

不做 Runtime。

---

## Step 5 — 用一个真实项目 Dogfood

输入真实：

- requirements
- architecture
- repo

看 Compiler 生成什么。

核心观察：

> 是否真的比现有 AGENTS.md 更薄、更准、更有用。

---

## Step 6 — 把失败反哺方法论

第一次真正的 PCAOM 理论升级，应来自：

> Reference Compiler 的失败，而不是再读 20 篇论文。

---

# 26. 最终建议

## 方法论层面

需要继续，但已经进入：

> **Formalization，而不是 Exploration。**

下一阶段重点不是继续搜更多 Framework，而是：

- 定义 Contract
- 定义 Cost Model
- 定义 Escalation
- 定义 Recompile Loop

---

## 实践层面

必须配套自己的 Reference Implementation。

但：

> 不要造新的 Agent Runtime。

应该先造：

# PCAOM Compiler

---

## Repo

当前：

# 一个 Repo 最合理。

```text
pcaom/
  docs/
  experience/
  compiler/
  examples/
  evals/
```

以后方法论成熟、出现多个实现后再拆。

---

# 27. 一句话路线图

```text
Research
   ↓
Formalize
   ↓
Build Minimal Compiler
   ↓
Dogfood
   ↓
Collect Evidence
   ↓
Recompile Methodology
   ↓
Eventually Optimize
```

PCAOM 的长期价值不在于成为又一个 Workflow Framework。

而在于建立一套方法：

> **如何针对一个具体软件项目，自动生成最小、足够、可解释、可演化的 Agent Harness。**
