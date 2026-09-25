# Related Work and Positioning

PCAOM 位于 Harness Engineering、Spec-Driven Development、Context Engineering、Project Steering、SOP/Workflow-as-Code、Automated Agent Design、DSPy-style compilation 与 partial evaluation 的交叉处。

| 方向 | 已解决的问题 | PCAOM 的差异 |
|---|---|---|
| Harness Engineering | 为 Agent 提供约束、工具和反馈环境 | 系统化编译项目专属 operating model |
| Spec Kit / OpenSpec | 把意图变成 spec、plan 和任务 artifact | 输出不止 spec，而是运行时控制政策 |
| BMAD | 角色化、阶段化的软件开发流程 | 不以项目最小充分和成本正则化为中心 |
| Kiro / rules generators | 从 repo 生成 steering files 或规则 | 需要同时生成验证、升级、并行与理由 |
| MetaGPT | 用 SOP 组织多 Agent 工作流 | PCAOM 进行项目特化并默认抑制永久编排 |
| AFlow / ADAS / AgentSquare | 搜索或设计 Agent workflow/architecture | PCAOM 的对象是长期 repo harness，而非单 benchmark |
| DSPy | 用数据和 metric 编译优化 LM 程序 | PCAOM 将编译对象换成项目 agent policy |
| Partial evaluation | 已知输入后提前消除运行时判断 | PCAOM 提前决定哪些流程在本项目需要存在 |

PCAOM 不是“自动生成一份 AGENTS.md”。它至少要完成四项 project specialization：读取项目事实；从经验库选择并压缩方法；显式优化 Token、延迟、人类干预和维护复杂度；按证据升级，而不是把所有能力永久打开。

当前结论是零件已有先例，但“项目级最小充分、可解释、可演进的 Agent Harness 编译闭环”尚未形成成熟通用方案。该判断在 V0 阶段应作为待验证命题，而不是既定事实。
