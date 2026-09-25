# PCAOM AGENTS.md 分层与融合设计

**状态：** 设计已批准；AGENTS Foundation V0（根 AGENTS 及下游静态模板与契约）已实现并验证；确定性 Reference Compiler 合并发射器与真实项目 dogfood 仍待完成。

## 1. 目标

PCAOM 需要同时维护两类 Agent operating contract：

1. PCAOM 仓库自己的根 `AGENTS.md`，用于约束本仓库的方法论、Compiler、Profile、文档、验证和 dogfood 开发；
2. PCAOM Compiler 面向其他研发项目生成的项目执行政策，用于把通用工作流适配到具体项目，同时保留项目已有规则和自治空间。

两者共享 Human ownership、Think / Execute / Escalate / Verify、证据优先和单一 fan-out owner 等原则，但不得共用同一个不可区分的模板。

## 2. 非目标

- 不让 PCAOM 覆盖或接管项目已有的完整 `AGENTS.md`；
- 不把每个需求的内容写入项目级长期规则；
- 不用 `FEATURE_SPEC.md` 绕过项目架构、安全或验证要求；
- 不开发新的 Agent runtime、规则数据库或在线 policy service；
- 不假设 Agent 会自动展开普通 Markdown 链接并读取被引用文件；
- 不在规则冲突时静默选择任意一方。

## 3. 两类 AGENTS.md 的职责

### 3.1 PCAOM 仓库根 AGENTS.md

根 `AGENTS.md` 是开发 PCAOM 本身时的控制入口，而不是面向所有项目的通用模板。它负责：

- 声明 PCAOM 的目标、V0 边界和 Human architecture ownership；
- 建立仓库资料的 source-of-truth 映射；
- 对进入仓库的工作做任务分类和最小上下文路由；
- 规定 Codex、OMX、DSH 和 DSH Codex subagent 的使用边界；
- 区分项目级低频编译与需求级高频 `FEATURE_SPEC.md`；
- 规定状态晋升、验证证据和文档同步纪律；
- 保护固定 DSH revision、Profile 能力边界和不可伪造的运行状态；
- 约束 dogfood、benchmark 和真实仓库数据外发。

根文件保持短小，主要提供规则、入口和权威路径，不复制完整研究材料。

### 3.2 下游项目的 PCAOM 生成政策

Compiler 为下游项目生成完整政策文件：

```text
.pcaom/AGENTS.generated.md
```

该文件由 Compiler 拥有，包含项目特化后的：

- Human、Codex、DSH 和 DeepSeek 职责；
- 需求设计入口和 `FEATURE_SPEC.md` 契约；
- 执行面选择和 fan-out ownership；
- Codex bounded escalation 条件；
- `BLOCKED_ARCHITECTURE`、`BLOCKED_POLICY_CONFLICT` 和停止条件；
- 测试、完成证据和最终验收协议；
- 项目技术栈、目录、命令、风险和成本相关控制；
- 每项控制的来源、触发条件、验证与移除条件。

项目人工不得直接编辑该生成文件；需要改变生成内容时，应修改项目输入、项目人工规则或 PCAOM 配置后重新编译。

## 4. 融合方案

采用“独立生成文件 + 根 AGENTS 托管块”的混合方案。

### 4.1 项目已经存在 AGENTS.md

Compiler 保留人工内容，只在根 `AGENTS.md` 中插入或更新一个边界明确的托管块：

```markdown
<!-- PCAOM:START -->
## PCAOM Execution Policy

For PCAOM feature design or DSH execution, read and follow:

- `.pcaom/AGENTS.generated.md`
- the approved project architecture documents
- the current `FEATURE_SPEC.md`

Human-maintained project rules outside this block take precedence over
PCAOM-generated defaults. Report `BLOCKED_POLICY_CONFLICT` instead of silently
overriding a conflict.
<!-- PCAOM:END -->
```

托管块只负责可靠地把生成政策加入 instruction chain，不承载完整生成内容。

### 4.2 项目不存在 AGENTS.md

Compiler 创建一个最小的人类可维护根 `AGENTS.md`，包括：

- 文件用途和人工所有权说明；
- PCAOM 托管块；
- 预留的项目人工规则区。

生成后，托管块之外的内容立即归项目所有。后续重编译仍只允许修改托管块。

### 4.3 Scoped AGENTS 和本地 Overlay

项目可以继续维护子目录 `AGENTS.md`、`AGENTS.local.md`、工具配置和团队特殊规则。PCAOM V0 不创建或接管 `AGENTS.local.md`，避免占用项目现有的本地覆盖机制。

Compiler 在 profiling 阶段记录这些规则的存在和作用域；已知冲突进入 compile report，而不是通过删除或重写解决。

## 5. 权威顺序

下游项目采用以下语义优先级：

```text
系统、安全和宿主权限边界
  ↓
项目人工维护的 AGENTS 规则
（根文件与 scoped/local 文件继续遵循宿主原生作用域和优先级）
  ↓
PCAOM 生成的项目默认政策
  ↓
当前 FEATURE_SPEC.md
```

该顺序表达 policy authority，不改变宿主本身的实际 instruction loading 顺序，也不重新定义根规则与 scoped/local 规则之间的原生覆盖关系。生成政策必须主动承认人工项目规则优先；`FEATURE_SPEC.md` 只能确定本次需求，不能修改长期项目规则或架构所有权。

## 6. 需求设计协议

根托管块和生成政策共同要求：执行需求设计前，Codex 读取：

1. 项目人工 `AGENTS.md` 规则；
2. `.pcaom/AGENTS.generated.md`；
3. 项目架构和产品资料；
4. `docs/methodology/codex-omx-dsh-usage-guide.md` 或项目中由 manifest 明确记录的等价指南；若项目不携带独立指南，generated policy 必须包含完成需求设计所需的最小契约；
5. 相关代码和测试事实。

Codex 生成或更新 `FEATURE_SPEC.md`，至少包含：

- goal 和用户价值；
- scope 与 non-goals；
- architecture impact；
- constraints 和依赖；
- acceptance criteria；
- verification commands；
- risks、assumptions 和 blockers。

架构存在冲突时输出 `BLOCKED_ARCHITECTURE`；政策存在无法确定优先级的冲突时输出 `BLOCKED_POLICY_CONFLICT`。两者都不得通过执行面自行重新设计来绕过。

## 7. 重编译与安全写入

Compiler 更新项目规则时必须：

1. 定位零个或一个完整的 `PCAOM:START` / `PCAOM:END` 块；
2. 保留托管块外所有字节和项目文件结构；
3. 原子写入 `.pcaom/AGENTS.generated.md` 和托管块；
4. 在 `.pcaom/compile-report.md` 记录选择、冲突和未采用控制；
5. 重新读取输出并运行结构验证；
6. 只有全部验证通过才更新 manifest 状态。

以下情况 fail closed，不修改现有文件：

- marker 缺失一半、顺序错误或出现多个托管块；
- 现有人工规则与必需安全控制直接冲突；
- 无法证明目标文件属于当前项目；
- 输入架构、团队政策或运行能力信息不足；
- 写入过程中无法保持托管块外内容不变。

卸载 PCAOM 时只删除已证明属于 PCAOM 的托管块和 `.pcaom` 生成物，不删除人工内容。

## 8. PCAOM 根 AGENTS.md 建议结构

实施阶段的根文件按以下结构组织：

1. Project Purpose and Boundaries
2. Source-of-Truth Map
3. Human / Codex / DSH Ownership
4. Task Classification and Context Routing
5. Feature Spec Design Contract
6. Execution Plane Selection
7. Escalation and Architecture Blockers
8. Verification and Status Promotion
9. Documentation Synchronization
10. Data, Credential and External-Model Boundaries
11. Repository-Specific Non-Goals

它引用现有指南和设计文档，不复制长篇说明。

## 9. 验收标准

- PCAOM 根 `AGENTS.md` 能指导新会话找到正确资料并区分研究、Compiler、Profile、需求设计和 dogfood；
- 对已有根 `AGENTS.md` 的样例项目进行编译后，人工内容逐字节保持不变；
- 对无根 `AGENTS.md` 的样例项目生成最小 wrapper 和独立 generated policy；
- 重编译只更新托管块与 `.pcaom` 生成物；
- malformed marker、重复 marker 和必需规则冲突均 fail closed；
- scoped `AGENTS.md`、`AGENTS.local.md` 和其他项目配置不被覆盖；
- `FEATURE_SPEC.md` 不能修改长期项目规则的 authority；
- 输出能够说明每项生成控制的来源、原因、成本、验证和移除条件；
- 静态测试不被描述成 runtime 或 dogfood 证据。

## 10. 实施顺序

1. 编写 PCAOM 仓库根 `AGENTS.md`；
2. 建立下游 wrapper、托管块和 generated policy 模板；
3. 为已有/缺失/malformed `AGENTS.md` 编写契约测试；
4. 在 Reference Compiler 中实现非破坏式 merge emitter；
5. 使用合成项目验证重编译幂等性；
6. 在获得数据授权的真实项目中 dogfood。
