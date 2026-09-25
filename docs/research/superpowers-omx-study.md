# Native Codex, Superpowers and OMX Study

## 归一化结论

Native Codex 是强执行 harness：具备项目规则、条件技能、原生 subagents、custom agents、持久目标、worktree、工具执行和验证。DIY Text Framework（全局/项目 AGENTS.md 加少量文档和习惯）因此是必须比较的强 baseline；它通常能覆盖方法纪律和简单 workflow，难以替代 durable state、worker lifecycle、mailbox、恢复和自动监督。

Superpowers 更准确地说是“软件工程方法论 + 任务/会话级微编排”。其价值来自前置澄清、可执行流程、fresh context、独立验证、局部 review 和人类高杠杆决策；成本来自强制 ceremony、额外 reviewer、过细任务拆分和上下文注意力。

OMX 更准确地说是“workflow operating layer + 持久宏编排 runtime”。其价值集中在跨任务状态、leader/worker ownership、任务认领、mailbox、恢复、shutdown 和真正的 wall-clock 并行；成本是状态机、runtime、hook、worktree 和故障面。

## 组合结论

有价值的默认组合是：人类负责架构/验收，OMX（仅在需要时）负责宏目标、任务分发和持久状态，worker 使用精选的 TDD、systematic debugging、verification 等战术技能。高风险组合是每层都重新规划、重新拆分、重新 review 或继续 fan-out。

统一规则是 **one control point, one owner**，尤其是 **one fan-out owner**。

## 成本模型

并行主要降低 wall-clock，不会让 Token 取最大值：

```text
Total tokens ≈ planning + Σ workers + Σ reviews
               + coordination + retries + duplicated context
```

坏的拆分会在多 worker 上放大；继承过大的上下文、嵌套 scheduler 和递归 fan-out 会形成乘法成本。因此任何框架收益都必须相对于“强 Native Codex + 项目政策”基线，并同时观察质量、Token、延迟和人类干预。

## 证据边界

研究材料区分官方事实、社区反馈和机制推导。Token 倍率不是统一 benchmark；V0 不应把推导区间当作性能承诺，应通过 dogfood 和可重复记录验证。
