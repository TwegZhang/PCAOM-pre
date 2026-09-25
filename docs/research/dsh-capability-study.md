# DeepSeek Harness Capability Study

**核实日期：** 2026-09-25

**固定上游版本：** `deepseek-ai/deepseek-harness@477b4f420553e8a52c2fbccc464d7561b239c443`

**状态：** 官方项目仍标为 developer preview；以下结论只对该 revision 负责。

## 本机运行基线

2026-09-25 在目标 Mac 上执行 `npm install -g @deepseek-ai/dsh@latest`，registry 实际安装 `@deepseek-ai/dsh@0.1.5-rc.3`。对应官方 tag 是 `dsh-v0.1.5-rc.3`，revision 为 `a4c74a91e06b00fe0b0937bde982170c526cc842`。CLI 内置 base/headless bundle 也是 `0.1.5-rc.3`；匹配的 Codex provider `0.1.5-rc.3` 可从 npm 获取，且已检查其 tarball 中的 provider patch 和 one-shot 配置字段。

因此 Larry V0 运行模板固定到 `0.1.5-rc.3`。本文件其余章节保留 `0.1.7-rc.2` 官方源码快照，用于记录较新能力边界；它不是当前本机 Profile 的运行版本。

## 身份与结论

DSH 指 DeepSeek 官方 [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness)，官方文档由仓库 README 指向 [deepseek-harness.github.io](https://deepseek-harness.github.io/deepseek-harness/)。

Larry 项目级 Profile 的组合路线成立：V1 可以优先依赖官方 bundle、Profile、YAML patch、Preset 和说明性 policy，暂不开发新的 runtime。现有设计必须同时承认 developer preview、experimental Team、Workflow 无持久恢复，以及 Codex provider 的 one-shot 返回边界。

## 已核实能力

| 能力 | 固定 revision 下的事实 | PCAOM 设计含义 |
|---|---|---|
| Profile | `dsh larry-dev` 等价于 `dsh --profile larry-dev`；Profile 通过 `package.json` 的 `dsh.profile.bundles` 和 `cordis.patch.yml` 组合。 | Larry Base Profile 可以是 Git 中的固定 DSH Profile。 |
| YAML patch | 加载顺序为 bundles → profile patch → home patch → CLI `--patch`；覆盖配置时替换完整 config，不做深合并。 | Project Overlay 必须按 DSH 覆盖语义生成，不能假设递归 merge。 |
| Agent Preset | `@deepseek-ai/dsh-agent-preset` 通过 YAML 显式声明；`config.id` 和 `plugins` 必需。 | leader/worker/reviewer 必须成为显式 preset ID 和 plugin 绑定，不能只创建目录等待自动发现。 |
| Goal | 单 Session 一个持久目标；Goal 自身不调度。恢复 Session 后 continuation 为 disarmed，需要显式 resume。create/edit/pause/resume 要求当前 root turn 中有直接 human message；自主 goal round 只能进入 complete/blocked，blocked 默认还受轮次门槛约束。 | long-task policy 必须写明恢复和人工控制边界，不能承诺 Agent 自主立即 pause 或自动续跑。 |
| Team + Mailbox | 官方包为 `@deepseek-ai/dsh-experimental-agent-team` 和对应 tool 包；Team、任务板和内部消息队列可持久化，但仍是 experimental。共享 workspace、单进程，write scope 只警告、不加锁。 | Team 默认关闭；Mailbox 只作为 Team 内部能力；Profile 必须自行约束文件 ownership 和聚合验证。 |
| Workflow | 执行模型提交的 plain JavaScript，支持 agent/parallel/pipeline；无 saved workflow、checkpoint/resume 或跨子任务 token budget。 | `workflows/execute` 等只能是 Larry policy/template，不能冒充 DSH 原生可保存 YAML workflow。 |
| Schedule | 是 Session follow-up 提醒；需要 Host Web Session controller 和持久层，不能独立用于 headless/SDK-only。 | V0 headless 执行不依赖 Schedule；它不是 workflow 恢复器。 |
| Codex provider | 官方包为 `@deepseek-ai/dsh-subagent-codex`；bundle 安装 provider 后仍需启用 delegation tool。 | Codex escalation 可以使用官方 provider，但必须显式配置 provider、preset 和 tool。 |

官方证据：

- [CLI Profile](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/apps/cli/README.md#L9-L48)
- [配置覆盖顺序](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/apps/cli/reference/README.md#L7-L17)
- [Agent Preset](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/preset/agent-preset/README.md#L26-L48)
- [Goal](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/goal/goal/README.md#L12-L72)
- [Experimental Team](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/experimental/agent-team/README.md#L12-L79)
- [Workflow 与限制](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/workflow/workflow/README.md#L26-L57)
- [Workflow 无持久恢复](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/workflow/workflow/README.md#L125-L131)
- [Schedule](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/schedule/schedule/README.md#L12-L37)
- [Codex provider](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/subagent/subagent-codex/README.md#L28-L78)

## Codex delegation 边界

固定 revision 的官方实现使用 bundle 自带兼容 payload 和 Codex app-server。每次调用创建 fresh process、thread 和 turn；不支持 continuation、resume 或 pooling，也没有本机 PATH CLI fallback。

原生 Codex 配置和认证仍有效。Profile 可以配置 model、environment 和 `permissionMode`，但单次调用不能动态选择 model。`permissionMode` 默认 `never`，其他模式必须显式配置。

provider 只返回最终文本或安全错误，不自动返回 diff、tool trace、usage，也不提供 wall-clock timeout 或变更 rollback。因此：

1. escalation task 必须是 bounded one-shot；
2. 返回契约必须要求结论、修改摘要和验证证据出现在最终文本；
3. DSH leader 必须独立读取共享工作区 diff 并运行验证；
4. 成本记录允许将 provider usage 标为 `unavailable`；
5. 不能依赖 Codex provider 自动恢复或回滚失败修改。

官方证据：[执行与安全边界](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/subagent/subagent-codex/README.md#L100-L115)、[限制](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/subagent/subagent-codex/README.md#L170-L180)。该 revision 的 provider 源码版本为 `0.1.7-rc.2`，依赖 `@openai/codex 0.153.4`；未核实 npm 发布状态。[package.json](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/subagent/subagent-codex/package.json#L1-L47)

## Larry target 最小可依赖 contract

以下是 PCAOM adapter contract，不是 DSH 官方 schema：

```yaml
runtime_ref:
  repository: deepseek-ai/deepseek-harness
  revision: 477b4f420553e8a52c2fbccc464d7561b239c443
  maturity: developer-preview
profile:
  name: larry-dev
  ordered_bundles: []
  patch_semantics: replace-complete-config
presets: []
capabilities: []
codex_delegation:
  provider: "@deepseek-ai/dsh-subagent-codex"
  permission_mode: never
  return_contract: final-text-only
evidence_contract:
  workspace_diff: required
  test_results: required
  reviewer_verdict: required
  provider_usage: unavailable
recovery:
  goal_resume: explicit-human-root-turn
  goal_pause: explicit-human-root-turn
  workflow_resume: unsupported
  schedule: optional-web-only
policy_enforcement:
  prompt_guidance: []
  runtime_enforced: []
```

`policy_enforcement` 必须区分软性 prompt/policy 与 runtime 强制机制。V1 可以保持零自研 TypeScript，但不能宣称已经具备确定性的“两次失败强制升级”、Agent 自主立即 pause Goal、自动阶段门禁或全流程重启恢复。

## V0 headless Profile 组合样例

以下片段按官方结构组合，尚未经过本机安装和启动验证。它是 PCAOM V0 候选模板，不是上游原样发布的 Larry Profile。

`package.json`：

```json
{
  "name": "larry-dev",
  "private": true,
  "dependencies": {
    "@deepseek-ai/dsh-subagent-codex": "0.1.5-rc.3"
  },
  "dsh": {
    "profile": {
      "bundles": [
        "@deepseek-ai/dsh-base",
        "@deepseek-ai/dsh-headless",
        "@deepseek-ai/dsh-subagent-codex"
      ]
    }
  }
}
```

`cordis.patch.yml`：Codex bundle 已注册 Host provider，Larry 只配置 provider 并挂载 delegation tool。

```yaml
- id: subagent-codex
  config:
    providerName: codex
    permissionMode: never

- insert:
    - id: tool-subagent-codex
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: codex
        toolName: subagent_codex
        backgroundMode: one-shot
        maxDepth: provider-managed
```

省略 `model` 表示遵循原生 Codex 配置。由于 patch 会替换完整 config，上述片段只能用于已核实的 base + headless composition；不能直接复制到 Web preset。当前模板使用与本机 CLI 匹配的 `0.1.5-rc.3` provider；配置字段已从该版本 npm tarball复核。

官方结构来源：[Base Profile manifest](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/bundle/base/README.md#L30-L46)、[Codex provider patch](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/subagent/subagent-codex/cordis.patch.yml#L1-L5)、[Codex tool 配置](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/subagent/subagent-codex/README.md#L42-L78)。

Web target 必须作为单独模板处理：复制官方完整 `standard.patch.yml`，修改外层 row ID、`config.id`，并在原 delegation group 中启用 Codex tool；不能用局部 `config.plugins` 覆盖完整 preset。[官方 standard preset](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/bundle/web-app/presets/standard.patch.yml)、[Codex tool 原位置](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/bundle/web-app/presets/standard.patch.yml#L103-L110)。V0 不生成 Web target。

## 候选初始化与检查命令

以下命令已按本机 `0.1.5-rc.3` CLI 调整；该版本不提供 `--dump-config-schema`：

```sh
dsh --profile larry-dev --from-default-profile headless --dump-config
dsh plugin --profile larry-dev add @deepseek-ai/dsh-subagent-codex
dsh --profile larry-dev --dump-config
dsh --profile larry-dev "读取 FEATURE_SPEC.md，按项目规则执行并报告验证结果"
```

Profile 模板至少通过 `--dump-config`、只读任务和 Codex delegation smoke test 后，才能从“文档组合样例”升级为“本机验证配置”。项目执行政策必须编译进项目级 `AGENTS.md`；Profile 目录里的独立 policy 文件不会被 DSH 自动加载。

## 未核实项

- 本机已经安装 `@deepseek-ai/dsh@0.1.5-rc.3`，并生成 `larry-dsh-headless` Profile；运行 smoke test 前仍不声明模型路由成功。
- `@deepseek-ai/dsh-subagent-codex@0.1.5-rc.3` 已从 npm 安装到该 Profile。
- 真实 SSH + tmux 环境中的合成项目 smoke test 已通过：DeepSeek 执行、项目级 `AGENTS.md` 注入和一次 bounded `subagent_codex` 调用均成功。Codex 受控命令 runner 曾出现的 `MISSING_CREDENTIAL` 未在真实 SSH 环境复现，不作为 Profile 失败证据。详见 `docs/observations/2026-09-25-larry-dsh-runtime-smoke.md`。尚未验证真实项目写入后复核、Goal 恢复或 Team。
- 未获得真实模型成本、usage、配额和任务质量数据。
- `AGENTS.md` 或 Larry policy 如何注入 DSH preset 仍需由真实配置和 smoke test确认。
