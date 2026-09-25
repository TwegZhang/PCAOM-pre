# Codex Agent 编排研究计划
## Native Codex、DIY Text Framework、Superpowers 与 Oh My Codex 的分层模型、组合机制、开发效率与 Token Economics

> 状态：研究范围与计划已确认，尚未进入正式证据收集与结论阶段  
> 用途：作为后续深度研究的唯一入口文档，可直接交给 ChatGPT / Codex / 其他研究 Agent 继续执行  
> 核心原则：先建立统一抽象，再看具体工具；先研究组合关系，再谈“谁更好”；理论分析必须与真实用户经验交叉验证。

---

# 1. 原始问题与研究动机

目标不是做一个简单的：

> Superpowers vs Oh My Codex 功能对比

也不是比较：

- 哪个命令更多
- 哪个 Agent 更多
- 哪个安装更方便
- 哪个 README 更完整

真正关心的是：

> 在 Codex 已经具备较强单 Agent 能力的前提下，再增加 Skill、Workflow、Agent Team、Task Orchestration 等层次，究竟创造了什么价值，又引入了多少额外的认知成本、执行成本、协调成本和 Token 成本？

进一步，需要回答：

> 一个熟练的 AI Coding 工程师，仅使用 Codex + 项目级 AGENTS.md + 少量 Prompt / 规则 / 使用习惯，能否以很低复杂度获得大部分框架收益？

以及：

> Superpowers 与 Oh My Codex 并不是简单的同类替代关系。它们是否位于不同抽象层？如何组合？组合后哪些能力互补，哪些会重复，什么时候会出现“流程套流程”和 Token 过度燃烧？

最终目标是寻找：

# Minimum Sufficient Orchestration

即：

> 在不同复杂度的软件开发任务中，最小但足够的 Agent 编排结构是什么？

---

# 2. 核心研究问题

研究围绕以下问题展开。

## 2.1 Agent 编排到底解决什么问题

需要从第一性原理回答：

- 强 Agent 本身已经能 reasoning、planning、coding、testing，为什么还需要额外框架？
- 编排系统主要解决的是：
  - 上下文不足？
  - 计划不稳定？
  - 执行容易跑偏？
  - 大任务难以拆解？
  - 多任务无法并行？
  - 缺少验证机制？
  - Human intervention 太高？
  - 长任务状态管理不足？
- 哪些问题可以靠 Prompt / AGENTS.md 解决？
- 哪些必须靠 Skill？
- 哪些必须靠真正的 Agent / Task runtime？

---

# 3. 统一抽象模型

后续研究不直接从具体产品 Feature 开始，而先使用统一抽象语言。

一个 AI Coding 系统可以抽象为：

```text
Intent
  ↓
Context
  ↓
Reasoning / Brainstorm
  ↓
Plan
  ↓
Task Decomposition
  ↓
Execution
  ↓
Verification
  ↓
Correction / Retry
  ↓
Completion
```

需要观察每一种方案中：

- Human 控制哪些步骤
- 主 Agent 控制哪些步骤
- Orchestrator 控制哪些步骤
- Worker Agent 控制哪些步骤
- Reviewer / Verifier 是否独立存在
- 状态保存在哪里
- 上下文如何传递
- 哪些步骤可以并行
- 谁负责停止、重试、回滚和验收

---

# 4. 核心概念定义

为避免后续概念混用，需要先统一定义。

## 4.1 Agent

具有独立上下文和一定自主决策能力的执行单元。

重点研究：

- Agent 是否只是 Role Prompt
- 是否拥有独立 Context
- 是否独立执行工具
- 是否有生命周期
- 是否能并发执行
- 是否能被中止 / 重试 / 恢复

---

## 4.2 Task

需要明确区分：

```text
Task ≠ Prompt
```

Task 可能包含：

- 目标
- 输入
- 上下文
- 约束
- 状态
- Owner
- 输出
- Verification
- 生命周期

需要研究不同体系是否真正把 Task 当作一等对象。

---

## 4.3 Skill

重点判断 Skill 到底属于哪一类：

```text
Knowledge
Workflow
Prompt Template
Conditional Instruction
Tool Wrapper
Executable Procedure
```

尤其要研究：

> Skill 相比直接写在 AGENTS.md 中，究竟增加了什么真实能力？

---

## 4.4 Workflow

用于规定：

> 一项工作应该按照什么步骤完成。

例如：

```text
Brainstorm
→ Design
→ Plan
→ Implement
→ Test
→ Review
→ Finish
```

---

## 4.5 Orchestration

用于规定：

> 谁在什么时间，以什么上下文，执行哪个任务，任务之间如何依赖、并行、交接和验证。

因此必须区分：

```text
Workflow ≠ Orchestration
```

---

## 4.6 Context Management

研究：

- 项目 Context
- Task Context
- Agent Context
- Shared Context
- Handoff Context
- Repeated Context
- Long-running Context

以及这些 Context 对 Token 的影响。

---

## 4.7 Verification

不仅是“跑测试”。

包括：

- 测试
- 静态检查
- diff review
- requirement verification
- reviewer agent
- acceptance criteria
- Human approval

---

# 5. 分层假设

当前的研究假设是：

```text
Human
  │
  ▼
Development Method / Cognitive Workflow
  └─ Superpowers
       brainstorm / design / plan / TDD / debugging / review discipline
  │
  ▼
Agent & Task Orchestration
  └─ Oh My Codex
       roles / delegation / parallelism / task lifecycle /
       coordination / verification
  │
  ▼
Execution Harness
  └─ Codex
       reasoning / coding / shell / tools / context /
       native agent primitives
```

注意：

> 这是研究假设，不是最终结论。

正式研究需要通过当前代码、文档、实际机制和社区反馈验证。

---

# 6. 五种主要对比模式

正式研究至少比较以下五种模式。

---

## Mode A：Native Codex

```text
Human
  ↓
Codex
```

特点：

- 尽量少加额外框架
- 依赖 Codex 自身 reasoning / planning / coding
- Human 直接控制任务

用途：

> 最低编排成本 baseline。

---

## Mode B：DIY Textual Framework

```text
Human
  ↓
AGENTS.md
+ Project Rules
+ Prompt Templates
+ Task Conventions
+ Usage Discipline
  ↓
Codex
```

这是非常重要的高手基线。

典型内容可能包括：

- Architecture-first
- Brainstorm-before-code
- Plan before implementation
- Task decomposition
- Verification checklist
- Coding conventions
- Context discipline
- Git / worktree conventions
- tmux / workspace conventions
- Review checklist
- `/goal` 或其他 Codex 原生能力
- Human 决定什么时候并行

核心研究问题：

> 一个熟练 AI Coding 工程师，用 20% 的框架复杂度，能否获得 70%～90% 的实际收益？

---

## Mode C：Codex + Superpowers

```text
Human
  ↓
Superpowers Workflow / Skills
  ↓
Codex
```

重点研究：

> 不增加重型 multi-agent orchestration，仅通过更好的认知流程、软件工程纪律和阶段化 Skill，可以提高多少成功率和开发效率？

---

## Mode D：Codex + Oh My Codex

```text
Human
  ↓
OMX Orchestrator
  ├─ Agent A
  ├─ Agent B
  ├─ Agent C
  └─ Reviewer
       ↓
     Codex
```

重点研究：

> 通过任务拆解、角色分工、Agent specialization、并行和自动验证，可以带来多少 wall-clock 和 human-effort 改善？

同时研究：

> coordination tax 有多大？

---

## Mode E：Codex + Superpowers + Oh My Codex

这是本研究最重要的一类。

两者不是简单替代，而可能处于不同抽象层。

需要研究多种组合方式。

---

# 7. Superpowers 与 OMX 的组合关系

## 7.1 Superpowers 在 OMX 上层

```text
Human
  ↓
Superpowers
  ↓
形成 Design / Plan
  ↓
OMX
  ↓
Task / Agent Distribution
  ↓
Workers
```

可理解为：

> Superpowers 决定“应该怎么开发”。

> OMX 决定“谁来执行”。

这是一个重点验证的自然组合模式。

---

## 7.2 OMX 在上层，每个 Agent 使用完整 Superpowers

```text
OMX
 ├─ Frontend Agent
 │    └─ Superpowers Workflow
 ├─ Backend Agent
 │    └─ Superpowers Workflow
 └─ Reviewer
      └─ Superpowers Workflow
```

这一模式重点研究：

# Nested Orchestration

风险：

- OMX 已经 planning
- Worker 再 planning
- 每个 worker 再 brainstorm
- Reviewer 再重新理解整个需求
- 多层重复 verification

可能形成：

# Duplicated Cognition

这是潜在 Token 爆炸的重要来源。

---

## 7.3 OMX + Selected Superpowers Skills

例如：

```text
OMX
  ↓
Agent / Task orchestration
  ↓
Workers
  ├─ systematic-debugging
  ├─ TDD
  ├─ verification
  └─ finishing-a-branch
```

但不让每个 Worker 都重新：

```text
Brainstorm
→ Design
→ Plan
→ Decompose
```

这种模式可称为：

# OMX Orchestration + Tactical Superpowers

可能是一个非常值得研究的组合。

---

# 8. 重点研究：谁编排谁

联合使用不能简单写成：

```text
Superpowers + OMX
```

必须研究控制关系。

重点问题：

- Planning 由谁负责？
- Task decomposition 由谁负责？
- Worker 能否重新修改 Plan？
- Reviewer 是否重新读取全部需求？
- Superpowers Skill 是由主 Agent 调用还是 Worker 调用？
- OMX 是否已经包含等价流程？
- 哪些控制点只能存在一个 Owner？

最终需要建立：

# Control Ownership Map

例如：

| Control Point | Codex | DIY | Superpowers | OMX |
|---|---|---|---|---|
| Brainstorm | | | | |
| Architecture | | | | |
| Planning | | | | |
| Decomposition | | | | |
| Assignment | | | | |
| Execution | | | | |
| Testing | | | | |
| Review | | | | |
| Retry | | | | |
| Completion | | | | |

后续填入真实结论。

---

# 9. 重叠能力研究

一个重要目标是识别：

# Duplicate Control Points

例如：

```text
Codex 自己 Planning
+
Superpowers Planning
+
OMX Planner
+
Worker 自己重新 Planning
```

如果这些行为同时发生，就可能出现大量重复推理。

因此研究不能只看：

> 框架增加了什么能力。

还要看：

> 它增加的能力是否已经由其他层提供。

---

# 10. Skill vs AGENTS.md

这是研究中的独立主题。

例如：

## Skill 版本

```text
brainstorm skill
planning skill
TDD skill
debugging skill
review skill
```

与：

## AGENTS.md 文字版本

```text
开发新功能时：

1. 先理解需求；
2. 给出设计；
3. 拆成可独立验证的任务；
4. 实现前建立测试或验收方式；
5. 实现；
6. 运行测试；
7. 检查 diff；
8. 完成前验证需求。
```

从第一性原理上，两者可能表达相同知识。

真正差异可能来自：

```text
Static Instruction

vs

Conditional Workflow Injection

vs

Executable Orchestration
```

正式研究要回答：

### Skill 真正增加的价值

可能包括：

- Conditional activation
- 可复用
- Prompt isolation
- 阶段化执行
- 更严格遵循
- Tool integration
- State
- 更长、更完整的方法说明

同时可能增加：

- Context loading
- Token overhead
- Rigidity
- Framework dependence
- Debugging difficulty
- Workflow friction

最终需要判断：

> Superpowers 中哪些能力用 20～50 行 AGENTS.md 就可以替代？

以及：

> 哪些能力真正值得 Skill 化？

---

# 11. OMX vs 文字版 Agent Team

同样需要做还原。

例如 OMX 的：

```text
Agent Team
```

与一个简单的文字规定：

```text
大任务先拆为 3～5 个独立任务。
可独立的任务并行。
每个任务使用单独 worktree。
主 Agent 负责 integration。
每个任务必须验证后才能合并。
```

进行比较。

需要区分四个层次：

## Level 1：理念

文字即可表达。

## Level 2：执行纪律

Agent 是否稳定遵循。

## Level 3：Automation

系统自动完成：

- 创建 worker
- 分配 context
- 建立 worktree
- 追踪状态
- 收集结果

## Level 4：Runtime Guarantees

包括：

- 生命周期
- 并发控制
- 失败处理
- Retry
- Cancel
- Recovery
- 状态一致性

研究重点：

> OMX 的真实价值到底主要发生在哪一层？

---

# 12. 效率评价模型

不能只问：

> 快了多少？

需要至少拆成以下维度。

---

## 12.1 Wall-clock Efficiency

一项工作从开始到完成，实际经历多久。

多 Agent 并行可能显著提高这一指标。

---

## 12.2 Human Efficiency

Human 需要：

- 输入多少次
- Review 多少次
- Handoff 多少次
- 修正多少次
- 手工协调多少次

目标：

> 减少高频人工干预。

---

## 12.3 Agent Efficiency

衡量：

> Agent 完成的工作，有多少最终进入有效产物。

例如：

5 个 Agent 并行探索，最终只采用 1 个结果。

那么：

- Wall-clock 可能很好
- Agent efficiency 可能很差

---

## 12.4 Token Efficiency

衡量：

> 为产生一单位有效结果消耗多少模型 Token。

---

## 12.5 Success / Reliability

包括：

- 第一次完成率
- Regression 数量
- Requirement miss
- Rework
- Human 修正次数

---

## 12.6 Maintenance Cost

框架本身的成本：

- Prompt 维护
- Skill 维护
- Agent definition
- Framework upgrade
- Debugging
- 项目迁移
- 新工程师学习

---

# 13. Token Economics 模型

不直接给出拍脑袋的“3 倍 / 5 倍”。

先拆总 Token：

```text
Total Tokens
=
Useful Execution
+ Context Loading
+ Coordination
+ Handoff
+ Review
+ Verification
+ Retry
+ Speculative Work
+ Duplicated Reasoning
```

---

# 14. Duplicated Reasoning

这是本研究非常重要的成本来源。

例如：

```text
Human Spec
  ↓
Superpowers Brainstorm
  ↓
Superpowers Plan
  ↓
OMX Planner 再拆
  ↓
Worker 读取完整 Plan
  ↓
Worker 自己重新 Plan
  ↓
Reviewer 再重新理解需求
```

真正 coding 也许只需要：

```text
100K tokens
```

但系统可能因为重复认知使用数倍 Token。

需要判断：

> 多 Agent 成本中，有多少是天然必要的 coordination cost，有多少是架构不合理产生的 duplicated cognition。

---

# 15. Token 分类

为了避免把所有额外 Token 都定义为浪费，将 Token 分成：

## Productive Tokens

直接产生：

- 设计
- 代码
- 测试
- 修复
- 有效判断

---

## Insurance Tokens

例如：

- Review
- Verification
- Independent check

这些虽然不直接生成 Feature，但可能降低错误和返工。

---

## Coordination Tax

例如：

- Agent handoff
- Task assignment
- Context packaging
- Status synchronization

---

## Wasted Tokens

例如：

- 多个 Agent 重复解决完全相同问题
- 已完成的 Plan 被再次完整 Plan
- 无效 speculative exploration
- 重复读取大量无关 Context

---

# 16. Orchestration Density

建议引入一个解释性指标：

```text
Orchestration Density
=
Useful Problem-Solving Tokens
/
Total Tokens
```

直观表达：

> 花出去的模型智力中，有多少真正用于解决业务问题，而不是管理“如何解决问题”。

例如后续可能形成：

```text
Native Codex
DIY
Superpowers
OMX
Full Nested Orchestration
```

的相对比较。

具体数值必须通过证据和实验获得，不能预设。

---

# 17. Effective Productivity

还需要一个综合概念：

```text
Effective Productivity
=
Useful Output
/
(Token Cost × Human Attention × Wall Time)
```

这不是严格数学指标，而是用于解释：

为什么一个方案可能：

- Token 贵
- 但 Human 很省
- Wall-clock 很快

从而整体仍值得采用。

反之：

- Token 很省
- 但 Human 要不断介入

也未必真正高效。

---

# 18. 有效冗余 vs 纯浪费

例如：

```text
+50% Token
→ 增加 Reviewer
→ 避免一次严重 Regression
```

这可能是有效保险成本。

而：

```text
5 个 Agents 同时探索
→ 4 个结果全部丢弃
```

则可能属于 speculative waste。

正式研究必须区分：

> redundancy that increases reliability

与：

> redundancy that only burns compute

---

# 19. 社区真实评价必须成为独立证据线

正式研究不能：

```text
读 README
→ 看源码
→ 自己推导
→ 下结论
```

因为最容易遗漏：

# Workflow Friction

设计理念可能很好，但实际使用：

- 太慢
- 太啰嗦
- 太重
- 太机械
- 太容易过度规划
- Token 消耗高
- 小任务反而效率下降

这些往往只有长期用户反馈能体现。

---

# 20. 证据来源

正式研究至少使用四类证据。

---

## 20.1 Primary Sources

包括：

- 官方 GitHub
- README
- Docs
- Skills
- Prompts
- Agent definitions
- Examples
- Issues
- Changelog
- Release notes

用于回答：

> 作者认为这个系统应该怎样工作？

---

## 20.2 Real User Experience

重点查看：

- GitHub Issues
- GitHub Discussions
- Reddit
- Hacker News
- X
- Blog
- YouTube
- 中文开发社区
- 长期使用者文章

---

## 20.3 Mechanistic Analysis

基于实际机制分析：

- 为什么会增加 Token
- 为什么会减少 Human work
- 为什么可以并行
- 为什么会重复 Context
- 为什么会出现 Blocking

---

## 20.4 Controlled / Structured Comparison

如果条件允许，设计同类任务比较：

- 相同 Repo
- 相同需求
- 相同 Codex 模型
- 不同 Orchestration 模式

比较：

- Token
- Time
- Number of agent calls
- Human intervention
- Code correctness
- Rework
- Tests

---

# 21. 社区评论证据等级

不能把所有评论同等对待。

## 强证据

例如：

> 某个具体任务启动多少 Agent、使用多少 Token / Cost、耗时多久，并给出具体过程。

---

## 中等证据

例如：

> 长期用户表示，小修改直接 Codex 更快，大任务 OMX 更有效。

属于经验性证据。

---

## 弱证据

例如：

> “神器”

> “垃圾”

只作为情绪和趋势参考，不作为主要论据。

---

# 22. 社区搜索重点

研究时不要泛搜“好不好用”。

围绕本研究问题定向寻找：

```text
Superpowers token usage
Superpowers too verbose
Superpowers overkill
Superpowers planning overhead
Superpowers codex workflow
Superpowers productivity
Superpowers TDD overhead
```

以及：

```text
oh-my-codex token usage
oh-my-codex too complex
oh-my-codex agent orchestration
oh-my-codex parallel agents
oh-my-codex productivity
oh-my-codex overhead
oh-my-codex review loop
```

以及：

```text
AGENTS.md vs agent framework
Codex native workflow
Codex multi-agent workflow
Codex subagent productivity
AI coding orchestration overhead
multi agent coding token cost
```

---

# 23. 研究中的关键假设

以下全部属于待验证假设，不可直接作为结论。

### Hypothesis A

Superpowers 更接近：

> Cognitive / Software Engineering Workflow Layer

---

### Hypothesis B

OMX 更接近：

> Agent / Task Orchestration Layer

---

### Hypothesis C

DIY Text Framework 可能以很低复杂度获得大部分流程收益。

---

### Hypothesis D

Superpowers + OMX 并不一定比单独使用更好。

收益取决于是否：

> 正确划分 Control Ownership。

---

### Hypothesis E

OMX + Selected Superpowers Skills

可能优于：

> OMX + Full Superpowers Workflow Everywhere

原因可能是减少 nested orchestration。

---

### Hypothesis F

复杂框架最主要的浪费未必来自 Multi-Agent 本身，而可能来自：

> Duplicate Context + Duplicated Reasoning。

---

# 24. 复杂度拐点

最终需要建立：

# Complexity Threshold / Knee Point

研究随着任务复杂度上升：

```text
Native Codex
   ↓
DIY Text Framework
   ↓
Superpowers
   ↓
Light Orchestration
   ↓
OMX
   ↓
OMX + Selected Superpowers
   ↓
Full Rigorous Multi-Agent Workflow
```

在哪些点增加下一层控制是值得的。

---

# 25. 典型任务类型

至少按以下任务规模分别研究。

## 小任务

例如：

- 修改一个函数
- 修一个明确 Bug
- 改一个配置
- 小 UI 调整

---

## 中等 Feature

例如：

- 单模块新功能
- 新 API
- 新页面
- 新数据流程

---

## 跨模块 Feature

例如：

- Frontend + Backend
- Runtime + Cloud
- Auth + API + UI

---

## 架构性任务

例如：

- 新子系统
- 大型重构
- 协议设计
- Migration

---

## 高并行项目

例如：

- 多模块同时实现
- 多 Worktree
- 多 Agent 独立开发
- 最后集成

分别比较不同编排等级的收益。

---

# 26. 最终不采用简单“排行榜”

最终不要输出：

```text
1. OMX
2. Superpowers
3. DIY
4. Native
```

因为这种排名缺乏实际意义。

最终应该形成一个多维空间：

```text
             Control / Reliability
                    ↑
                    │
                    │
Automation ─────────┼────────→
                    │

第三维：
Token / Human / Maintenance Cost
```

用来说明：

> 不同工具处于不同复杂度和控制力位置。

---

# 27. 最终希望得到的决策模型

最终研究应该能回答：

### 什么时候 Native Codex 足够？

### 什么时候简单 AGENTS.md 就足够？

### 什么时候值得引入 Superpowers？

### 什么时候真正需要 Multi-Agent Orchestration？

### 什么时候应该使用 OMX？

### Superpowers 与 OMX 应该怎样组合？

### 哪些 Superpowers Skill 适合作为 OMX Worker 的 Tactical Skill？

### 哪些能力重复，应关闭一层？

### 什么时候 Token 增长是合理保险？

### 什么时候已经属于 Over-Orchestration？

---

# 28. 与当前研发方法的映射

最终才将研究结果映射回当前实际工作方式。

现有方法：

# Human-led, Spec-driven, Parallel AI Development

核心研发哲学：

```text
Human owns architecture
AI executes bounded tasks
Parallel when tasks are independent
Verification closes the loop
```

同时保持：

# Architecture Philosophy

```text
YAGNI
+ Parallelism
+ Cheap Optionality
```

最终重点映射到三条当前候选路线：

```text
1. Native Codex Profile

2. OMX Loose
   = OMX 默认策略放松
   + 只保留高价值编排
   + 必要时使用精选 Skill

3. OMX Full
   = 更严格的 Agent Team /
     Task / Review / Verification
```

Superpowers 不是简单成为“第四条路线”，而需要研究：

> 它作为 Method / Skill Layer，可以怎样嵌入以上三条路线。

---

# 29. 正式研究执行顺序

## Phase 1：建立 Native Codex Baseline

回答：

> 没有 Superpowers / OMX 时，当前 Codex 原生已经可以完成什么？

包括：

- reasoning
- planning
- AGENTS.md
- skills
- subagents
- goals
- parallel capability
- context
- verification

这是所有增量价值分析的基础。

---

## Phase 2：研究 DIY Textual Framework

建立一个合理的高手基线：

```text
Codex
+ AGENTS.md
+ Project Rules
+ Prompt Templates
+ Usage Discipline
```

研究：

> 极简方式究竟可以达到什么水平？

---

## Phase 3：Superpowers 第一性原理

研究：

- 为什么存在
- 对软件开发过程如何建模
- Skill 的抽象
- Workflow 的抽象
- Human / Agent 控制关系
- 对开发纪律的影响
- Token / friction

---

## Phase 4：OMX 第一性原理

研究：

- Agent abstraction
- Task abstraction
- Team abstraction
- Orchestration
- Delegation
- Parallelism
- Verification
- Lifecycle
- Context flow

---

## Phase 5：建立统一 Capability Map

统一比较：

- Human
- Agent
- Task
- Skill
- Workflow
- Context
- State
- Parallelism
- Verification
- Retry
- Recovery
- Automation

---

## Phase 6：组合关系

重点研究：

```text
Superpowers → OMX

OMX → Superpowers

OMX + Full Superpowers

OMX + Selected Superpowers Skills
```

分析：

- 互补
- 重叠
- 冲突
- Nested orchestration
- Duplicated cognition

---

## Phase 7：真实社区评价

将用户实际反馈与理论逐条对应。

例如：

```text
理论：
Planning Layer 可能过重

↓

真实用户：
是否真的反馈小任务被过度规划？
```

又例如：

```text
理论：
并行 Agent 可以减少 Wall Time

↓

真实用户：
在哪类任务真正变快？
```

---

## Phase 8：Token / Efficiency Economics

建立：

- Token multiplier
- Human effort
- Wall time
- Reliability
- Rework
- Maintenance

六维模型。

---

## Phase 9：任务复杂度拐点

找出：

> 什么任务规模对应什么最小充分编排。

---

## Phase 10：形成面向实际研发的决策模型

最终映射到：

```text
Native Codex Profile

DIY / Textual Discipline

Superpowers as Method / Skills

OMX Loose

OMX Full

OMX + Selective Superpowers
```

---

# 30. 最终研究输出结构

正式研究完成后，建议形成如下文档：

```text
1. Executive Summary

2. 第一性原理：
   Agent Coding 为什么需要编排

3. Native Codex Baseline

4. DIY Textual Framework

5. Superpowers
   - Philosophy
   - Abstraction
   - Workflow
   - Strength
   - Cost

6. Oh My Codex
   - Philosophy
   - Agent / Task Model
   - Orchestration
   - Strength
   - Cost

7. Superpowers × OMX
   - Combination Models
   - Complementarity
   - Conflict
   - Duplicate Reasoning

8. Community Evidence

9. Token Economics

10. Efficiency Model

11. Task Complexity Thresholds

12. Minimum Sufficient Orchestration

13. 对当前 Native Codex / OMX Loose /
    OMX Full 研发方式的映射
```

---

# 31. 研究边界

本轮重点不是：

- 安装教程
- 命令大全
- 源码逐文件分析
- UI 对比
- 单纯 Feature Checklist
- 单纯框架 popularity

实现细节只有在以下情况下进入：

> 它能够解释某个抽象能力、效率差异、Token 成本或真实使用行为。

---

# 32. 最终核心问题

整个研究最终服务于一个问题：

> 在强模型时代，AI Coding Orchestration 的最小充分结构是什么？

具体来说：

> 什么时候文字约束已经足够？

> 什么时候需要 Skill？

> 什么时候需要真正的 Workflow？

> 什么时候值得引入 Multi-Agent Orchestration？

> Superpowers 与 Oh My Codex 分别位于这条复杂度曲线的什么位置？

> 二者如何组合，才能获得方法论与并行编排的收益，同时避免重复 Planning、重复 Context、重复 Review 和无效 Token 燃烧？

最终追求的不是：

```text
More Agents
+ More Skills
+ More Workflow
= Better
```

而是：

# Minimum Sufficient Orchestration

```text
Enough structure
+ Maximum useful autonomy
+ Selective parallelism
+ Explicit verification
- Duplicate cognition
- Coordination waste
- Unnecessary token burn
```

这将作为后续正式研究的最高层指导原则。
