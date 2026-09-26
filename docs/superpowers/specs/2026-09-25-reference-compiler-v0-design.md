# PCAOM Reference Compiler V0 Design

**状态：** 推荐架构已确认；等待书面 spec review 后进入实施计划。

后续目标扩展：Larry 与 DS41 静态 bundle 已并存；确定性 profiler、IR validator 与 emitter 尚未实现。首个目标集成里程碑是人工 manual semantic fixture，不能以安装器、Skill 或 Bridge 替代完整 Compiler 验收。

## 目标

实现一个混合式 Reference Compiler：Codex 负责理解项目文档并产生结构化决策，确定性程序负责校验、拒绝非法控制并生成稳定 artifact。

```text
Spec / Architecture / Repo Facts / Experience Library
                         ↓
                 Codex Semantic Frontend
                         ↓
                    Project IR JSON
                         ↓
             Deterministic Validator + Emitter
                         ↓
       AGENTS.md / manifest / rationale / selected target bundle
```

V0 用于验证 PCAOM 的核心主张，不追求自动理解所有软件项目，也不嵌入新的 LLM SDK、Agent runtime 或长期服务。

## 为什么采用混合架构

纯规则程序只能可靠处理文件、字段、digest 和显式标签，无法稳定理解自然语言中的架构风险、隐含约束和矛盾。Codex 端到端直接写 Profile 又难以复现、校验和解释。

混合架构将两类工作分开：

- Codex：理解、判断、选择、解释。
- 确定性程序：验证、拒绝、排序、生成、比较。

相同的已批准 Project IR、Compiler 版本和模板版本必须产生等价输出。Codex 的非确定性被限制在进入 IR 之前，且其每项判断都必须留下来源和理由。

## 范围

### V0 包含

- 只读扫描项目入口和常见构建文件，生成 `repo-facts.json`。
- Codex 按固定 instruction 将项目文档和 Experience Library 编译为 `project-ir.json`。
- 对 IR、输入 digest、Experience ID、控制 schema 和不变量做确定性校验。
- 生成 Contract V0 定义的文档 artifact。
- 根据显式 `execution_target` 生成一个目标 bundle 及项目 Overlay。
- 对缺失输入、未知 Experience ID、无来源控制、重复 fan-out owner、未核实 runtime 能力和 digest 漂移失败关闭。
- 保留空 Project Overlay 作为合法结果。

### V0 不包含

- 在 Compiler 程序内调用 OpenAI、DeepSeek 或其他模型 API。
- 自动解决产品或架构矛盾。
- 自动修改源代码仓库。
- Web target、Schedule、experimental Team 的默认启用。
- 自动安装 DSH、自动启动 Profile 或无人值守 dogfood。
- 自动从运行数据优化 policy。

## 组件

### 1. Read-only Project Profiler

输入 `spec`、`architecture` 和 repo 路径，输出：

- 输入文件的 SHA-256 digest；
- 仓库相对路径清单；
- 已识别语言和构建 manifest；
- 可静态确定的测试、构建和 lint 候选命令；
- 已有项目指导文件；
- 无法确定的事实列表。

Profiler 只陈述静态事实，不推断业务风险，也不执行项目命令。

### 2. Codex Semantic Frontend

Semantic Frontend 是一份仓库内、版本化的编译 instruction，由当前 Codex 会话执行，不是 Compiler 内嵌 API。

Codex 读取：

- 项目级 spec 和 architecture；
- `repo-facts.json`；
- Experience Library；
- Compiler Contract；
- DSH capability snapshot；
- 可选 project policy 和 risk/cost profile。

Codex 输出单一 `project-ir.json`，不得直接生成最终 Profile。它负责：

- 提取项目事实、假设、风险和 blocker；
- 判断项目与 Base Profile 的有效差异；
- 对每个 Experience 条目作 `select`、`reject` 或 `not-applicable` 决策；
- 把选中条目特化为项目 trigger、action、verification 和 removal condition；
- 区分 prompt guidance 与 runtime-enforced control；
- 标明判断置信度和需要 Human 决策的高杠杆分支。

### 3. Deterministic Validator

Validator 不判断业务含义，只验证 IR 是否可安全生成：

1. 输入路径存在且 digest 与 profiler 输出一致。
2. IR 版本和 target adapter 受支持。
3. Experience Library 中每个 ID 恰有一项 decision，结果只能是 `select`、`reject` 或 `not-applicable`；多个 control 可以引用同一条已选 Experience。
4. 每个 control ID 唯一，字段完整、来源可追溯并声明 owner 和 scope。
5. 同一 scope 最多一个 fan-out owner。
6. `runtime-enforced` control 必须提供 `capability_ref`，且只能引用所选 adapter 固定版本已核实的稳定能力。
7. experimental 或未 smoke-test 能力不能成为 required control；V0 不提供风险接受旁路。
8. blocker 未解决时不生成 active Profile，只生成诊断报告。
9. 输出路径必须位于显式 staging directory，不能覆盖输入 repo。

### 4. Artifact Emitter

Emitter 对已经通过校验的 IR 进行排序和模板化，生成：

```text
dist/sample-project/
├── AGENTS.md
├── .pcaom/
│   ├── manifest.yaml
│   ├── rationale.md
│   ├── context-map.md
│   ├── escalation-policy.md
│   └── generated/
│       └── larry-dsh-headless/
│           ├── package.json
│           ├── cordis.patch.yml
│           └── EXECUTION_POLICY.md
└── compile-report.md
```

Emitter 不加入当前时间等不稳定字段。所有列表按稳定 key 排序；输入 digest、Compiler 版本、Experience Library 版本、DSH revision、DSH package version 和模板版本进入 manifest。target adapter 而不是 Codex IR 提供这些 runtime 常量，防止语义前端伪造已验证版本或状态。

### 5. Larry DSH Headless Adapter

Larry adapter 的设计边界保持如下（实现状态以 bundle 和 observation 为准）：

- 本机 V0 adapter 固定到已安装的 `dsh-v0.1.5-rc.3@a4c74a91e06b00fe0b0937bde982170c526cc842`；较新的 `0.1.7-rc.2` 只保留为能力研究快照，不混入运行模板；
- 使用 `dsh-base`、`dsh-headless` 和官方 Codex provider 组合；
- Codex delegation 默认 `permissionMode: never`，model 继承原生 Codex 配置；
- Codex 返回按 final-text-only 处理，DSH 必须重新读取 diff 并运行验证；
- Team、Schedule 和 Web preset 默认不生成；
- Profile 保留 `EXECUTION_POLICY.md` 作为可审查的 policy source；Compiler 将适用规则渲染进目标项目的 `AGENTS.md`，因为 DSH 自动加载项目级 `AGENTS.md`，不会自动加载 Profile 目录内的 policy 文件；
- Goal pause/resume 标记为 human-root-turn operation；
- 在本机 `--dump-config` 和 smoke test 前，Profile 状态为 `generated-unverified`。固定版本 `0.1.5-rc.3` 不提供 `--dump-config-schema`，该能力不作为 promotion gate。

## Project IR V0

### Target adapter 选择与输出边界

Project IR 的 `execution_target` 是必填枚举：`larry-dsh-headless` 或 `codex-omx-ds41-supervised-team`。`target.adapter` 必须与它一致；Validator 拒绝缺失、未知、冲突或多个选择。一次 emit 输出 exactly one target adapter；仓库可保存两套模板，同一执行任务树只能激活一套，不嵌套。

Adapter 接口输入为已校验 IR、版本化 capability snapshot、模板与 digest；输出为目标文件映射、固定 runtime versions、per-capability status map 和 rationale 引用。版本和证据由 adapter 提供，不接受语义前端自行晋升。当前 DS41 map 见 [metadata](../../../templates/codex-omx-ds41-supervised-team/pcaom-target.json)：profile/installer/skill 为 `generated-unverified`，bridge 为 `experimental-unverified`，Ultragoal/Team/worktree/final review 为 `runtime-unverified`。Larry 仅保留 [已记录的 smoke 范围](../../observations/2026-09-25-larry-dsh-runtime-smoke.md)。

上述 emitter 树展示 Larry 分支。DS41 分支位于 `.pcaom/generated/codex-omx-ds41/`，包含 `pcaom-target.json`、`install-manifest.json`、`install.mjs`、`codex/` Profile/catalog 和 `project/.codex/skills/pcaom-ds41-team/` Skill/Bridge；文件细节见 [bundle README](../../../templates/codex-omx-ds41-supervised-team/README.md)。通用 generated policy 仅与所选目标 policy 组合。生成只写 staging，不触及输入仓库、Codex Home 或 tmux；安装为另一次显式操作，按 manifest 写入已授权项目和 Codex Home。模板和人工 fixture 不证明 emit 的确定性或融合行为。

IR 使用 JSON，避免为 Compiler V0 引入 YAML parser 依赖。以下是结构节选，不代表一份可直接通过 Validator 的完整项目 IR：

`spec` 和 `architecture` 路径相对输入 repo 根目录；`repo_facts` 路径相对 `project-ir.json` 所在的 compile work directory。IR 和输出不得记录机器相关的绝对路径。

```json
{
  "ir_version": 0,
  "project": "sample-project",
  "execution_target": "larry-dsh-headless",
  "inputs": {
    "spec": {"path": "docs/PROJECT.md", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
    "architecture": {"path": "docs/ARCHITECTURE.md", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
    "repo_facts": {"path": "repo-facts.json", "sha256": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}
  },
  "target": {
    "adapter": "larry-dsh-headless"
  },
  "assumptions": [],
  "blockers": [],
  "decisions": [
    {
      "experience_id": "VER-002",
      "outcome": "select",
      "reason": "Completion claims require fresh repository evidence",
      "sources": ["docs/PROJECT.md#acceptance"],
      "confidence": "high"
    }
  ],
  "controls": [
    {
      "id": "project-fresh-verification",
      "experience_id": "VER-002",
      "kind": "verification",
      "level": "L1",
      "owner": "dsh-leader",
      "scope": "project-execution",
      "enforcement": "prompt-guidance",
      "trigger": "before completion claim",
      "reason": "Prevent stale evidence from closing a feature",
      "benefit": "Higher verification reliability",
      "runtime_cost": "One relevant verification run",
      "source": "docs/PROJECT.md#acceptance",
      "verification": "Record command, exit code and result summary",
      "removal_condition": "Replace only when an equivalent runtime-enforced gate exists"
    }
  ]
}
```

实际 digest 必须是 64 位小写十六进制值。示例使用空内容的合法 SHA-256，仅用于展示格式；完整 IR 必须为 Experience Library 的全部 ID 提供 decision。

## 数据流

```text
1. profile
   Inputs → deterministic repo-facts.json + digests

2. semantic compile
   Codex + inputs + Experience Library → proposed project-ir.json

3. validate
   project-ir.json + current inputs → errors / validated IR

4. emit
   validated IR + versioned templates → staged artifacts

5. review and activate
   Human reviews rationale and blockers → install/smoke-test Profile
```

项目输入发生变化后，旧 IR 会因 digest 不一致而失败，必须重新运行 semantic compile 或由 Human 明确更新对应输入引用。

## 错误与退出行为

- 输入缺失或 digest 漂移：失败，不生成 Profile。
- 自然语言矛盾：Codex 写入 blocker；Validator 只确认 blocker 结构，不自行裁决。
- 未知 Experience ID：失败。
- control 缺少 reason、runtime_cost、source、verification 或 removal_condition：失败。
- 多个 fan-out owner：失败。
- 把 prompt guidance 声称为 runtime enforced：失败。
- DSH experimental 能力被标成 required：失败；V0 没有风险接受旁路。
- 无有效项目差异：成功，生成空 Overlay 和说明。
- DSH 未安装：artifact 可以生成，但状态保持 `generated-unverified`，不得标记 active。

错误输出必须包含机器可读 code、字段路径和人类可读解释；不得静默补全缺失语义。

## CLI 边界

V0 计划提供两个确定性命令（尚未实现）：

```text
pcaom profile --spec PATH --architecture PATH --repo PATH --work-dir PATH
pcaom emit --ir PATH --output PATH
```

Semantic compile 由 Codex workflow 在两条命令之间完成。CLI 不持有 API key，不调用模型，不修改输入 repo。

## 测试策略

使用 Python 标准库和 `unittest`，不新增运行时依赖。

必须覆盖：

- profiler 输出稳定且使用相对路径；
- 输入缺失与 digest 漂移失败；
- IR schema 正反例；
- 未知/重复 Experience ID；
- 缺字段和无来源 control；
- 重复 fan-out owner；
- unsupported runtime-enforced capability；
- blocker 时不生成 active Profile；
- 空 Overlay 合法；
- 同一 IR 两次生成 byte-equivalent artifact；
- Larry package/patch 包含固定 revision contract；
- Profile 在未 smoke-test 时始终为 `generated-unverified`；
- emitter 拒绝写到输入 repo 或非空未授权目录。

真实 DSH 验证属于单独集成阶段：安装后运行 `--dump-config` 和最小任务 smoke test，并把结果记录为 project observation。`0.1.5-rc.3` 不提供 `--dump-config-schema`，不得把未提供的命令写成已验证能力。

## 验收标准

1. 一个边界清晰的样例项目能够从 inputs 生成 repo facts、经 Codex 形成 IR，并生成完整 staged artifacts。
2. 人类可以从 rationale 和 IR 解释每项控制为何选择、来源是什么、成本和移除条件是什么。
3. 校验器能够拒绝无来源控制、重复 fan-out、伪 runtime guarantee 和过期 digest。
4. 空 Overlay、blocker 和未安装 DSH 都有明确、可复查的结果。
5. 相同 IR、模板和版本生成 byte-equivalent artifact。
6. V0 没有模型 SDK、数据库、server、daemon、新 workflow runtime 或自动生产仓库写入。
