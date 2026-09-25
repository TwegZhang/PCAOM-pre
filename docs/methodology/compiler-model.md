# Compiler Model

PCAOM Compiler 将项目输入、经验库和可用 Native harness 能力转换为一组可审查的项目政策。

## 编译步骤

1. **Profile**：识别语言、目录、模块边界、构建/测试/部署入口、架构事实和风险面。
2. **Select**：从经验条目中选择适用模式，标记有害或重复的模式。
3. **Specialize**：把通用经验改写为该项目的触发条件、约束和验证动作。
4. **Regularize**：逐项询问“Native Agent 能否可靠完成”；若能，删除额外控制。
5. **Emit**：生成常驻规则、条件技能、上下文路由、验证/升级政策及理由。
6. **Explain**：为每项控制保留来源、收益、成本和移除条件。

## 输出边界

V0 只生成可读 artifact：`AGENTS.md`、`.pcaom/manifest.yaml`、`rationale.md`、`context-map.md`、`escalation-policy.md` 和必要的条件技能。它不启动 Agent、不拥有 worker、不维护 daemon、不实现 workflow engine，也不替代 Native Codex/OMX runtime。

## Minimum Sufficient 判定

每一项控制必须回答：

| 字段 | 要求 |
|---|---|
| Reason | 项目中的具体问题或风险 |
| Expected benefit | 预期改善的质量、延迟或人类注意力指标 |
| Runtime cost | Token、步骤、等待或维护成本 |
| Trigger | 何时启用，默认是否关闭 |
| Removal condition | 什么证据出现后应删除或降级 |

没有理由或无法定义触发条件的控制默认不输出。
