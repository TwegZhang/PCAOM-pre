# PCAOM Project Instructions

## Project Purpose and Boundaries

This file governs development of PCAOM itself, not downstream projects. PCAOM compiles project facts, architecture, team policy, risk, cost constraints, and evidence-backed practices into a minimal project operating contract.

Human owns product scope and architecture. PCAOM must not reimplement an agent runtime, workflow engine, mailbox, scheduler, or model provider already supplied by Codex, OMX, or DSH. Larry DSH is a compilation target, not PCAOM itself.

## Source-of-Truth Map

Read the relevant sources explicitly before acting; links alone do not load context.

| Source | Authority |
| --- | --- |
| `README.md` | Project purpose, current state, and entry points |
| `docs/methodology/compiler-contract-v0.md` | Compiler inputs, outputs, invariants, and V0 acceptance |
| `docs/methodology/codex-omx-dsh-usage-guide.md` | Operational workflow and feature-to-execution handoff |
| `docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md` | Project Profile versus feature Spec design and ownership |
| `docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md` | PCAOM root versus downstream generated policy and managed-block boundaries |
| `docs/research/dsh-capability-study.md` | Version-specific DSH capability evidence and limitations |
| `templates/larry-dsh-headless/README.md` | Concrete Profile installation, pinned runtime, and smoke boundary |
| `templates/codex-omx-ds41-supervised-team/README.md` | DS41 bundle, installer, Skill/Bridge commands, pinned behavior and unverified capabilities |
| `docs/superpowers/specs/2026-09-26-pcaom-codex-omx-ds41-supervised-team-design.md` | Approved DS41 topology; implementation limits are recorded in the bundle and Skill |
| `experience/README.md` | Experience Library schema, evidence grades, and compiler-use rules |
| `docs/observations/` | Recorded commands, environments, results, failures, and verification gaps |

Report conflicting sources and preserve the narrower verified fact. Distinguish approved design, capability evidence, and observed runtime behavior; do not silently treat one as proof of another.

## Ownership

- Human owns product scope, architecture, approval of material changes to them, policy exceptions, and business acceptance.
- Codex handles high-value requirements, architecture work with Human, bounded escalation, and final review against the approved Spec and fresh evidence.
- For explicitly selected `larry-dsh-headless`, DSH + DeepSeek implements the approved `FEATURE_SPEC.md`. DSH is the only execution-plane fan-out owner within Larry execution; delegated experts do not start competing orchestration.
- For explicitly selected `codex-omx-ds41-supervised-team`, DS41 Leader alone owns Ultragoal, Team lifecycle, execution writes through its lanes, and aggregate verification. Official Codex designs, steers, and independently reviews. Official Codex must not edit code while DS41 Team is active or write its Ultragoal ledger.
- Maintain exactly one execution-plane fan-out owner. Never nest Larry DSH and DS41 Team or activate both for one task tree. Switching requires explicit handoff after the existing runtime reaches a terminal state.

## Task Classification and Context Routing

Classify the task and load the smallest relevant context before changes:

- Methodology/compiler: compiler contract, relevant design, and affected outputs.
- DSH Profile/capability: capability study, Profile files, pinned runtime facts, and observations.
- DS41 target: bundle README, approved target design, installed Skill contract, pinned bridge behavior, and observations; do not activate downstream templates in PCAOM itself.
- Experience Library: its schema, evidence grades, and the supporting observation.
- Feature design: usage guide, applicable project instructions, approved architecture/product documents, and relevant code/tests; consult the layering design for generated-policy changes.
- Dogfood/benchmark: baseline, comparison scope, data authorization, measurements, and observation records.
- Implementation: approved Spec where required, applicable instructions, relevant code/tests, and exact verification commands.

## Feature Spec Design Contract

Every non-trivial feature must receive an approved `FEATURE_SPEC.md` before implementation.

`FEATURE_SPEC.md` must identify goal and user value, scope and non-goals, architecture impact, constraints, dependencies, assumptions, risks, acceptance criteria, and exact verification commands. It describes the current requirement; it does not change architecture or long-lived policy.

Normally reuse the project Profile. Recompile only for material project-level changes or repeated failures supported by dogfood evidence. Unresolved architecture or policy conflicts block dependent execution.

## Execution Plane Selection

Use Codex directly for small, clear work; OMX for ambiguous or quality-first exploration. For approved-Spec implementation, explicitly select Larry DSH or Codex + OMX + DS41, subject to context-transfer authorization. Use Team only when work is independent and coordination benefit justifies its cost. A stronger model does not itself justify more orchestration; record the trigger and expected benefit for either escalation.

## Escalation and Blockers

Escalate to Codex as a bounded one-shot task for difficult concurrency/state consistency, security-sensitive problems, cross-core-module changes, or repeated reasonable attempts failing on the same defined problem. Supply the question, constraints, workspace scope, acceptance criteria, and evidence.

After delegation, DeepSeek must re-read the workspace and diff and independently run the required tests; final text from the provider is not complete execution evidence.

Report `BLOCKED_ARCHITECTURE` and stop dependent implementation when product scope or architecture needs revision; return the decision to Human + Codex. Report `BLOCKED_POLICY_CONFLICT` when instructions conflict and their priority cannot be resolved. Do not silently overwrite project-owned instructions. Reporting a blocker does not prove the runtime Goal was paused; use only supported host/user controls for that state change.

## Verification and Status Promotion

Require fresh evidence for completion and each promotion:

`generated-unverified` -> `config-verified` -> `runtime-smoke-verified` -> `dogfood-verified`

Generated artifacts start unverified. Configuration checks establish only configuration validity. Runtime smoke requires actual execution on the recorded runtime/Profile; dogfood requires a real project task with acceptance, quality, cost, and intervention evidence. Preserve pinned versions and capability-specific limits; a verified capability does not verify all runtime features.

Record commands, environment/version, results, and gaps in `docs/observations/`. Run targeted tests and applicable lint/type/build checks for changed behavior; explain unavailable checks. Do not claim runtime success from static tests.

## Documentation Synchronization

Update the smallest authoritative set affected by a change and keep references and status claims consistent. Refer to research rather than copying it into this contract. Preserve historical failures as superseded evidence with links to the later result; do not erase them or retroactively mark them successful.

## Data and Credential Boundaries

Do not externally transfer real repositories or private artifacts without authorization covering that transfer. Prefer synthetic fixtures for testing and benchmarks. Never record keys, tokens, or other credentials in source, logs, observations, or shared artifacts.

## Repository-Specific Non-Goals

- Do not reimplement an agent runtime.
- Do not silently overwrite project-owned instructions.
- Do not claim runtime success from static tests.
- Do not claim unsupported DSH capabilities or treat prompt policy as runtime enforcement.
- Do not add orchestration or policy complexity without dogfood evidence of a concrete need.
