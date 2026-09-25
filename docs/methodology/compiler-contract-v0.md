# PCAOM Compiler Contract V0

**状态：** proposed；本契约只定义文档型、可解释的 reference compiler，不定义 runtime。第一个具体目标是 Larry DSH Profile。

## 目标

给定项目级需求、架构、代码库事实、组织政策、经验库、可用 harness 和风险/成本画像，生成一套最小充分、可追溯、可按需升级的项目 Agent operating model。项目内的单次 `FEATURE_SPEC.md` 是运行时任务输入，不触发默认重编译。

## 输入

### 必需

| 名称 | 形态 | 内容 |
|---|---|---|
| `spec` | Markdown 或等价文本 | 目标、范围、非目标、验收条件、约束 |
| `architecture` | Markdown/diagram/text | 模块边界、关键决策、不可违反的接口和数据流 |
| `repo_facts` | 扫描结果 + 入口文档 | 语言、目录、构建/测试/部署命令、现有规则 |

### 可选

`project_policy`（团队习惯和权限边界）、`experience_library`（统一格式的经验条目）、`harness_capabilities`（Native Codex/Skills/subagents/Goals/OMX 是否可用）、`risk_profile`（正确性、安全、合规、延迟和预算权重）。缺省时使用 Native Agent、低风险、低复杂度假设，并在 manifest 中标明假设。

## 输出

```text
AGENTS.md
.pcaom/
├── manifest.yaml
├── rationale.md
├── context-map.md
├── escalation-policy.md
└── generated/
    └── <conditional skills or policies>
```

输出必须包含：常驻规则、条件技能及触发器、上下文路由、任务政策、验证政策、并行/单 fan-out 政策、人类升级政策、编排升级政策、假设、输入摘要和生成版本。

对于 Larry DSH 目标，输出语义为“版本化 Base Profile + 项目特定 Overlay”。Base Profile 承载跨项目稳定的执行机制；Overlay 只承载足以改变执行行为的架构、仓库、风险和资源差异。没有有效差异时允许空 Overlay，不得为了显示项目特化而生成控制。

## Manifest 最小字段

```yaml
version: 0
project: <identifier>
inputs:
  spec: <path or digest>
  architecture: <path or digest>
  repo_facts: <path or digest>
assumptions: []
controls: []
escalation:
  default_level: L0
  allowed_levels: [L0, L1, L2]
target:
  adapter: <identifier>
  runtime_ref: <version or revision>
  capabilities: []
  policy_enforcement:
    prompt_guidance: []
    runtime_enforced: []
```

每个 `controls` 项至少有：`id`、`kind`、`level`、`trigger`、`reason`、`benefit`、`runtime_cost`、`source`、`verification`、`removal_condition`。`kind` 取 `rule`、`skill`、`routing`、`verification`、`parallelism` 或 `escalation`。

## 不变量

1. 输入缺失或相互矛盾时不得伪造确定结论；输出 blocker 和待补信息。
2. 不输出无法解释、无触发条件或 Native Agent 已可靠覆盖的控制。
3. 不生成新的 Agent runtime、daemon、server、数据库、UI 或隐式 scheduler。
4. 任何并行政策必须声明唯一 fan-out owner、任务独立性和聚合验证方式。
5. 每条规则必须可追溯到输入、经验条目或观察证据。
6. 生成过程可重复：相同输入、版本和配置应产生等价 artifact；差异应出现在 manifest。
7. 生成物必须可被人类直接阅读、审查和删除。
8. 模型成本梯度与编排复杂度梯度必须分开表达，不得将使用强模型等同于启动 Team 或 durable runtime。
9. Feature Spec 描述一次需求“做什么”；Project Profile 描述项目内 Agent“如何工作”，两者不得互相替代。
10. Target adapter 必须固定 runtime 版本并区分软性 policy 与 runtime 强制能力；实验性、不可恢复或未核实能力不得写成稳定保证。

## V0 验收标准

- 能对一个真实 repo 生成上述 artifact，且不修改源代码。
- 人类可从 rationale 解释每条控制为何存在、成本是什么、何时删除。
- 生成结果比通用框架更项目化，并保留明确的 L0 默认路径。
- 至少一个 dogfood 记录比较启用/不启用控制时的验证结果、Token/延迟和人工干预。
- 对缺失输入、矛盾架构和超出能力边界的情况能失败并说明原因。

## 明确非目标

V0 不做自动 workflow 搜索、自动 benchmark 优化、多 Agent runtime、长期状态服务、跨项目数据库、在线遥测或自动改写生产仓库。
