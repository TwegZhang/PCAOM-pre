# PCAOM Experience Library V0

Experience Library 为 PCAOM Compiler 提供候选模式和反模式。它不是默认启用的最佳实践清单；Compiler 必须结合项目事实、风险、成本和已有 harness 能力选择、特化或删除条目。

## 条目 schema

每个条目必须包含：

| 字段 | 含义 |
|---|---|
| `ID` | 跨文件唯一、稳定的条目标识 |
| `Pattern` | 候选行为或需要抑制的反模式 |
| `Level` | 对应 escalation model 的 L0–L6 |
| `Residency` | `standing` 或 `conditional`；是否允许常驻 |
| `Target` | 适用的 harness、编译目标或通用范围 |
| `When Useful` | 项目证据满足什么条件时有价值 |
| `When Harmful` | 何时重复、过度或产生负收益 |
| `Cost` | Token、延迟、人类注意力、协调和维护成本 |
| `Evidence` | 当前证据等级及尚未验证的部分 |
| `Source` | 仓库内归一化文档或项目观察来源 |
| `Compiler Guidance` | Compiler 的 select、specialize、regularize、emit 动作 |
| `Removal Condition` | 什么证据出现后删除或降级控制 |

## 证据等级

- `documented-capability`：能力或接口已有文档记录；不代表它能为当前项目带来收益。
- `mechanism-inference`：根据机制推导的收益或风险；必须经 dogfood 才能升级为经验事实。
- `project-observation`：来自一个项目的可复查观察；不能自动推广到其他项目。
- `dogfood-validated`：在明确 baseline、任务和指标下重复观察到收益或失败。

同一条目可以同时引用多个等级，但必须明确哪些部分仍是推导。

## Compiler 使用规则

1. 先以当前编译目标的最简单原生路径为基线，再判断是否需要额外控制。
2. 条目只提供候选模式；Compiler 必须把它改写为项目触发器、动作和验证方式。
3. 无项目理由、无触发条件、无来源、成本不可解释或无法定义移除条件的控制不得输出。
4. 与目标 harness 已可靠覆盖的行为重复时，应删除额外控制。
5. 模型成本梯度和编排复杂度梯度分别决策，不互相隐含。
6. `standing` 只是允许常驻，不表示所有项目必须启用；`conditional` 默认关闭。
7. 任何并行条目都必须指定唯一 fan-out owner、任务独立性和聚合验证方式。
8. 当前 V0 条目默认不具有 `dogfood-validated` 证据；除非条目明确引用可复查报告。

## 文件边界

- `native-codex.md`：原生 harness、项目规则、subagent 和 durable goal。
- `superpowers.md`：任务级软件工程方法和微编排。
- `omx.md`：跨任务、跨 session 的宏编排与协同状态。
- `verification.md`：与具体 harness 无关的验证政策。
- `anti-patterns.md`：重复控制、成本放大和所有权冲突。

