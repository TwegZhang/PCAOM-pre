# PCAOM

Project-Compiled Agent Operating Model：面向具体软件项目，把需求、架构、代码库事实、方法经验、可用 Agent 能力和风险/成本约束，编译成最小充分、可解释、可演化的 Agent operating model。

当前提供两个并行的 target bundles：**Larry DSH Profile** 与 **Codex + OMX + DS41 supervised Team**。Human + 官方 Codex 负责需求、架构和最终验收；项目显式选择一个执行目标。Larry 内由 DSH + DeepSeek 执行，DS41 内由独立 DS41 Codex Leader 拥有 Ultragoal、Team 和执行写入。两者不得嵌套或同时接管同一任务树。

## 当前状态（2026-09-27）

本仓库目前处于 **formalization / early implementation** 阶段：研究、Compiler Contract V0、双层工作流和 Experience Library V0 已记录；Larry DSH Headless Base Profile V0 已安装，并在真实 SSH + tmux 环境通过 DeepSeek、项目 `AGENTS.md` 和 Codex one-shot 三项 runtime smoke test；compiler、CLI、真实项目 dogfood 和 benchmark 尚未实现。

deterministic reference compiler/emitter 尚未实现；profiler、Project IR validator 和确定性生成 CLI 仍是后续工作。静态 bundle、独立安装器、Skill 与 Bridge 不等于完整 Compiler。

| Target bundle | 当前能力与证据边界 |
| --- | --- |
| [larry-dsh-headless](templates/larry-dsh-headless/README.md) | `runtime-smoke-verified` 仅覆盖上述三项，见 [历史 observation](docs/observations/2026-09-25-larry-dsh-runtime-smoke.md)；真实实现、Team、恢复和 dogfood 未验证。 |
| [codex-omx-ds41-supervised-team](templates/codex-omx-ds41-supervised-team/README.md) | 整体仍为 `generated-unverified`；Profile/installer 已达 `config-verified`，Team/worktree/最终审查已达 `runtime-smoke-verified`。Bridge 仍为 `experimental-unverified`，Ultragoal、resume/恢复和 dogfood 未验证。 |

已完成：

- 研究材料整理为 foundations、related work、compiler model、escalation model 和 Superpowers/OMX study。
- 明确强 Native Codex/DIY 是通用比较基线；Larry DSH 目标内默认由 DeepSeek 执行，复杂度和模型能力均按证据升级。
- 固化 `one control point, one owner` 与 `one fan-out owner`。
- 定义 Compiler Contract V0：输入、输出、manifest/control schema、不变量、验收标准和非目标。
- 明确双层 AI Coding 工作流、项目级/需求级边界，以及 Larry DSH Profile 作为第一个编译目标。
- 建立 PCAOM 根 `AGENTS.md` 与下游项目 AGENTS wrapper/generated-policy 模板，锁定项目人工规则优先和非破坏式融合边界。
- 建立 Experience Library V0：Native Codex、Superpowers、OMX、verification 和 anti-pattern 条目，统一记录适用条件、成本、证据与编译指导；新增 OMX-006 supervised DS41 Team 候选模式，尚非 dogfood 事实。
- 按固定官方 revision 核实 DSH Profile、Preset、Goal、experimental Team、Workflow、Schedule 和 Codex provider 的真实能力边界。
- 生成 Larry DSH Headless Base Profile V0，并用静态测试锁定 bundle、Codex delegation、执行 policy 和 `generated-unverified` 状态。
- 在本机安装匹配的 DSH/Provider `0.1.5-rc.3`，部署 Profile patch，并由 `--dump-config` 确认 `subagent_codex` one-shot 工具已进入合成配置。
- 完成 Larry Profile runtime smoke：DeepSeek 基础执行、项目级 `AGENTS.md` 自动加载和 bounded Codex one-shot 调用均通过。
- 写出从经验库到 Reference Compiler、Dogfood、Explainability、Recompiler 的阶段计划。

未完成：

- Reference Compiler V0
- Reference Compiler 生成真实项目 `AGENTS.md` 与 Overlay 后的完整执行验证
- 真实项目 dogfood 与可复查指标
- 基于证据的 recompile loop

## 下次启动入口

下一次启动时先读本文件，然后按顺序读：

1. [Compiler Contract V0](docs/methodology/compiler-contract-v0.md)
2. [PCAOM × DSH 双层 AI Coding 工作流](docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md)
3. [Codex + OMX + DSH 组合工作流使用指南](docs/methodology/codex-omx-dsh-usage-guide.md)
4. [PCAOM AGENTS.md 分层与融合设计](docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md)
5. [下游项目 AGENTS 模板](templates/project-agents/README.md)
6. [Reference Compiler V0 Design](docs/superpowers/specs/2026-09-25-reference-compiler-v0-design.md)
7. [Larry DSH Headless Base Profile V0](templates/larry-dsh-headless/README.md)
8. [Experience Library V0](experience/README.md)
9. [PCAOM Foundations](docs/theory/pcaom-foundations.md)
10. [Compiler Model](docs/methodology/compiler-model.md)
11. [Escalation Model](docs/methodology/escalation-model.md)
12. [Superpowers / OMX Study](docs/research/superpowers-omx-study.md)
13. [DeepSeek Harness Capability Study](docs/research/dsh-capability-study.md)
14. [Larry DSH Runtime Observation](docs/observations/2026-09-25-larry-dsh-runtime-smoke.md)
15. [Codex + OMX + DS41 Runtime Observation](docs/observations/2026-09-27-codex-omx-ds41-runtime-smoke.md)
16. [Phased Plan](docs/superpowers/plans/2026-09-19-pcaom-v0.md)

原始交接材料位于 [PCAOM-handoff-2026-09-19](PCAOM-handoff-2026-09-19/README.md)，用于追溯研究来源，不应直接替代归一化文档。

## 下一次 Codex 启动提示

```text
先读 README.md、AGENTS.md、Compiler Contract 和使用指南，再按显式选择的 target 阅读对应 bundle README、设计与证据。Larry 实现以 docs/research/dsh-capability-study.md 固定的官方 revision 为准；DS41 使用其 bundle 固定的 Codex/OMX/tmux 版本。

请先做 recap：说明 PCAOM 的目标、Contract V0、项目级 Profile 与需求级 Feature Spec 的区别、当前证据和未完成事项。静态 target bundle 不代表 Compiler 已实现。强 Native Codex/DIY 是通用比较基线；每项控制须有原因、收益、成本、触发、来源、验证和移除条件。每个任务树只有一个 execution-plane fan-out owner：Larry 为 DSH，DS41 为 DS41 Leader；不嵌套，不建设新的 runtime，没有 dogfood 证据不扩展复杂度。
```

## 不可越过的边界

V0 不做新的 multi-agent runtime、workflow engine、server、database、dashboard、在线遥测、自动 workflow search 或隐式 scheduler。若输入不足或架构冲突，先记录 blocker，不伪造结论。
