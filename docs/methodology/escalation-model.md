# Escalation Model

PCAOM 将 Agent operating model 分为递增复杂度层级。默认从最低层开始，只有观察到证据才升级。

| 层级 | 能力 | 升级证据示例 |
|---|---|---|
| L0 | Native Agent | 所有普通任务默认入口 |
| L1 | Project Rules | 同类项目约束或完成定义反复遗漏 |
| L2 | Conditional Skill | 某类任务需要可复用、按需加载的程序化步骤 |
| L3 | Goal / durable state | 任务跨 session、容易丢失进度或需要检查点 |
| L4 | Subagent / parallel execution | 任务边界独立、上下文可隔离且并行收益大于协调成本 |
| L5 | Multi-Agent Runtime | 需要持久 worker 生命周期、队列、mailbox、恢复或 shutdown |
| L6 | Extra review / high assurance | 风险、合规或影响面要求独立复核 |

## 控制规则

- 升级必须记录触发证据和预期收益。
- 一个层级只能有一个 fan-out owner；不要让 OMX、Skill、worker 和 Native Agent 同时调度同一任务树。
- 不因“可能有用”预先启用高层级。
- 当证据消失、失败率不降或 Token/人类注意力成本超过收益时，应降级或删除。
- Human approval 只保留给架构、范围、破坏性操作、安全/外部副作用等高杠杆决策；普通执行歧义由拥有任务的 Agent 在边界内裁决。
