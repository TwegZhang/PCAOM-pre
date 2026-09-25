# PCAOM

Project-Compiled Agent Operating Model：面向具体软件项目，把需求、架构、代码库事实、方法经验、可用 Agent 能力和风险/成本约束，编译成最小充分、可解释、可演化的 Agent operating model。

当前第一个具体编译目标是 **Larry DSH Profile**：Human + Codex 负责需求、架构、困难问题和最终验收，DSH + DeepSeek 负责低成本持续执行。PCAOM 低频生成“通用 Base Profile + 项目 Overlay”，项目内每个需求只生成 `FEATURE_SPEC.md` 并复用该 Profile。

## 当前状态（2026-09-25）

本仓库目前处于 **formalization / early implementation** 阶段：研究、Compiler Contract V0、双层工作流和 Experience Library V0 已记录；Larry DSH Headless Base Profile V0 已安装，并在真实 SSH + tmux 环境通过 DeepSeek、项目 `AGENTS.md` 和 Codex one-shot 三项 runtime smoke test；compiler、CLI、真实项目 dogfood 和 benchmark 尚未实现。

已完成：

- 研究材料整理为 foundations、related work、compiler model、escalation model 和 Superpowers/OMX study。
- 明确强 Native Codex/DIY 是通用比较基线；Larry DSH 目标内默认由 DeepSeek 执行，复杂度和模型能力均按证据升级。
- 固化 `one control point, one owner` 与 `one fan-out owner`。
- 定义 Compiler Contract V0：输入、输出、manifest/control schema、不变量、验收标准和非目标。
- 明确双层 AI Coding 工作流、项目级/需求级边界，以及 Larry DSH Profile 作为第一个编译目标。
- 建立 PCAOM 根 `AGENTS.md` 与下游项目 AGENTS wrapper/generated-policy 模板，锁定项目人工规则优先和非破坏式融合边界。
- 建立 Experience Library V0：31 条 Native Codex、Superpowers、OMX、verification 和 anti-pattern 条目，统一记录适用条件、成本、证据与编译指导。
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
15. [Phased Plan](docs/superpowers/plans/2026-09-19-pcaom-v0.md)

原始交接材料位于 [PCAOM-handoff-2026-09-19](PCAOM-handoff-2026-09-19/README.md)，用于追溯研究来源，不应直接替代归一化文档。

## 下一次 Codex 启动提示

```text
先读 README.md，再读 docs/methodology/compiler-contract-v0.md、docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md、experience/、docs/theory/、docs/methodology/、docs/research/ 和 phased plan。DSH 实现以 docs/research/dsh-capability-study.md 固定的官方 revision 为准。

请先做 recap：说明 PCAOM 的目标、已完成文档、Contract V0 的边界、双层工作流、Experience Library 的证据边界、项目级 Profile 与需求级 Feature Spec 的区别、当前阶段和未完成事项。然后继续执行 phased plan 中下一个未完成阶段。保持 PCAOM 原则：强 Native Codex/DIY 是通用比较基线，Larry DSH 目标内 DeepSeek 是默认执行者；Larry DSH Base Profile + 薄 Project Overlay；低频编译 Profile、高频执行 Feature Spec；每项控制必须有 reason、benefit、runtime cost、trigger、source、verification 和 removal condition；一个控制点一个 owner；DSH 是 execution plane 的唯一 fan-out owner；不建设新的 Agent runtime；没有 dogfood 证据不要扩展复杂度。
```

## 不可越过的边界

V0 不做新的 multi-agent runtime、workflow engine、server、database、dashboard、在线遥测、自动 workflow search 或隐式 scheduler。若输入不足或架构冲突，先记录 blocker，不伪造结论。
