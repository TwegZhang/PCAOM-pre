# Larry DSH Headless Profile V0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 生成一个仓库内、版本固定、可审查但明确尚未运行验证的 Larry DSH Headless Base Profile V0。

**Architecture:** Profile 以 `templates/larry-dsh-headless/` 保存 DSH 原生 `package.json`、`cordis.patch.yml` 和 Larry 执行 policy；`pcaom-target.json` 单独记录 PCAOM adapter 状态和固定上游 revision。静态测试锁定官方组合结构和安全边界，真实 DSH dump/smoke test 留给安装后的集成阶段。

**Tech Stack:** JSON、YAML、Markdown、Python 标准库 `unittest`；不新增依赖，不安装 DSH。

---

### Task 1: 锁定 Profile artifact contract

**Files:**
- Create: `tests/test_larry_dsh_profile.py`

- [x] **Step 1: 写失败的静态契约测试**

测试必须读取 `templates/larry-dsh-headless/`，并断言：

- `package.json` 只将 `@deepseek-ai/dsh-subagent-codex` 固定为 `0.1.5-rc.3`，bundle 顺序为 base、headless、Codex；
- `cordis.patch.yml` 与官方 headless 组合样例完全一致；
- `pcaom-target.json` 固定 runtime revision、CLI version 和 `generated-unverified` 状态；
- Team、Schedule 和 saved workflow 未启用；
- `EXECUTION_POLICY.md` 包含单一 fan-out owner、Codex final-text-only、DSH 重新验证、架构 blocker 和 human-root-turn Goal 边界；
- `README.md` 明确 `$DSH_HOME/profiles/larry-dsh-headless` 部署位置及 dump/schema/smoke 验证步骤。

- [x] **Step 2: 运行测试并确认因文件不存在而失败**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_larry_dsh_profile.py' -v
```

Expected: FAIL，首个错误为缺少 `templates/larry-dsh-headless/package.json`。

### Task 2: 生成 Base Profile V0

**Files:**
- Create: `templates/larry-dsh-headless/package.json`
- Create: `templates/larry-dsh-headless/cordis.patch.yml`
- Create: `templates/larry-dsh-headless/pcaom-target.json`
- Create: `templates/larry-dsh-headless/EXECUTION_POLICY.md`
- Create: `templates/larry-dsh-headless/README.md`

- [x] **Step 1: 写 DSH Profile manifest**

使用 DSH CLI 实际生成的 `dsh-profile-larry-dsh-headless` 名称、`private: true`、`patchReload: startup`、Codex provider `0.1.5-rc.3`，以及固定 bundle 顺序。base/headless 不重复加入 dependencies，因为官方 CLI in-box resolution 优先使用正在运行的 DSH installation。

- [x] **Step 2: 写 Codex provider/tool patch**

配置 `providerName: codex`、`permissionMode: never`、`toolName: subagent_codex`、`backgroundMode: one-shot` 和 `maxDepth: provider-managed`。不添加 Team、Schedule、Web 或自定义 workflow 配置。

- [x] **Step 3: 写 PCAOM target metadata**

记录固定仓库 revision、`@deepseek-ai/dsh@0.1.5-rc.3`、Profile 安装位置、能力状态和 `generated-unverified`。该文件不是 DSH 原生配置。

- [x] **Step 4: 写执行 policy**

定义 Feature Spec 输入、DeepSeek 默认执行、DSH 唯一 fan-out ownership、Codex bounded escalation、最终文本返回契约、重新读取 diff/测试、`BLOCKED_ARCHITECTURE` 行为以及完成证据。

- [x] **Step 5: 写部署与验证说明**

明确 Git 模板不会被 DSH 从当前目录自动发现。说明复制到 `$DSH_HOME/profiles/larry-dsh-headless`、安装 Profile dependency、运行 `--dump-config` 和最小 smoke test 的顺序；说明 `0.1.5-rc.3` 不提供 `--dump-config-schema`，并明确项目 policy 需由 Compiler 写入项目级 `AGENTS.md`；所有运行验证完成前保持未验证标签。

- [x] **Step 6: 运行静态测试并确认通过**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_larry_dsh_profile.py' -v
```

Expected: PASS，所有 Profile contract 测试通过。

### Task 3: 接入项目文档并验证

**Files:**
- Modify: `README.md`
- Modify: `docs/superpowers/plans/2026-09-19-pcaom-v0.md`
- Modify: `docs/superpowers/plans/2026-09-25-larry-dsh-headless-profile-v0.md`

- [x] **Step 1: 增加 Profile 入口和状态**

README 链接 `templates/larry-dsh-headless/README.md`，明确 Base Profile V0 已生成但尚未执行 DSH smoke test。

- [x] **Step 2: 更新 Phase 3 进度**

在主 phased plan 记录 Base Profile V0 静态模板完成；不勾选 Reference Compiler、DSH 安装或 dogfood。

- [x] **Step 3: 运行完整文档与结构检查**

Run:

```bash
python3 -m unittest discover -s tests -p 'test_larry_dsh_profile.py' -v
python3 -m json.tool templates/larry-dsh-headless/package.json
python3 -m json.tool templates/larry-dsh-headless/pcaom-target.json
```

Expected: tests PASS；两个 JSON 文件均解析成功。

- [x] **Step 4: 检查未验证边界**

Run:

```bash
rg -n 'generated-unverified|developer preview|未.*验证|not.*verified' templates/larry-dsh-headless docs/research/dsh-capability-study.md
```

Expected: Profile metadata、README 和研究文档均保留未验证说明。

本仓库没有初始 commit/HEAD，因此本计划不创建部分初始提交；完成后保留工作区文件供统一初始化版本历史。
