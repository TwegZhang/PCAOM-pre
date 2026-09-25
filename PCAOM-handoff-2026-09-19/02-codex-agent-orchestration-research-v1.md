# Codex Agent 编排研究 V1
## Native Codex、DIY Text Framework、Superpowers 与 Oh My Codex：第一性原理、组合关系、效率与 Token Economics

> 研究日期：2026-09-18  
> 当前快照：Superpowers v6.3.0；Oh My Codex (OMX) v0.21.5  
> 说明：本文区分“官方事实 / 社区经验 / 分析推导”。Token 倍率属于机制推导区间，不是统一 benchmark。

---

# 0. Executive Summary

这轮研究最重要的结论不是“Superpowers 和 OMX 谁更好”，而是：

1. **2026 年 9 月的 Native Codex 已经不是一个弱单 Agent baseline。**
   原生已有 AGENTS.md、渐进式 Skills、默认开启的 subagents、自定义 agent 配置、/goal 长任务、worktree 等能力。因此第三方框架的价值必须相对于“强 Native Codex + 熟练工程师”来衡量。

2. **Superpowers 不是单纯的 Skill/方法论库。**
   它的核心仍然是工程方法论，但当前版本已经具备 subagent-driven-development、task reviewer、final reviewer、parallel-agent、worktree 等“微观编排”能力。

3. **OMX 也不是单纯的 multi-agent runtime。**
   它既有 workflow / prompts / skills，又有 `.omx/` durable state、goal ledger、Team worker、mailbox、tmux/runtime、hooks 等“宏观编排”能力。

4. 因此更准确的抽象是：

```text
Native Codex
= execution harness + native agent primitives

DIY Text Framework
= local policy / project operating contract

Superpowers
= software-engineering methodology
  + task/session-level micro-orchestration

OMX
= workflow operating layer
  + durable macro-orchestration/runtime
```

5. **Superpowers × OMX 的关键不是“能不能一起用”，而是谁拥有控制权。**
   最危险的结构是“双 scheduler / nested orchestration”：

```text
OMX 拆任务和 spawn
  ↓
Superpowers worker 再拆任务和 spawn
  ↓
Codex Ultra 又自主 spawn
```

它会造成 duplicated planning、duplicated context、duplicated review 和 fan-out amplification。

6. 当前最有价值的组合假设是：

```text
Human
  ↓
Architecture / acceptance

OMX（可选）
  ↓
macro goal / task / fan-out / durable state

Codex worker
  ↓
selected Superpowers tactical skills
  - TDD
  - systematic-debugging
  - verification-before-completion
  - code-review discipline
```

也就是：

> **OMX owns orchestration; Superpowers supplies local engineering discipline.**

而不是：

> OMX Team worker 内再运行完整 Superpowers SDD orchestration。

7. 对熟练 AI Coding 工程师而言，**DIY Text Framework 是非常强的 baseline**。  
   对“方法与执行纪律”这一层，AGENTS.md + 少量项目文档 + Codex 原生 Skills/Subagents/Goal，能够覆盖大量第三方框架价值。真正难以由纯文字替代的是：
   - durable task state
   - recovery
   - mailbox / worker lifecycle
   - automated team supervision
   - deterministic runtime coordination

8. **Token 的第一性原理：并行缩短 wall-clock，但 Token 是求和，不是取 max。**

```text
Wall Time ≈ max(worker_i time) + coordination

Total Tokens ≈
  planning
+ Σ(worker_i)
+ Σ(review_i)
+ coordination
+ retries
+ duplicated context/reasoning
```

因此“快 3 倍”完全可能同时意味着“Token 3～5 倍”。

9. 两个项目自己都在主动解决 over-orchestration。
   - Superpowers v6.x 在减少 bootstrap、batch 小任务、限制 nested subagents、减少 review 重复。
   - OMX v0.21 删除了 25 个技能，并明确移除 hard workflow gates；其官方简化 epic 直接指出旧体系存在 ceremony-heavy、duplicated prompts、overlapping skills 等问题。

这说明：

> **Minimum Sufficient Orchestration 不是保守主义，而是当前 agent framework 自身正在收敛的方向。**

---

# 1. 研究基线已经发生根本变化：Native Codex 很强

当前 Codex 原生具备：

- AGENTS.md 分层项目指令；
- 原生 Skills，且采用 progressive disclosure；
- 默认开启的 subagent workflow；
- custom agent 配置；
- 并行 subagents；
- `/goal` 持久目标与检查点；
- worktree 隔离与并行工作；
- 原生 verification / shell / tools。

OpenAI 官方甚至明确提醒：

> 每个 subagent 独立使用模型和工具，因此 subagent workflow 比类似的 single-agent run 使用更多 Token。

这意味着：

```text
2025 baseline:
Human → one coding agent

2026 baseline:
Human
 ↓
Codex
 ├─ AGENTS.md
 ├─ Skills
 ├─ /goal
 ├─ native subagents
 ├─ custom agents
 └─ worktrees
```

第三方框架的“护城河”因此从：

> 能不能实现这些能力

变成：

> 能不能比 Native Codex 更稳定、更自动、更低 Human effort 地组合这些能力。

---

# 2. DIY Text Framework：真正应该使用的高手基线

一个熟练工程师可以构造：

```text
~/.codex/AGENTS.md
  ├─ 通用 coding rules
  ├─ planning rules
  ├─ context discipline
  └─ token discipline

repo/AGENTS.md
  ├─ architecture
  ├─ build/test
  ├─ verification
  ├─ completion definition
  └─ parallelization rules

docs/
  ├─ architecture.md
  ├─ PLAN.md
  └─ task conventions

Codex native
  ├─ /goal
  ├─ skills
  ├─ subagents
  └─ worktrees
```

OpenAI 官方最佳实践本身也建议：

- AGENTS.md 要简短准确；
- 放 repo layout、build/test/lint、工程规范、完成定义；
- 只有当同类错误反复出现后再添加规则；
- 如果 AGENTS.md 过大，应拆到特定 Markdown 或 Skill 中。

## 2.1 纯文字能够覆盖的能力

非常适合表达：

- 先理解再编码
- architecture-first
- plan before implementation
- YAGNI
- task decomposition
- independent task parallelization
- TDD
- debug loop
- verification checklist
- review rules
- finish criteria
- commit/worktree conventions

这意味着 Superpowers 的大量“知识内容”从表达能力上并不是不可复制的。

## 2.2 文字不容易替代的东西

真正产生差距的是：

### Conditional activation

普通 AGENTS.md 是 always-on instruction。

Skill 可以：

```text
metadata
 ↓
match
 ↓
只在需要时加载完整 workflow
```

减少常驻上下文，并改善 attention。

### Automation

文字说：

> “任务独立时并行。”

和系统真正：

```text
spawn worker
assign context
track worker
collect result
retry
recover
```

不是一个层级的能力。

### Runtime state

纯 Markdown 很难可靠提供：

- durable task status
- worker health
- mailbox
- crash recovery
- lifecycle guarantees

---

# 3. DIY 能达到什么程度

以下不是 benchmark，而是基于当前 Codex primitive 的能力覆盖推导。

## 方法论/开发纪律

```text
约 80～95%
```

原因：

大多数规则本质上是可写成文本的决策规则。

## 简单 Workflow

```text
约 70～90%
```

利用：

- AGENTS.md
- PLAN.md
- /goal
- 少量自定义 Skill

可以实现相当完整的：

```text
spec → plan → execute → verify
```

## 简单 Multi-Agent

```text
约 60～85%
```

Native Codex 已经可以：

- spawn subagent
- custom role
- parallel work
- aggregate results

但 Human / parent Agent 仍需要承担更多 orchestration judgment。

## Durable Team Runtime

```text
约 20～40%
```

这是 DIY 文字方案真正的短板。

例如 OMX 的：

- worker lifecycle
- shared durable task queue
- mailbox
- resume/shutdown
- team state
- leader/worker ownership

不是写几段 Prompt 就等价实现的。

## 对单人 AI Coding 实际价值

对于熟练工程师、单 repo、1～3 个主要并行任务：

> **DIY 很可能已经覆盖大部分高频收益。**

框架的主要增量价值会集中到：

- enforcement
- automation
- persistent state
- long-running execution
- multi-worker lifecycle

而不是“聪明的 Prompt 本身”。

---

# 4. Superpowers 的第一性原理

官方定义：

> complete software development methodology for coding agents

这个定位非常准确。

它真正解决的问题不是：

> Agent 不会写代码。

而是：

> Agent 太容易在没有充分理解、没有验证、上下文逐渐污染的情况下快速写代码。

因此 Superpowers 的第一性原理可以总结成：

# 4.1 Front-load uncertainty

先消除需求与设计不确定性，再产生代码。

```text
Idea
 ↓
Brainstorm
 ↓
Design / Spec
 ↓
Plan
 ↓
Implementation
```

---

# 4.2 Make process executable

不是建议：

> “最好 TDD。”

而是将行为写成 Skill：

```text
RED
 ↓
verify failure
 ↓
GREEN
 ↓
verify pass
 ↓
refactor
```

方法论从：

```text
advice
```

变成：

```text
agent-executable procedure
```

---

# 4.3 Fresh context beats accumulated context

当前 SDD 明确要求：

> fresh implementer subagent per task

并且 reviewer 不继承主 session history，而获得精心构造的：

- task brief
- report
- diff package
- global constraints

核心思想：

> **Context isolation 比让一个越来越长的 Agent session 持有全部信息更可靠。**

---

# 4.4 Verification is an independent control loop

Superpowers 的 verification-before-completion 核心规则是：

```text
No completion claim
without fresh evidence
```

所以：

```text
Agent says done
≠
done
```

而是：

```text
implementation
 ↓
tests / evidence
 ↓
review
 ↓
completion
```

---

# 4.5 Review early, not only at the end

当前 SDD：

```text
Task
 ↓
Implementer
 ↓
Task reviewer
 ↓
Fix/re-review if needed
 ↓
next task

...

Whole branch reviewer
```

目的：

> 让错误在局部被捕获，而不是最后积累成系统级返工。

---

# 4.6 Human gate 与 Agent autonomy 分离

设计阶段强调 Human approval。

执行计划一旦批准：

> 不应该每一个 task 都回来问 Human “要继续吗？”

当前 SDD 甚至明确规定：

- 普通 ambiguity → controller 自行 ruling
- destructive/security/external side effects → 才暂停问 Human

因此其控制逻辑是：

```text
Human owns high-leverage decisions

Agent owns bounded execution decisions
```

---

# 5. Superpowers 实际上已经是“微编排器”

这是本研究第一处需要修正原假设的地方。

Superpowers 当前包括：

- brainstorming
- writing-plans
- subagent-driven-development
- executing-plans
- dispatching-parallel-agents
- requesting-code-review
- systematic-debugging
- TDD
- worktree
- verification
- finishing branch

当前 SDD 的执行模型大致是：

```text
Controller
 ↓
Task N brief
 ↓
Fresh Implementer
 ↓
Self review + tests
 ↓
Task Reviewer
 ↓
Fix / scoped re-review
 ↓
Ledger
 ↓
Task N+1

...
 ↓
Final whole-branch reviewer
```

所以它并非只有 cognition guidance。

更准确定位：

> **Methodology-driven micro-orchestrator**

它主要管理：

```text
one plan
one session/worktree
task-level workers
task-level review
```

---

# 6. Superpowers 的效率收益

## 6.1 减少错误方向上的昂贵实现

Brainstorm / design approval 在复杂 Feature 上可以显著减少：

```text
先写很多代码
→ 才发现需求理解错
→ 大面积返工
```

这类收益可能远大于 planning 自身消耗。

---

## 6.2 Context isolation

每 task fresh worker：

- 减少长 session attention dilution
- 降低前序任务残留推理污染
- reviewer 可以只看 task-specific context

---

## 6.3 Review compounding prevention

每 task review 的意义不是“代码一定更漂亮”，而是：

> 阻止 Task 1 的错误成为 Task 2～10 的假设基础。

---

## 6.4 Human attention 降低

设计批准后连续执行。

这对：

- 中型 feature
- 清晰 implementation plan

尤其有价值。

---

# 7. Superpowers 的成本和浪费

## 7.1 Mandatory process tax

`using-superpowers` 仍然具有强制 skill-selection 思想。

即使 v6.3 已经根据任务分成 spike / bounded / architectural 三种 ceremony，实施前 Human approval gate 仍存在。

因此非常小的任务可能出现：

```text
Task 本体：2 分钟
Workflow：3 分钟
```

社区确实存在“重复询问、已有项目还重新问技术栈、明显增加小任务时间”的反馈。

---

## 7.2 Review tax

当前正常 SDD 对每 task 至少意味着：

```text
1 implementer
+
1 reviewer
```

最后还有：

```text
1 broad reviewer
```

发生问题后还可能：

```text
fix agent
+
scoped re-review
```

所以其成本并不是 skill markdown 本身，而是：

> **workflow 触发的额外 model work。**

---

## 7.3 Micro-task fragmentation

如果计划拆得太细：

```text
20 tiny tasks
```

就可能造成：

```text
20 implementers
+
20 reviewers
+
coordination
```

任务本身非常小，handoff 却固定存在。

Superpowers v6.3 已经加入 same-shape small task batching 来降低这一问题。

---

## 7.4 Attention tax

过多 always-on / 强制规则可能让模型：

- 把注意力放在流程合规上
- 而不是问题本身

Superpowers v6.1 专门压缩 per-session bootstrap，并在 Codex 中移除了 SessionStart hook，因为 Codex 已能原生触发 skills，额外 bootstrap 反而让 UX 更差。

这是非常强的官方证据：

> 框架自己的 prompt 也存在 diminishing returns。

---

# 8. Oh My Codex 的第一性原理

OMX 官方明确说：

> Codex does the actual agent work；OMX 是其外层 workflow/runtime。

它解决的问题比 Superpowers 更偏：

> 一个复杂任务如何跨多个 agent、多个阶段、多个 session 保持一致的执行状态。

---

# 8.1 Durable orchestration

核心不只是 Prompt，而是：

```text
.omx/
 ├─ plans
 ├─ specs
 ├─ logs
 ├─ state
 ├─ memory
 └─ ultragoal ledger
```

即：

> 让编排状态从模型“脑子里”搬到可持久化 artifact。

这是 OMX 与纯文字框架最本质的差异之一。

---

# 8.2 Macro workflow

当前官方推荐主线：

```text
deep-interview
 ↓
ralplan
 ↓
ultragoal
 ↓
team（仅需要并行时）
```

抽象含义是：

```text
clarify
 ↓
architecture / consensus
 ↓
durable goal execution
 ↓
optional parallelization
```

---

# 8.3 Leader / Worker ownership

Team 的核心不是“多开几个 Codex”。

它引入：

```text
Leader
 ↓
shared durable task queue
 ↓
Worker A
Worker B
Worker C
 ↓
status / evidence / mailbox
 ↓
Leader
```

并明确：

> worker 提供 task status 与 verification evidence；leader 才拥有 Ultragoal 状态。

这是一个真正的 orchestration ownership model。

---

# 8.4 Parallelism as runtime

Superpowers 的 parallelism 更接近：

```text
Agent chooses independent problems
→ spawn subagents
→ aggregate
```

OMX Team 更接近：

```text
runtime owns worker identity
task claims
mailbox
status
resume
shutdown
worktree
```

所以二者不是同一个层级。

---

# 9. OMX 的效率收益

## 9.1 真正降低 Human orchestration

当任务存在：

```text
backend
frontend
tests
docs
migration
```

多个相对独立 lane 时，Human 不需要手动：

```text
开 tmux
创建 worktree
复制 prompt
追踪状态
收集结果
```

这是 OMX 最大价值之一。

---

## 9.2 Durable state

长任务真正难点往往不是模型推理，而是：

```text
“刚才做到哪了？”
```

OMX 将状态外置，可以降低：

- compaction loss
- session interruption
- worker restart
- handoff loss

---

## 9.3 Wall-clock parallelism

如果有 4 个真正独立的任务：

```text
sequential:
T1 + T2 + T3 + T4

parallel:
max(T1,T2,T3,T4) + coordination
```

墙钟时间可以明显下降。

---

# 10. OMX 的成本

## 10.1 Coordination Runtime Tax

相比 Superpowers，OMX 有更多：

- state machine
- worker lifecycle
- hooks
- task status
- mailbox
- leader nudges
- tmux/session ownership
- worktrees
- recovery
- HUD

这些能力是真实价值，同时也是真实复杂度。

---

## 10.2 Bad decomposition amplification

如果 leader 拆错：

```text
1 个坏判断
```

在单 Agent 中只浪费一条执行链。

在 5 worker Team 中可能变成：

```text
5 条同时错误执行链
```

所以：

> Parallelism amplifies good decomposition and bad decomposition equally.

---

## 10.3 State/runtime failure surface

OMX Issues 中存在真实案例：

- worker startup / worktree environment
- session ownership
- Stop hook
- duplicate HUD
- Team progress inference

说明编排器本身已经成为一个新的软件系统。

---

# 11. OMX 自己已经承认“过度编排”问题

这是很重要的证据。

2026-08 的官方 simplification epic 明确提出：

> 将 hard-gated、ceremony-heavy workflow stack 改成 lightweight workflow。

并点名：

- duplicated prompts
- overlapping skills
- multiple hook authorities
- unverifiable consensus receipts

随后 v0.21：

- 删除 25 个 deprecated/redundant skills
- 移除 hard workflow gates
- consolidates canonical surfaces
- 保留 autopilot staged workflow，但 individual stages 仍可独立调用

因此：

> 早期 OMX 的“严谨重型感”并不是错觉，项目自身也认为已经超过最优复杂度，并进行了大规模收敛。

---

# 12. 最值得注意的 OMX Token 事故

2026-07 的 issue #3149 提供了一个非常极端但极有价值的案例：

- native child agents 继承约 230K parent context；
- 反复 retransmit cached context；
- 一个 `$ralplan` lineage fork 出 118 children；
- 报告者三天统计约 62B cumulative tokens；
- 约 98% spend 来自 cached context retransmission；
- native children 平均 request/session 是 bounded team worker 的约 24 倍。

这不是正常倍率，也不能当作当前版本一般表现。

它的研究价值在于证明：

```text
Fan-out
× inherited full context
× long autonomous loop
```

是 Token 成本的乘法关系，而不是加法关系。

这与我们的：

# Duplicated Cognition

假设完全吻合。

---

# 13. Dual Scheduler：组合系统最大的风险

OMX 自己的 issue #3142 明确提出：

当 Codex Max/Ultra 自己会 proactive delegation，同时 OMX 也进行 delegation 时，会出现：

> dual-scheduler situation

可能重复：

- exploration
- review
- execution lanes

这与 Superpowers 组合后更严重。

最坏结构：

```text
OMX Team leader
 ↓
Worker
 ↓
Superpowers SDD
 ↓
Implementer subagent
 ↓
Reviewer subagent
 ↓
Codex Ultra 再自主 fan-out
```

这会形成：

# Recursive Fan-out

因此组合系统最重要的原则应是：

# One Fan-out Owner

在一个层级上只能有一个 scheduler。

---

# 14. Superpowers × OMX：四种组合

## 14.1 Superpowers design → OMX execution

```text
Superpowers
brainstorm/spec/plan
 ↓
OMX
ultragoal/team
 ↓
Codex workers
```

优点：

- Superpowers 负责需求/设计质量
- OMX 负责 durable execution

问题：

- OMX ralplan 本身也做 planning
- 容易 duplicated planning

适合：

> 选择 Superpowers planning 后，跳过 OMX 同义 planning stage。

---

## 14.2 OMX plan → workers use full Superpowers SDD

```text
OMX planner
 ↓
Team workers
 ↓
Superpowers SDD
 ↓
worker subagents
```

这是高风险结构。

原因：

- nested task decomposition
- nested subagent scheduling
- duplicate review
- duplicate context

原则上不推荐作为默认。

---

## 14.3 OMX + selected Superpowers tactical skills

```text
OMX
 ↓
macro task/fan-out
 ↓
Worker
 ├─ TDD
 ├─ systematic-debugging
 └─ verification-before-completion
```

这是目前最有希望的组合。

优势：

- OMX 只有一个 scheduler
- Worker 获得高质量工程纪律
- 不再二次拆 task / spawn agents

---

## 14.4 DIY + selective OMX / Superpowers

```text
AGENTS.md
 ↓
Native Codex

need debugging?
→ systematic-debugging

need long durable execution?
→ /goal

need real multi-worker coordination?
→ OMX Team
```

这是：

# Escalation-Based Orchestration

也是目前最符合 Minimum Sufficient Orchestration 的模式。

---

# 15. Control Ownership Rule

组合时建议强制定义：

| Control | Owner |
|---|---|
| Product intent | Human |
| Architecture | Human + primary Agent |
| One feature plan | exactly one planner |
| Macro task graph | OMX 或 Human，二选一 |
| Fan-out | exactly one scheduler |
| Local implementation | Worker |
| TDD/debug methodology | Superpowers Skill |
| Task review | exactly one review owner |
| Final acceptance | Human / top-level verifier |
| Durable task state | OMX 或 Codex /goal |

关键不是工具，而是：

> **每个 control point 只能有一个权威 owner。**

---

# 16. Token Economics

设原生熟练工程师完成同一任务需要：

```text
E0 = useful execution tokens
```

则：

```text
Ttotal =
  E
+ P
+ C
+ R
+ V
+ H
+ X
+ D
```

其中：

- E = execution
- P = planning
- C = coordination
- R = review
- V = verification
- H = handoff/context packaging
- X = speculative work
- D = duplicated reasoning/context

---

# 17. Parallelism 的核心数学

## Wall time

```text
Twall ≈ max(Tworker_i) + Tcoordination
```

## Token

```text
Ttoken ≈ Σ Tworker_i + Tcoordination
```

因此：

> 并行天然优化 latency，而不是 compute。

它只有在以下情况下提高 Token efficiency：

```text
并行带来的更少返工
>
额外 worker + coordination 消耗
```

---

# 18. 机制推导的 Token 倍率区间

以下全部是：

> **相对于“熟练工程师 + 当前 Native Codex/DIY，任务正确完成一次”的机制估算。**

不是官方 benchmark。

| 模式 | 机制推导 Token 倍率 | 主要原因 |
|---|---:|---|
| Native Codex | 1.0× | baseline |
| DIY Text Framework | 0.9～1.2× | 少量固定 instruction；好的规则可能减少 retry |
| Selective Superpowers | 1.05～1.4× | 只加载 debug/TDD/verify 等局部 skill |
| Full Superpowers feature workflow | 1.5～2.8× | brainstorm/plan + per-task implementer/reviewer + final review |
| Superpowers 高返工/review loop | 2.5～5× | fix + re-review rounds |
| OMX single-owner / durable goal | 1.2～2.0× | state/checkpoint/planning/verification |
| OMX Team 2～4 scoped lanes | 1.8～4× | worker sum + leader coordination |
| OMX + selective Superpowers | 2～4.5× | macro coordination + local methodology |
| OMX + full nested Superpowers SDD | 3～8× | duplicate plan/review/fan-out |
| Dual-scheduler pathological case | >10×，无稳定上界 | context × fanout × long loops |

## 注意

这些倍率更适合描述：

```text
model work
```

而不是最终美元账单。

原因：

- cached input 与 fresh input 定价不同；
- ChatGPT subscription quota 可能采用不同折算；
- 不同模型价格不同；
- isolation 可能减少每个 worker 的上下文，使总 token 低于简单“agent 数量 × baseline”。

---

# 19. Superpowers 官方性能数据应该怎样理解

Superpowers v6.0 发布说明称：

> 在其 eval 中，重写后的 SDD 可以以近似质量达到约 2× speed，并减少接近 50% tokens。

但这个数据是：

> **新 Superpowers SDD vs 旧 Superpowers SDD**

而不是：

> Superpowers vs Native Codex。

因此不能用它证明 Superpowers 比裸 Codex 省 50%。

它真正证明的是：

> 编排架构本身的设计细节，可以造成接近 2× 的速度和巨大 Token 差异。

这恰好支持本研究的问题意识。

---

# 20. 社区评价：Superpowers

社区意见明显两极。

## 正向

常见认可点：

- brainstorm 比直接 Plan 更容易对齐方向；
- Spec-driven workflow 更可靠；
- TDD / review 对复杂 feature 有价值；
- task decomposition 改善大型工作的可控性。

## 负向

反复出现：

- 已有成熟项目仍问冗余问题；
- 小任务 ceremony 太大；
- 新模型已经能自己长时间 plan/execute，部分 framework 价值下降；
- 最有价值的是“学会这些 prompting pattern”，然后做项目定制版；
- 有用户直接把 phase gating/TDD/diagnosis 规则写进 CLAUDE.md，以避免 invocation overhead。

这与 DIY baseline 高价值的假设高度一致。

---

# 21. 社区评价：OMX

公开社区样本比 Superpowers 少，但已经有比较一致的两个方向。

## 正向

- ralplan / complex feature 对复杂任务有效；
- long-running autonomous execution 有价值；
- multi-agent/team 对大型任务有明显吸引力。

## 负向

中国社区讨论中直接出现：

- “效率和代码质量反而变差”
- “Plus 额度根本不够用”
- “太重的 prompt 会让注意力变差”
- “很多通用 workflow 非常冗余”
- “最好的 workflow 是在使用过程中慢慢完善自己的”

更重要的是：

> OMX 官方自己的 0.21 simplification 与这些用户直觉方向一致。

---

# 22. 五种模式的第一轮总表

| 模式 | 核心抽象 | Human Effort | 自动化 | Durable State | Parallelism | Token Risk |
|---|---|---:|---:|---:|---:|---:|
| Native | Agent harness | 高～中 | 中 | 中 | 中 | 最低 |
| DIY | Policy contract | 中 | 中 | 中 | 中 | 低 |
| Superpowers | Methodology + micro orchestration | 中低 | 中高 | 低～中 | 中 | 中 |
| OMX | Workflow OS + macro runtime | 低 | 高 | 高 | 高 | 高 |
| OMX + selective SP | Hierarchical orchestration | 低 | 高 | 高 | 高 | 中高 |
| Full nested | Recursive orchestration | 低 | 很高 | 高 | 很高 | 极高 |

---

# 23. Complexity Knee Point

第一轮研究得到的暂定曲线：

## 小 Bug / 明确修改

```text
Native / DIY
```

最合理。

完整 workflow 的固定成本很难摊薄。

---

## 中等单模块 Feature

```text
DIY
+
selected Superpowers
```

或者：

```text
Superpowers bounded workflow
```

价值开始明显。

---

## 大型 Feature，但强耦合

不要盲目 Team。

更适合：

```text
good plan
+
one strong agent / goal
+
selective reviewer
```

因为依赖关系会抵消并行收益。

---

## 多模块且真正独立

```text
OMX Team
```

开始出现明确价值。

条件：

```text
parallelizable task graph
```

必须已经足够可靠。

---

## 长时间、多阶段、需要恢复

这是 OMX 最有差异化价值的区域：

```text
durable state
+
goal ledger
+
team lifecycle
```

---

# 24. 一个新的核心指标：Orchestration Amplification Factor

可以定义：

```text
OAF =
Total Agent Work
/
Minimum Useful Work
```

OAF 高不一定坏。

例如：

```text
1.8×
```

但错误率从 20% 降到 2%，可能很值。

真正危险的是：

```text
OAF 上升
+
质量没有相应提升
```

这就是 Over-Orchestration。

---

# 25. Minimum Sufficient Orchestration

当前研究最支持的默认策略不是某个产品，而是：

# Escalate only when needed

```text
Level 0
Native Codex

 ↓ repeated workflow problem

Level 1
AGENTS.md / DIY rules

 ↓ reusable conditional process needed

Level 2
Selected Skills

 ↓ long-running persistence needed

Level 3
/goal / durable state

 ↓ genuinely independent parallel lanes

Level 4
Multi-Agent / OMX Team

 ↓ only if risk justifies it

Level 5
specialist reviewers / additional control loops
```

不要从 Level 5 开始。

---

# 26. 对当前 Native / OMX Loose / OMX Full 三路线的映射

## Native Codex Profile

应当强化，而不是把它视为“低配方案”。

当前 Native 已经非常接近：

```text
strong agent
+ subagents
+ goal
+ skills
+ worktree
```

所以一个好的 Native Profile 可能成为大量日常工作的默认。

---

## OMX Loose

这轮研究后，OMX Loose 的定义可以更加明确：

```text
OMX durable state / Team
+
only when task requires it

NO duplicated planner
NO nested fan-out
NO blanket skill loading
NO automatic heavy review everywhere
```

它不是：

> 把 OMX prompt 写得“口气松一点”。

而是：

# Reduce number of control layers

---

## OMX Full

只适合：

- 高风险
- 大型
- 多模块
- 长时间
- 有独立并行 lane
- verification 成本远低于 failure 成本

不应该成为普通 Feature 的默认路径。

---

# 27. 推荐的组合哲学

如果将这轮研究压成一句：

> **Human owns architecture；one scheduler owns fan-out；workers own bounded execution；skills provide local discipline；verification must have evidence；durable runtime only在任务规模需要时升级。**

对应结构：

```text
Human
  │
  │ architecture / scope / acceptance
  ▼
Primary Codex
  │
  ├─ DIY project policy
  │
  ├─ selected skills
  │
  └─ decide escalation
          │
          ├─ /goal
          │
          └─ OMX Team
                │
                ├─ Worker A
                │    └─ tactical skills
                ├─ Worker B
                │    └─ tactical skills
                └─ Worker C
                     └─ tactical skills
```

明确禁止默认出现：

```text
worker
→ full planner
→ its own task graph
→ its own agent team
```

除非这是有意设计的递归层级。

---

# 28. 下一阶段应该做什么

这一轮属于：

> architecture / evidence synthesis

还不是最终 benchmark。

下一阶段最值得做的是一个小型 controlled experiment。

选择同一个真实 repo，设计 3 类任务：

```text
A. 小 Bug
B. 中型单模块 Feature
C. 跨模块可并行 Feature
```

分别跑：

```text
1 Native
2 DIY
3 Superpowers
4 OMX Loose
5 OMX Team
6 OMX + selected Superpowers
```

记录：

- total input tokens
- cached input
- output tokens
- reasoning tokens
- model requests
- spawned agents
- wall time
- human interventions
- test failures
- review findings
- rework commits

这样就可以把当前的“机制倍率区间”升级成：

> **针对我们实际开发方式的经验倍率。**

---

# 29. 当前阶段最重要的三个判断

## 判断一

**Superpowers 与 OMX 不是同类，但重叠比最初假设大。**

Superpowers：

> methodology + micro orchestration

OMX：

> workflow + macro durable orchestration

---

## 判断二

**DIY baseline 比预想更强。**

因为当前 Codex 已经原生拥有：

```text
AGENTS
Skills
Subagents
Custom agents
Goal
Worktrees
```

所以“自己写几十到几百行规则”已经不是玩具方案。

---

## 判断三

真正的问题已经不是：

> “要不要使用 Agent framework？”

而是：

> **什么控制必须程序化，什么控制只需要写成文字；什么状态必须持久化；什么任务真的值得 fan-out。**

这也是 Minimum Sufficient Orchestration 的本质。

---

# Sources / Evidence Notes

Primary sources:

- OpenAI Codex AGENTS.md docs  
  https://developers.openai.com/docs/agent-configuration/agents-md
- OpenAI Codex Subagents docs  
  https://developers.openai.com/docs/agent-configuration/subagents
- OpenAI Codex Skills docs  
  https://developers.openai.com/docs/build-skills
- OpenAI Codex Goal use case  
  https://developers.openai.com/use-cases/follow-goals
- OpenAI Codex Worktrees docs  
  https://developers.openai.com/docs/environments/git-worktrees
- obra/superpowers  
  https://github.com/obra/superpowers
- Superpowers v6.3.0 releases  
  https://github.com/obra/superpowers/releases
- Superpowers subagent-driven-development  
  https://github.com/obra/superpowers/blob/main/skills/subagent-driven-development/SKILL.md
- Yeachan-Heo/oh-my-codex  
  https://github.com/Yeachan-Heo/oh-my-codex
- OMX releases  
  https://github.com/Yeachan-Heo/oh-my-codex/releases
- OMX simplification epic #3491  
  https://github.com/Yeachan-Heo/oh-my-codex/issues/3491
- OMX runaway token issue #3149  
  https://github.com/Yeachan-Heo/oh-my-codex/issues/3149
- OMX delegation authority / dual scheduler issue #3142  
  https://github.com/Yeachan-Heo/oh-my-codex/issues/3142

Community evidence sampled:

- Reddit discussions around Superpowers relevance, workflow friction, custom DIY workflows
- GitHub issues from both projects
- Linux.do OMX user-experience discussion

Community reports are treated as anecdotal evidence, not benchmark results.
