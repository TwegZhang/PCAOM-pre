---
name: pcaom-ds41-team
description: Supervise an explicitly authorized downstream DS41 Codex and OMX Team execution from official Codex, using bounded bridge commands and independent final review.
---

# DS41 supervised Team

Use this Skill from official Codex in an authorized downstream project inside
tmux. PCAOM emits this template; do not load or activate it in PCAOM itself.
This is a workflow contract, currently `generated-unverified`; the bridge is
`experimental-unverified` and runtime capabilities remain unverified. If the
installed bridge is absent or preflight fails, report the missing prerequisite
and stop before launching execution. Static configuration is not runtime evidence.

## Ownership and start gate

DS41 Codex Leader is the only execution-plane fan-out owner. It owns Ultragoal,
the Team lifecycle, code changes through its execution lanes, integration,
aggregate verification, and checkpoints. Official Codex owns requirements,
bounded steering, and independent final review.
Official Codex must not edit code while DS41 Team is active.
It must not write the DS41 Ultragoal ledger or start a
competing Team. Larry DSH and DS41 Team must never be active in the same task tree;
a target switch requires an explicit handoff after the existing lifecycle ends.

Before `start`, establish all of the following:

- Human-approved `FEATURE_SPEC.md` with scope, architecture boundaries,
  acceptance criteria, and exact runnable verification commands.
- An exact downstream workspace/worktree and explainable branch, diff, and
  existing Team state. Preserve existing work and identify lane ownership.
- Explicit authorization covering the context and artifacts sent to DeepSeek.
  Do not infer data-transfer authorization from the presence of a credential.
- A live tmux session and available Node.js, Codex CLI, and OMX. Check the pinned
  baseline: Codex CLI `0.156.1`, oh-my-codex `0.21.6`, tmux `3.7b`. Report version
  deviations without inheriting verification claims from the baseline.
- A readable standalone `$CODEX_HOME/pcaom-ds41.config.toml` and resolved model
  catalog selecting `deepseek-flash`, provider `deepseek`, and Responses API.
  Preserve official Codex's default configuration and subscription identity.
- `DEEPSEEK_API_KEY` is present in the trusted launcher environment and inherited
  by DS41. Check presence without displaying the value; never put it in command
  arguments, handoffs, artifacts, logs, or observations.

## Command mapping

Interpret the following as user invocations. Run their corresponding bridge
command from the downstream project root. Replace angle-bracket placeholders
with validated, shell-quoted values; they are not literal shell redirections.
Resolve exact Team identity from authoritative OMX state, never from a guessed
name, wildcard, stale pointer, or unrelated session.

```text
$pcaom-ds41-team start --spec FEATURE_SPEC.md --workers 3
$pcaom-ds41-team status --team <exact-team>
$pcaom-ds41-team await --team <exact-team> --timeout-ms 60000
$pcaom-ds41-team steer --team <exact-team> --message "<instruction>"
$pcaom-ds41-team inspect --team <exact-team> --pane leader
$pcaom-ds41-team resume --team <exact-team>
$pcaom-ds41-team finalize --team <exact-team>
$pcaom-ds41-team abort --team <exact-team>
```

```text
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs start --spec FEATURE_SPEC.md --workers 3
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs status --team <exact-team>
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs await --team <exact-team> --timeout-ms 60000
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs steer --team <exact-team> --message "<instruction>"
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs inspect --team <exact-team> --pane leader
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs resume --team <exact-team>
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs finalize --team <exact-team>
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs abort --team <exact-team>
```

## Start and handoff

After preflight, `start` writes `.omx/context/<feature>-<run>.md` containing the
approved Spec reference, constraints, unknowns, touchpoints, workspace ownership,
and verification commands. It creates exactly one DS41 window,
`ds41-team-<slug>`, in the supervisor's tmux session and launches an independent
`codex --profile pcaom-ds41` Leader. The trusted launcher sets
`OMX_TEAM_WORKER_CLI=codex` and
`OMX_TEAM_WORKER_LAUNCH_ARGS=--profile pcaom-ds41` for DS41 workers.

Require interactive startup evidence before delivering context. Use a fresh
named-buffer for the handoff: load the exact text into a uniquely named tmux
buffer, read it back and compare, clear the intended pane composer, then use
bracketed paste from that named buffer and submit intentionally. Pane capture is
diagnostic evidence only, never acceptance. Never paste tmux's implicit/current buffer;
failed load, mismatch, or uncertain pane identity blocks submission.

The first handoff requires the Leader to validate the exact context, digest, and
workspace, atomically create the exclusive regular non-symlink file
`leader-accepted.json`, and END TURN. Its exact JSON fields are `schema_version: 1`,
`phase: accepted-awaiting-go`, `team`, `handoff_id`, `leader_pane_id`, and
`context_digest`. It forbids Ultragoal, Team, workers, and implementation until a
separate matching GO. The bridge validates this ACK and the singleton pane/server
identity before recording `accepted`.

A second distinct verified named-buffer carries GO bound to `go_id`, `handoff_id`,
Team, context digest, and worker count. It authorizes the DS41 Leader, as sole
fan-out owner, to create or resume Ultragoal and start OMX Team exactly once.
The bridge persists `go_submitting` before any GO input and `go_submitted` only
after successful submission. This proves transport submission only; Team start
remains unverified until Task 7 status evidence. Never automatically replay GO.
From `go_submitting`, failures preserve uncertain delivery diagnostics and never
automatically kill the window, including input or buffer-cleanup failures.
Before that boundary, cleanup requires fresh exact singleton pane, server
generation, and supervisor identity. Leave the supervisor intact.

Official Codex does not start either workflow on the Leader's behalf. Use OMX's
existing task, mailbox, worktree, and lifecycle interfaces; the bridge owns no
replacement task store. Normal subprocess commands have a 5000 ms timeout;
`--command-timeout-ms` provides an explicit bounded override for start/inspect
diagnostics. `--startup-timeout-ms` bounds the ACK/GO startup sequence.

## Observe, wait, and steer

`status` and `inspect` are read-only: read Team summary/tasks and capture the
exact Leader or requested Worker pane. They must not deliver instructions,
change tasks, or mutate lifecycle state.

`await` is a bounded local event wait through OMX and produces no model call.
Only `QUESTION`, `BLOCKED`, `FAILED`, story completion, Team completion, or a
Human query wakes official Codex. Heartbeats, unchanged timeouts, and duplicate
progress do not trigger model summaries. There is no daemon: no bridge watcher
remains after the current official Codex turn. Continue later through `resume`
or a new Human message; do not promise unattended cross-turn wakeups.

`steer` sends a bounded instruction with a unique `message_id` and waits for
`ACK:<message_id>`. A successful send is not an ACK. Deduplicate retries by that
identity. External-supervisor mailbox support is experimental: first verify a
round trip from `supervisor` to `leader-fixed`, the Leader's matching ACK, and
supervisor receipt/delivery marking with duplicate-message handling.

If mailbox delivery or ACK verification fails, explicitly report degraded mode
and use verified named-buffer steering with manual pane observation. Apply the
same read-back, exact-pane, bracketed-paste, and acceptance checks as the initial
handoff. Do not silently duplicate a possibly delivered instruction or claim
mailbox supervision is verified from a fallback's success.

## Resume, finalize, and abort

`resume` reconstructs supervision from existing OMX config/manifest and validates
the exact Team root, internal name, session, Leader pane, runtime identity, and
workspace. Revalidate live ownership before mutation. Missing or conflicting
identity is a blocker; do not create a replacement Team to conceal it.

`finalize` requires all tasks to be terminal and successful, plus fresh evidence
that DS41 performed aggregate verification, checkpointing, and its owned shutdown
procedure. Failed, pending, or in-progress tasks block normal finalization.
Preserve handoff and verification evidence; close only proven Team-owned panes
through OMX's lifecycle contract. Do not treat the Leader's final prose as proof.

After the execution lifecycle is closed, official Codex independently re-reads
the workspace and diff, reruns the Spec's exact verification commands, and
reviews the result against acceptance criteria. Report `PASS`,
`CHANGES_REQUIRED`, or a bounded blocker with evidence. Route required repairs
to the existing DS41 Leader or an explicitly scoped repair story without
recursive or competing Team orchestration.

`abort` acts only on an explicitly requested exact scope through OMX's supported
cancellation/shutdown contract. Freeze and revalidate the same Team root, name,
session, Leader pane, and runtime identity before acting. Abort does not imply
success and must preserve diagnostics; do not broadly kill tmux sessions, remove
unrelated state, or infer ownership from names alone.

## Blockers and evidence

For `BLOCKED_ARCHITECTURE`, stop dependent implementation and return the scope or
architecture decision to Human and official Codex. For `BLOCKED_POLICY_CONFLICT`,
stop dependent implementation, state the conflicting instructions, and preserve
project-owned policy. A blocker report is not proof that the runtime Goal paused;
use only supported host controls for lifecycle transitions.

Record versions, commands, results, degradation, and verification gaps in the
downstream project's observation records. Keep `generated-unverified`,
`config-verified`, `runtime-smoke-verified`, and `dogfood-verified` distinct.
Static contract tests do not prove provider behavior, mailbox delivery, workers,
worktrees, recovery, shutdown, or final-review execution. Promote each capability
only with its own fresh evidence on the recorded runtime and Profile.
