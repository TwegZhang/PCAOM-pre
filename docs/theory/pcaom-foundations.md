# PCAOM Foundations

PCAOM（Project-Compiled Agent Operating Model）是一种把项目事实和方法经验编译成项目专属 Agent operating model 的方法。它的对象不是新的 Agent runtime，而是运行在既有 Native Codex 能力之上的最小充分控制面。

## 问题

Native Codex 已经提供 AGENTS.md、渐进式 Skills、subagents、custom agents、持久目标、worktree、shell/tools 与 verification。Superpowers 增强软件工程方法和任务级微编排；OMX 增强跨任务、跨 session 的持久编排、worker 生命周期和协同状态。把这些层永久叠加会造成重复规划、重复上下文、重复 review、双重 scheduler、递归 fan-out、Token 放大和人类注意力成本。

因此 PCAOM 的基线不是“裸单 Agent”，而是熟练工程师使用 Native Codex 加项目级规则后的强基线。

## 核心命题

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

核心目标是 Compile the Minimum Sufficient Harness for This Project：只保留能改善架构遵循、正确性、验证可靠性或风险控制的规则；Native Agent 已能稳定完成的事情不再增加控制层。

## 形式化模型

```text
M = Compile(S, A, C, P, K, H, R)
```

其中 `S` 是需求/规格，`A` 是架构，`C` 是代码库事实，`P` 是项目或组织政策，`K` 是方法论与经验，`H` 是可用 harness 能力，`R` 是风险与成本画像。输出 `M` 包含常驻规则、条件技能、上下文路由、任务政策、验证政策、并行政策、人类升级政策和编排升级政策。

概念目标是最小化：

```text
α·tokens + β·latency + γ·human_attention + δ·maintenance_complexity
```

同时满足架构合规、正确性/验证可靠性和允许风险阈值。

## 稳定原则

1. 人类拥有高杠杆架构、范围和验收决策。
2. 先有 spec，再编译 policy。
3. 编译项目特定行为，不复制通用最佳实践大全。
4. Native capability 是默认层。
5. 每个额外控制都有持续运行成本。
6. 一个控制点只有一个 owner。
7. 一个任务层级只有一个 fan-out owner。
8. 复杂度只能由证据触发升级。
9. 完成声明必须有新鲜验证证据。
10. 低频编译，高频执行；从失败与摩擦重新编译。

## 生命周期

```text
Spec / Architecture → Compile v1 → Run → Observe
       → failures / friction / waste → update policy → Compile v2
```

PCAOM 的第一版理论必须通过真实 dogfood 修正，而不是无限增加概念。
