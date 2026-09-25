# PCAOM Compiler-Owned Generated Policy

The Compiler owns this file. Do not edit the generated policy directly. Change
project-owned instructions, architecture inputs, or PCAOM configuration and
recompile when the generated policy needs to change.

## Authority and Ownership

System instructions, safety requirements, and host permission boundaries have
the highest authority. Human-maintained project rules retain their native scope
and precedence, including root, scoped, and local instruction files. This
generated policy provides defaults and does not silently override project rules
or change the host's instruction loading behavior.

Human owns product scope and architecture.

## Feature Design

Before feature design, Codex must read the project-owned instructions, this
generated policy, approved architecture and product documents, and relevant code
and tests. Read the usage guide recorded in the project manifest when present;
the minimum design contract below applies even without a separate guide.

Every non-trivial feature requires a Human-approved `FEATURE_SPEC.md` before
implementation. It must state the goal and user value, scope and non-goals,
architecture impact, constraints, dependencies, assumptions, risks, blockers,
acceptance criteria, and exact verification commands. The Spec describes the
current requirement; it cannot change long-lived policy or architecture
ownership. Reuse the project Profile unless a material project-level change or
repeated failures supported by dogfood evidence justify recompilation.

## Execution Plane

Use Codex directly for small, bounded work, OMX for ambiguous or quality-first
exploration, and DSH for implementation from an approved Spec. DeepSeek is the
default DSH worker. DSH is the only execution-plane fan-out owner within DSH
execution; delegated experts must not start competing orchestration. Do not nest
OMX and DSH without evidence of benefit, explicit ownership, cost bounds, and a
recovery path. These are policy requirements, not claims of runtime enforcement.

## Codex Escalation

Escalate difficult concurrency or state consistency, security-sensitive work,
cross-core-module changes, or repeated reasonable failures on the same defined
problem to Codex as a bounded one-shot task. Supply the question, constraints,
workspace scope, acceptance criteria, and evidence, including failed attempts.

After Codex returns, DeepSeek must re-read the workspace and diff and independently
run the required verification commands. Provider text is not proof of successful
execution or acceptance.

## Blockers

Report `BLOCKED_ARCHITECTURE` and stop dependent implementation when scope or
architecture needs revision; return the decision to Human + Codex instead of
redesigning it in the execution plane. Report `BLOCKED_POLICY_CONFLICT` and stop
dependent work when applicable instructions conflict and their priority cannot
be resolved. Do not silently override or delete project-owned instructions.
Reporting a blocker does not prove the runtime Goal was paused; use supported
host controls for runtime state changes.

## Completion and Final Review

Review the final diff against the approved Spec. Provide the final diff, fresh
verification commands and exit codes, test results, remaining verification gaps,
and the Codex verdict. Run applicable lint, typecheck, build, and smoke checks;
explain unavailable checks. Static checks do not establish runtime or dogfood
success.

Codex performs final review against the approved Spec and fresh evidence and
returns `PASS` or `CHANGES_REQUIRED`. For `CHANGES_REQUIRED`, DSH fixes the scoped
issues and reruns verification before requesting another review. Human retains
business acceptance and approval of material scope or architecture changes.
