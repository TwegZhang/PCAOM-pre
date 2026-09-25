# PCAOM × DSH 双层 AI Coding 工作流

**状态：** 方向已确认；DSH 能力已按固定官方 revision 核实；本机 SSH + tmux headless smoke 已通过；真实项目 dogfood 仍待验证。后续证据见 [`Larry DSH Headless Runtime Observation`](../../observations/2026-09-25-larry-dsh-runtime-smoke.md)。

## 目标

将 PCAOM 的抽象控制面落到第一个具体编译目标：Larry DSH Profile。高能力、高成本模型集中处理产品、架构、困难问题和最终验收；低成本模型在明确规格和固定执行制度下承担持续施工。

核心原则：

> Human + Codex 把问题想清楚；DSH + DeepSeek 把事情做完；Codex 只在 Think、Escalate、Verify 三个高杠杆节点介入。

## 两个范围

### 项目级范围

项目是长期存在的产品或代码库。项目级事实包括总体目标、架构边界、技术栈、仓库入口、风险、团队政策和资源约束。这些事实变化较慢，用于低频编译项目执行制度。

### 需求级范围

需求是项目内的一次迭代、一个功能点或一个缺陷修复。每个需求产生独立的 `FEATURE_SPEC.md`，但默认复用项目已有的 DSH Profile，不重新运行 PCAOM Compiler。

## Profile 分层

```text
Larry DSH Base Profile
通用研发流程、角色、执行和升级机制
                 +
Project Overlay
架构边界、仓库命令、风险和成本参数
                 =
Effective Project Profile
```

Base Profile 是相对固定、可跨项目复用的默认配置。Project Overlay 是 PCAOM Compiler 根据项目差异生成的薄层。若项目没有足以改变执行行为的差异，Compiler 应输出空 Overlay 或仅输出仓库命令，不人为制造项目特化。

强 Native Codex/DIY 仍是评估 PCAOM 收益时的通用比较基线；在 Larry DSH 这一具体目标内部，默认执行者是 DSH + DeepSeek。前者回答“新方案是否值得”，后者回答“该目标平时由谁施工”，两者不是同一个层级概念。

在当前官方 DSH 中，Base Profile 的真实入口是包含 `dsh.profile.bundles` 的 `package.json` 和 `cordis.patch.yml`。Project Overlay 必须遵守 DSH 的完整 config 替换语义，不能假设 YAML 深合并。leader/worker/reviewer 需要显式 preset ID 和 plugin 绑定。

项目差异主要来自：

1. 风险与合规，例如支付一致性、安全或隐私要求。
2. 架构与交付形态，例如单体、微服务、前端、嵌入式及其测试边界。
3. 仓库事实，例如目录、构建、测试、发布命令和不可违反的接口。
4. 资源策略，例如 Token、货币成本、延迟和人工注意力权重。

## 三个流程

### 1. Human + Codex 形成需求规格

这是每个需求的高频入口。Human 拥有产品、范围、架构和验收决策；Codex 负责澄清、分析和规格化，输出机器可执行的 `FEATURE_SPEC.md`：

```text
Goal / Scope / Non-goals
Architecture impact
Implementation constraints
Acceptance criteria
Verification requirements
```

`FEATURE_SPEC.md` 描述“这次要做什么”，不定义 Agent 的通用工作方式。

### 2. DSH 使用 Profile + Feature Spec 执行

```text
Effective Project Profile + FEATURE_SPEC.md
                       ↓
                 DeepSeek Leader
                       ↓
          Explore / Implement / Test / Fix
                       ↓
          Codex bounded escalation（按需）
                       ↓
                 Codex final review
                 PASS / CHANGES_REQUIRED
```

DSH 是唯一 execution plane 和 fan-out owner。DeepSeek 负责主要施工；简单任务使用单 Agent，只有任务真正独立且并行收益大于协调成本时才启动 experimental Team。Team 共享 workspace 且 write scope 不加锁，因此文件 ownership 和聚合验证必须由 Profile 明确规定。

困难问题通过官方 `@deepseek-ai/dsh-subagent-codex` 升级给 Codex one-shot expert。典型触发包括复杂并发或状态一致性、安全问题、跨核心模块修改，以及同一明确问题的合理尝试连续失败。provider 每次创建 fresh process/thread/turn，只返回最终文本或安全错误；因此 Codex 完成 bounded task 后，DSH 必须重新读取工作区 diff 并运行验证，不能把 provider 返回当作完整执行证据。

若执行暴露的是产品或架构缺陷，而不是实现困难，DSH 输出 `BLOCKED_ARCHITECTURE` 并停止继续施工。当前官方 Goal 的 pause/resume 需要 root turn 中的直接 human message，因此 Profile 只能要求 Agent 报告并停止推进，不能声称它能自主持久 pause Goal。Human + Codex 形成新版本 Spec，并由支持的 host/user 操作恢复后再继续执行。

### 3. PCAOM Compiler 低频生成项目 Profile

PCAOM Compiler 不负责生成每个 Feature Spec。它读取项目级 spec、architecture、repo facts、团队政策、可用 harness、风险和成本画像，从 Larry DSH Base Profile 中选择、参数化或删除控制，生成 Project Overlay、manifest 和 rationale。

逻辑时序是先初始化 Profile，再反复运行需求循环：

```text
项目初始化：Project Context → PCAOM Compiler → Project Profile v1

需求循环 A：Human + Codex → Spec A → DSH(Profile v1 + Spec A)
需求循环 B：Human + Codex → Spec B → DSH(Profile v1 + Spec B)
```

只有架构、工具链、风险政策、模型能力发生实质变化，或 dogfood 观察到重复失败、升级失衡、验证遗漏和成本浪费时，才重新编译 Profile v2。

## 两个独立升级维度

模型成本梯度与编排复杂度必须分开表达：

```text
模型梯度：DeepSeek Flash → DeepSeek → Codex one-shot → Human + Codex
编排梯度：单 Agent → Project Rules → Skill → Goal → Team / durable runtime
```

使用更强模型不自动意味着启动更复杂编排；启动 Team 也不自动意味着使用 Codex。每次升级都必须有触发证据、预期收益、成本和回退条件。

## 所有权

- Human：产品、范围、架构和最终业务接受。
- Codex：需求规格化、困难 bounded task、高级验收。
- PCAOM Compiler：编译项目执行政策，不参与运行时调度。
- DSH：运行时执行、Goal 和唯一 fan-out ownership；Team/Mailbox 作为 experimental 条件能力。
- DeepSeek：默认 Leader 和主要执行者。

## 第一个 dogfood

Larry DSH Profile 是 PCAOM 的第一个编译目标，不是 PCAOM 本身。首轮 dogfood 应比较强 Native Codex/OMX baseline、DSH-only 和 DSH + Codex escalation，记录完成质量、DeepSeek 独立完成比例、Codex 升级原因、最终验收通过率、Token、成本、延迟、返工和人工介入。

只有重复证据证明某项控制值得其运行成本，才将其固化进 Base Profile 或 Project Overlay 规则。

## V0 边界与假设

V0 优先使用现有 DSH bundle、Profile、YAML patch、Preset 和 policy 文档，不开发新的 Team、Mailbox、Goal、scheduler 或 Agent runtime。Larry 自有的 `execute`、`verify`、`long-task` 可以是 policy/template，但不能写成 DSH 原生 saved workflow；官方 Workflow 当前不支持保存、checkpoint 或 restart resume。确定性插件只在纯配置无法可靠执行已被 dogfood 证明必要的规则时考虑。

官方能力快照固定于 `deepseek-ai/deepseek-harness@477b4f420553e8a52c2fbccc464d7561b239c443`，详见 `docs/research/dsh-capability-study.md`。Goal 恢复后需要显式 resume；Schedule 依赖 Host Web Session controller，V0 headless 路径不依赖它。本机安装、npm 发布包、模型路由、项目级 `AGENTS.md` policy 注入和 bounded Codex one-shot 已完成 smoke 验证；DeepSeek 在 Codex 返回后重新验证真实代码变更、真实项目施工、Goal/Team/Schedule 与成本行为仍需通过 dogfood 核实。
