# PCAOM Codex + OMX + DS41 Supervised Team Target Design

**状态：** 设计已批准；尚未实现。本文定义 PCAOM 面向下游项目生成的第二个执行目标，不改变 Larry DSH 目标，也不在 PCAOM 仓库自身加载或启动该运行时。

## 1. 目标

新增编译目标 `codex-omx-ds41-supervised-team`，让下游项目获得以下工作流：

1. Human 与官方订阅 Codex 完成需求讨论、架构设计、`FEATURE_SPEC.md` 和验收标准。
2. 官方 Codex 从同一个 tmux session 启动独立的 DS41 Codex 进程。
3. DS41 Codex 拥有 Ultragoal 和 OMX Team，默认使用 `deepseek-flash` 作为 Leader 与 Worker 模型。
4. 官方 Codex 使用事件驱动、低 Token 的监督方式接收问题、发送 steering，并在 Team 完成后重新读取代码、运行验证和做最终验收。
5. PCAOM Compiler 只生成可审查 artifact；独立安装器负责把项目级 Skill 与用户级 Codex Profile 激活到下游环境。

## 2. 非目标

- 不新增 Agent runtime、任务数据库、mailbox、scheduler、server、dashboard 或常驻 daemon。
- 不让 PCAOM 仓库自身自动加载下游 Skill 或 DS41 Profile。
- 不在编译阶段修改输入仓库、`~/.codex`、tmux session 或运行中的 Codex 会话。
- 不把 DeepSeek API Key 写入仓库、生成物、日志或命令参数。
- 不替换 Larry DSH 目标；两个 target adapter 并存，由 Project IR 显式选择。
- 不允许官方 Codex 和 DS41 Leader 同时拥有 Ultragoal、Team fan-out 或代码写入权。
- 不把静态配置、模型目录声明或工具兼容声明当作 runtime smoke 证据。

## 3. 方案选择

### 3.1 采用：Bundle + 独立安装器 + 临时 Supervisor Bridge

Compiler 生成版本化、可审查 bundle。安装器在显式调用、dry-run 和冲突检查后，分别安装项目级 artifact 与用户级 Codex Profile。Supervisor Bridge 是当前官方 Codex turn 内的临时适配层，只调用 OMX、tmux 和 Codex 已有接口，不维护独立任务状态。

选择原因：

- 保持 Compiler 的纯生成、非修改边界；
- 保留官方 Codex 默认订阅配置，不通过全局 provider 切换影响现有会话；
- 复用 OMX Team、Ultragoal、worktree、mailbox、HUD 和生命周期；
- 允许无事件时只做本地阻塞等待，不触发模型调用；
- Bridge 退出后，权威任务状态仍完整保存在 OMX runtime 中。

### 3.2 不采用：仅生成说明、人工切换窗口

该方案实现简单，但官方 Codex 无法获得结构化问题、阻塞和完成事件，用户必须人工观察 DS41 Leader pane，不满足已批准的监督体验。

### 3.3 不采用：常驻 Supervisor daemon

常驻 watcher 可以跨 Codex turn 主动推送，但会引入新的长期进程、恢复语义和生命周期所有权，违反 PCAOM V0 不实现新 runtime 或 scheduler 的边界。

## 4. 权威来源与版本边界

PCAOM 仓库内的权威来源：

- `docs/methodology/compiler-contract-v0.md`
- `docs/superpowers/specs/2026-09-25-reference-compiler-v0-design.md`
- `docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md`
- `experience/native-codex.md`
- `experience/omx.md`
- `experience/verification.md`

外部能力来源：

- Codex Profile 使用独立的 `$CODEX_HOME/<profile>.config.toml` 文件；项目 `.codex/config.toml` 不允许覆盖 provider 或 provider authentication：<https://developers.openai.com/codex/config-advanced/>。
- Codex custom provider 支持 `base_url`、`env_key` 和 Responses wire API：<https://developers.openai.com/codex/config-reference/>。
- DeepSeek 官方为 Codex 提供 Responses API 集成，当前 V4.1 Flash API 名称为 `deepseek-flash`：<https://api-docs.deepseek.com/quick_start/agent_integrations/codex/>。

首个 adapter 只声明在以下组合上进行验证：

| 组件 | 首次验证版本 |
| --- | --- |
| Codex CLI | `0.156.1` |
| oh-my-codex | `0.21.6` |
| tmux | `3.7b` |
| DeepSeek model id | `deepseek-flash` |

这些版本是验证基线，不表示对其他版本不兼容。未经相同 smoke 的版本只能保持 `generated-unverified` 或明确较低的状态。

## 5. 编译输入与选择条件

Project IR 只有在以下条件满足时才允许选择该 target：

- Human 明确选择 `codex-omx-ds41-supervised-team`；
- 下游环境允许 Codex CLI、OMX 和 tmux；
- 项目接受向 DeepSeek API 传输任务上下文；
- 项目风险政策允许低成本模型承担主要施工；
- Feature 工作预计存在长任务、恢复或真正独立的并行 lane；
- 项目有可执行的验证命令和最终官方 Codex验收边界。

应选择或特化以下 Experience Library 控制：

- `NATIVE-003`：按需加载项目级 Skill；
- `OMX-001`：有 continuity risk 时使用 durable Ultragoal；
- `OMX-002`：只有独立 lane 才启动 Team；
- `OMX-003`：复用 mailbox 和 worker lifecycle；
- `OMX-004`：定义恢复、取消和 shutdown；
- `OMX-005`：DS41 Leader 是当前任务树唯一 fan-out owner；
- `VER-002`：完成声明必须有 fresh evidence；
- `VER-004`：并行工作后由 DS41 Leader运行聚合验证；
- `VER-005`：官方 Codex作为未承担主要实现的最终 reviewer。

## 6. 生成 Artifact

```text
dist/<project>/
├── AGENTS.md
├── .pcaom/
│   ├── AGENTS.generated.md
│   ├── manifest.yaml
│   ├── rationale.md
│   ├── context-map.md
│   ├── escalation-policy.md
│   └── generated/codex-omx-ds41/
│       ├── pcaom-target.json
│       ├── install-manifest.json
│       ├── codex/
│       │   ├── pcaom-ds41.config.toml
│       │   └── deepseek-models.json
│       └── project/
│           └── .codex/skills/pcaom-ds41-team/
│               ├── SKILL.md
│               └── scripts/supervisor-bridge.mjs
└── compile-report.md
```

`manifest.yaml` 必须记录：target adapter、模板版本、Codex/OMX/tmux 验证版本、所选 Experience IDs、控制 owner、安装状态、runtime smoke 状态、输入 digest、冲突和已知能力缺口。

## 7. AGENTS 分层调整

当前 `templates/project-agents/AGENTS.generated.md` 将 DSH 写成唯一 execution-plane owner，不能直接复用于新 target。实现时将其拆为：

1. target-neutral common policy：Human ownership、Feature Spec、blocker、验证和非破坏式融合；
2. Larry DSH execution policy；
3. Codex + OMX + DS41 execution policy。

Emitter 每次只选择一个 active execution target。同一任务树不得同时激活 Larry DSH 和 DS41 OMX Team；切换必须是显式、完成当前 runtime 生命周期后的 handoff。

## 8. Codex Profile 设计

安装后的用户级文件：

```text
$CODEX_HOME/pcaom-ds41.config.toml
$CODEX_HOME/model-catalogs/pcaom-deepseek-models.json
```

Profile 模板语义：

```toml
model = "deepseek-flash"
model_provider = "deepseek"
model_reasoning_effort = "high"
forced_login_method = "api"
web_search = "disabled"
approval_policy = "never"
sandbox_mode = "danger-full-access"
model_catalog_json = "<installer-resolved-absolute-path>"

[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/"
wire_api = "responses"
env_key = "DEEPSEEK_API_KEY"
env_key_instructions = "Set DEEPSEEK_API_KEY in the trusted launcher environment."

[tui]
screen_reader_detection_done = true
hide_full_access_warning = true

[projects."<installer-resolved-canonical-project-path>"]
trust_level = "trusted"
```

Compiler 输出机器无关模板；安装器解析实际 `$CODEX_HOME` 后写入绝对 catalog 路径。生成物和安装日志只记录环境变量名，不记录值。
`forced_login_method = "api"` 只存在于 DS41 Profile overlay 中，用于避免第二个进程误用官方订阅身份；默认官方 Codex会话仍使用原有配置与 ChatGPT 登录。
安装器还只在该独立 Profile 中信任本次安装的精确 canonical project root，并预置 TUI 检测状态；这是无头 Leader 避免首次启动确认所必需的项目级绑定，不修改默认配置或信任其他目录。`approval_policy = "never"` 与 `sandbox_mode = "danger-full-access"` 是 OMX Team 写 Git worktree 元数据并连接现有 tmux Unix socket 的运行前提；实测 `workspace-write` 即使增加 writable root 仍拒绝该 socket。该 Profile 属于显式高风险自动化面，只能用于已授权仓库和可信机器，不能把项目级 trust 描述成文件系统沙箱。

OMX Team 还要求启动时 Git workspace 干净。Bridge 必须在创建窗口前检查 tracked 与 untracked 状态；下游项目需要提交或明确管理 Skill、Spec 与批准的 DAG，并按项目策略忽略 `.omx/`、`.omx-pcaom-team-state/` 和安装 receipt 等生成状态。Bridge 不自动修改项目 `.gitignore`。

## 9. 安装器边界

安装器是确定性激活工具，不是 Compiler 或 runtime。它必须：

1. 支持 `--dry-run`；
2. 校验 bundle manifest、目标 project root、Codex Home 和目标版本；
3. 对现存目标文件计算 digest；
4. 仅替换 install manifest 证明由同一 adapter 管理的文件；
5. 对未管理冲突失败关闭；
6. 使用临时文件和原子 rename；
7. 回读并解析 TOML、JSON 和 Skill artifact；
8. 生成可恢复备份和安装报告；
9. 卸载时只删除 digest 与 manifest 匹配的受管文件；
10. 不修改 `~/.codex/config.toml`，不写入 API Key，不自动启动 Codex 或 Team。

## 10. Runtime 拓扑与 UX

```text
tmux session: <project>-<feature>
│
├── window 0: supervisor
│   └── 官方订阅 Codex
│
└── window 1: ds41-team-<slug>
    ├── 左侧主 pane：DS41 Codex Leader
    ├── 右侧 panes：DS41 Codex Workers
    └── 底部 pane：OMX HUD
```

用户只在官方 Codex中调用 `$pcaom-ds41-team`。Skill 负责：

1. preflight：确认处于 tmux、版本匹配、Profile 可读、`DEEPSEEK_API_KEY` 存在、工作树和现有 Team 状态可解释；
2. 写入 `.omx/context/<feature>-<run>.md`，包含 Spec、约束、未知项、touchpoints 和验证命令；
3. 创建 DS41 window，并以 `codex --profile pcaom-ds41` 启动第二个进程；
4. 向 DS41 Leader 环境注入 `OMX_TEAM_WORKER_CLI=codex` 和 `OMX_TEAM_WORKER_LAUNCH_ARGS=--profile pcaom-ds41`；
5. 使用新建、命名、回读校验的 tmux buffer 传递首次 handoff；
6. DS41 Leader 创建/恢复 Ultragoal，并显式启动 OMX Team；
7. 官方 Codex使用本地 `omx team await/status/get-summary` 监控关键事件；
8. Team 终态后，DS41 Leader执行聚合验证、checkpoint 和 shutdown；
9. 官方 Codex重新读取 workspace、diff 和 fresh test evidence，输出 `PASS`、`CHANGES_REQUIRED` 或 blocker。

DS41运行期间，官方 Codex不得并行修改代码或 Ultragoal ledger。用户可以用 tmux window/pane 切换直接观察，但正常 steering 仍从 supervisor 对话发起。

## 11. Supervisor Bridge

Bridge 不创建自己的任务、mailbox 或长期状态。它只提供以下一次性操作：

- `start`：创建窗口、启动 DS41 Leader、完成首次 handoff；
- `status`：读取 Team summary、任务和关键 pane evidence；
- `await`：阻塞等待 OMX wakeable event，不调用模型；
- `steer`：发送带 `message_id` 的结构化指令并等待 ACK；
- `inspect`：捕获 DS41 Leader 或指定 Worker pane；
- `resume`：从现存 OMX config/manifest 重建监督上下文；
- `finalize`：确认 Team 终态、保留 handoff、关闭 Team-owned panes；
- `abort`：只通过 OMX 精确 Team cancellation/shutdown contract 操作当前 run。

当前 OMX `send-message` 实现可以写入命名 mailbox，但“外部 supervisor 身份”不是稳定公开契约。因此 adapter 必须把它标为 experimental，并在 Team 启动后执行双向 round-trip smoke：

1. `supervisor` → `leader-fixed`；
2. DS41 Leader 返回 `ACK:<message_id>`；
3. supervisor mailbox 能读取并标记 delivered；
4. 重复消息被去重。

若 smoke 失败，Bridge 必须显式降级为 tmux named-buffer steering 和人工 pane observation，不得声称 mailbox supervision 可用。

## 12. Token 与监控行为

默认采用事件驱动模式：

- `omx team await`、HUD、tmux capture 和 JSON状态读取不触发模型调用；
- 普通 heartbeat、无变化 timeout 和重复进度不唤醒官方 Codex；
- 只有 `QUESTION`、`BLOCKED`、`FAILED`、story completed、Team completed 或 Human主动查询才触发官方 Codex turn；
- 不提供固定时间间隔的 AI总结；
- 官方 Codex turn结束后不启动 daemon，后续通过 `resume` 或 Human新消息继续监督。

## 13. 失败与恢复

- 不在 tmux：失败并说明必须从 tmux 中启动；不创建伪 Team。
- Profile、API Key、Codex、OMX 或 tmux缺失：preflight 失败，不创建 window。
- DS41 Leader未出现可交互启动证据：关闭本次新建且已证明属于该 run 的 window，保留诊断。
- Team部分启动：按 OMX exact ownership 清理已证明属于该 Team 的 pane，不杀 supervisor。
- mailbox round-trip失败：降级，不提升 runtime status。
- DS41报告架构冲突：输出 `BLOCKED_ARCHITECTURE`，停止依赖实现，交回 Human + 官方 Codex。
- 指令冲突：输出 `BLOCKED_POLICY_CONFLICT`，不覆盖下游人工规则。
- Team有 failed/pending/in-progress task：不得 shutdown 或宣称完成，除非 Human明确 abort。
- 官方 Codex验收失败：返回 `CHANGES_REQUIRED`；复用现有 DS41 Leader或开始新的明确 repair story，不递归启动 Team。

## 14. 状态晋升与验证

```text
generated-unverified
→ config-verified
→ runtime-smoke-verified
→ dogfood-verified
```

### generated-unverified

- bundle、manifest、Profile、model catalog、Skill 和安装器 artifact 已生成；
- 静态契约测试通过；
- 不声明真实模型或 Team 可运行。

### config-verified

- installer dry-run 与实际安装通过；
- Profile/JSON/TOML 可解析；
- `codex --profile pcaom-ds41` 启动 banner 显示 `deepseek-flash`；
- OMX preflight 识别目标版本；
- 未运行真实 Team。

### runtime-smoke-verified

在合成仓库验证：

- 官方 Codex与 DS41 Codex是两个独立进程；
- 同一 tmux session 中的两个 window布局正确；
- DS41 Leader与全部 Worker实际使用 `deepseek-flash`；
- Worker使用独立 worktree；
- status/await/HUD、双向 ACK、steering、阻塞、resume和精确 shutdown通过；
- 无 wakeable event 时没有官方 Codex模型调用；
- DS41完成后官方 Codex能读取 diff并独立运行验收。

### dogfood-verified

至少一个真实下游项目记录 baseline、任务规模、Token、货币成本、wall-clock、人工介入、升级原因、测试结果、review finding和返工。只有重复证据支持时，才把 experimental bridge提升为稳定能力。

## 15. 测试策略

使用现有 Python `unittest` 作为 PCAOM 模板与安装契约测试，不新增第三方测试依赖。

必须覆盖：

- target bundle文件和 metadata完整；
- 不出现密钥值、`experimental_bearer_token` 或旧 `[profiles.*]` 配置；
- Profile只使用 `env_key`，模型名为 `deepseek-flash`；
- target-neutral policy 与 target-specific ownership组合后只有一个 fan-out owner；
- installer dry-run、幂等、冲突拒绝、备份、回读和精确卸载；
- 输入 repo、PCAOM仓库自身和 unmanaged Codex配置不被修改；
- Bridge命令使用精确 team/window/pane identity；
- tmux handoff只使用已回读校验的 named buffer；
- timeout、半启动、mailbox降级、resume和abort失败路径；
- 相同输入、模板和版本生成 byte-equivalent artifact；
- 状态晋升不能越过所需证据。

Runtime smoke 与真实 dogfood 分别记录在 `docs/observations/`，不得由静态测试替代。

## 16. 实施顺序

1. 更新多 target 设计边界，把通用 AGENTS政策与 target-specific execution policy拆开。
2. 增加 adapter metadata、Profile/model catalog和项目 Skill静态模板。
3. 以失败测试锁定 bundle、密钥和唯一 owner契约。
4. 实现独立、非破坏式安装器及其 contract tests。
5. 实现无 daemon 的 Supervisor Bridge一次性命令。
6. 增加半启动、降级、resume、shutdown和回滚测试。
7. 在合成仓库完成 config与 runtime smoke并记录 observation。
8. 选择真实下游项目执行首轮 dogfood；没有证据前不扩大自动化。

Reference Compiler 尚未实现，因此实现不得把静态模板冒充完整 Compiler。首个里程碑是可验证的 target bundle、安装器和人工 semantic compile fixture；后续再接入确定性 profiler、IR validator与 emitter。

## 17. 验收标准

1. PCAOM能为合成下游项目生成完整 target bundle，且不修改输入 repo或用户配置。
2. 安装器能够安全安装、重复运行和精确卸载项目 Skill与用户 DS41 Profile。
3. 下游用户只在官方 Codex中调用 Skill，即可启动同一 tmux session内的 DS41 Leader和 DS41 Workers。
4. 官方 Codex在无事件时不产生监控模型调用；关键事件可被读取、回复并取得 ACK。
5. DS41 Leader是执行期间唯一 Ultragoal和 fan-out owner；官方 Codex在 Team完成后独立验收。
6. 任一未验证能力、降级路径、版本偏差和未执行检查都出现在 manifest与 compile report。
7. 所有完成声明由最新测试、runtime state和 observation支持，不由配置文件或模型输出文字替代。
