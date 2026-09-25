# Larry DSH Headless Execution Policy V0

**Status:** Profile runtime components are `runtime-smoke-verified`; this complete policy has not yet been exercised by a real-project dogfood task.

This file is a compiler policy source, not a DSH auto-loaded Profile file. The Reference Compiler renders the applicable rules into the target project's `AGENTS.md`, which DSH loads as part of its project instruction chain.

## Ownership

- Human owns product scope, architecture and business acceptance.
- Codex owns high-value specification, bounded expert escalation and final review.
- DSH is the execution plane. Its DeepSeek leader is the **唯一 fan-out owner** for the current feature task tree.
- DeepSeek is the default implementation and verification worker.
- V0 does not enable experimental Team, Schedule, Web presets or saved workflows.

## Required Inputs

Execution starts only when the workspace contains an approved `FEATURE_SPEC.md` with goal, scope, non-goals, architecture impact, constraints, acceptance criteria and verification requirements.

The project-level PCAOM Profile and Overlay define how agents work. `FEATURE_SPEC.md` defines what the current iteration must deliver. A feature does not recompile the project Profile by default.

## Default Execution Loop

1. Read `FEATURE_SPEC.md`, project policy and relevant repository facts.
2. Explore the smallest sufficient code and test surface.
3. Implement with DeepSeek using a single agent by default.
4. Run the smallest check that proves the changed behavior, then the broader checks required by impact and acceptance criteria.
5. Record commands, exit codes and concise result evidence.
6. Request Codex final review when the feature policy requires it.
7. Report `PASS`, `CHANGES_REQUIRED` or an explicit blocker.

## Codex Escalation

Codex escalation is a **bounded one-shot** task, not a transfer of the long-running leader role. Appropriate triggers include complex concurrency or state consistency, security-sensitive behavior, changes across core architecture boundaries, and repeated reasonable failure on the same well-defined problem.

Each escalation request must include:

- the bounded question or requested change;
- relevant acceptance criteria and architecture constraints;
- files or symbols already investigated;
- attempts made and their evidence;
- the exact result expected from Codex.

The official provider is treated as **final-text-only**. Its response must summarize conclusions, modifications and verification evidence, but that text is not sufficient proof. After every Codex task, the DeepSeek leader must **重新读取工作区 diff**, inspect affected files and run the required tests independently.

## Architecture Blocker

If execution reveals a product-scope or architecture defect rather than an implementation problem:

1. stop further implementation in the affected branch;
2. report `BLOCKED_ARCHITECTURE` with evidence and the decision required;
3. do not redesign the architecture inside the execution plane;
4. wait for Human + Codex to issue a revised Spec.

Current DSH Goal create/edit/pause/resume operations require a direct Human request in the root turn. This is a **human-root-turn** boundary. The agent may stop work and report the blocker, but V0 does not claim it can autonomously persist an immediate Goal pause.

## Final Review

Codex final review receives the approved Feature Spec, current diff and fresh test results. It returns:

- `PASS` when implementation and evidence satisfy the Spec;
- `CHANGES_REQUIRED` with bounded findings when corrections are required;
- an explicit architecture or capability blocker when neither verdict is safe.

DSH remains responsible for applying requested fixes, rerunning verification and presenting the next review package.

## Completion Evidence

A completion claim must include:

- the final diff summary;
- tests and verification commands actually run;
- exit codes and relevant result summaries;
- unresolved gaps or unavailable checks;
- Codex verdict when final review was required.

No stale output, provider narrative or worker-local success claim substitutes for fresh aggregate verification.
