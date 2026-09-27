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
  Require exact full lines `<!-- PCAOM_APPROVED: yes -->` and
  `<!-- PCAOM_CONTEXT_TRANSFER: DeepSeek authorized -->`, plus the exact
  `## Verification` heading followed by at least one
  nonempty fenced `sh` or `bash` block. These are machine-readable preflight gates,
  not substitutes for Human approval or data-transfer authorization.
  If any required line, heading or fence is absent, fail before window creation.
- An exact downstream workspace/worktree and explainable branch, diff, and
  existing Team state. Preserve existing work and identify lane ownership.
  OMX Team requires a clean Git workspace before launch. Commit or otherwise
  deliberately account for the installed Skill, approved Spec, and planning
  artifacts; ignore generated `.omx/`, `.omx-pcaom-team-state/`, and installer
  receipt paths as appropriate for the downstream repository. The bridge checks
  tracked and untracked status and fails before window creation when it is dirty.
- Explicit authorization covering the context and artifacts sent to DeepSeek.
  Do not infer data-transfer authorization from the presence of a credential.
- A live tmux session and available Node.js, Codex CLI, and OMX. Check the pinned
  baseline: Codex CLI `0.156.1`, oh-my-codex `0.21.6`, tmux `3.7b`. Report version
  deviations without inheriting verification claims from the baseline.
- A readable standalone `$CODEX_HOME/pcaom-ds41.config.toml` and resolved model
  catalog selecting `deepseek-flash`, provider `deepseek`, and Responses API.
  The installed Profile must bind `trust_level = "trusted"` to the exact canonical
  downstream project, preseed TUI detection, and use `approval_policy = "never"`
  with `sandbox_mode = "danger-full-access"`. OMX Team requires Git metadata writes
  and access to the existing tmux Unix socket, which `workspace-write` does not
  provide. Treat this as a high-risk automation profile and use only on an explicitly
  authorized repository and trusted machine. Preserve official Codex's default
  configuration and subscription identity; never accept another project path.
  The overlay must not contain `forced_login_method`: it would restrict authentication
  for the shared Codex Home and can log out the official ChatGPT subscription.
  The explicit `model_provider = "deepseek"` and provider environment key select
  DS41 without changing the supervisor's login method.
- `DEEPSEEK_API_KEY` is present in the trusted launcher environment and inherited
  by DS41. Check presence without displaying the value; never put it in command
  arguments, handoffs, artifacts, logs, or observations.

Example verification section for the Spec; replace the command with its actual
acceptance command:

````markdown
## Verification
```bash
python3 -m unittest discover -s tests -v
```
````

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
`OMX_TEAM_WORKER_LAUNCH_ARGS=--profile pcaom-ds41 --model deepseek-flash -c
model_reasoning_effort="high"` for DS41 workers. The explicit model flag is
required because OMX resolves a worker model before Codex loads the standalone
Profile and otherwise can append its configured default model.
Codex shell initialization can replace inherited variables with a user's global
default. In the same shell command that runs `omx team`, re-export the exact
`OMX_TEAM_WORKER_CLI` and `OMX_TEAM_WORKER_LAUNCH_ARGS` values above. Before
publishing `team-bound.json`, inspect each generated worker startup script and
require `--profile pcaom-ds41` plus `--model deepseek-flash`, with no competing
profile or model.
It also creates the exclusive canonical directory
`<project>/.omx-pcaom-team-state/<run_id>` and sets `OMX_TEAM_STATE_ROOT`
on the Leader window. OMX propagates that exact root to Workers. The run
manifest freezes its path and filesystem dev/ino/uid; replacement or symlink
substitution fails closed. This two-level layout preserves pinned OMX API cwd
derivation (`dirname(dirname(state_root))` is the project root).

After GO, invoke Team with an explicit executor role, for example `omx team
3:executor "<approved task summary>"`. Give one independent approved lane to
each Worker and verify persisted task ownership before implementation. DS41
Workers are terminal execution lanes: they must not spawn Codex native
subagents, nested Teams, or another orchestration layer. If OMX cannot preserve
the lane split, report the mismatch instead of silently collapsing work onto one
Worker. These are workflow constraints; runtime smoke must still verify the
actual model, ownership, panes, and worktrees.

OMX legacy text decomposition can turn an enumerated feature into generic
implementation/test tasks. When the approved Spec requires exact independent
lanes, Official Codex must also supply a matching approved OMX planning pair and
Team DAG sidecar under `.omx/plans/`; the DS41 Leader uses that artifact's exact
approved launch hint and requires `decomposition_source = "dag_sidecar"` before
binding. Use the approved hint verbatim even when it is role-agnostic: an
explicit `N:executor` launch overrides per-node DAG roles and can group multiple
lanes onto one Worker. Give independent DAG nodes distinct `filePaths`, `domains`,
subjects, and descriptions; repeated non-stopword hints can intentionally group
related work on one Worker. Do not claim lane preservation from the natural-language
task or DAG node count alone; verify the persisted owners.

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
bridge run name, unique `run_id`, isolated root, context digest, and worker count. It authorizes the DS41 Leader, as sole
fan-out owner, to create or resume Ultragoal and start OMX Team exactly once.
The bridge persists `go_submitting` before any GO input and `go_submitted` only
after successful submission. This proves transport submission only; Team start
remains unverified until Task 7 status evidence. Never automatically replay GO.
From `go_submitting`, failures preserve uncertain delivery diagnostics and never
automatically kill the window, including input or buffer-cleanup failures.
Before that boundary, cleanup requires fresh exact singleton pane, server
generation, and supervisor identity. Leave the supervisor intact.

The bridge `--team` argument is only the bridge run name used for lookup under
`.omx/pcaom-supervisor/`; it is not OMX's hashed internal Team name. After startup,
the same DS41 Leader captures the actual `Team started: <internal-name>` output
and reads the sole `team/<internal-name>/config.json` and `manifest.v2.json` in
the isolated root. Before supervised lifecycle actions, it atomically and
exclusively publishes `<run-directory>/team-bound.json` (temporary file plus
no-replace link, then remove temporary file). Never overwrite or reconstruct
a binding from a display-name search.

Use GO's `Binding contract JSON` (also `run.json.binding_contract`) as follows:

- Copy all its fixed fields unchanged: schema/adapter/OMX version; run_id,
  bridge_run_name, handoff_id, go_id; context/spec digests and paths; canonical
  project/run/state paths and state-root dev/ino/uid; server socket/pid/start,
  session/window, Leader and supervisor pane/window identities.
- Remove `identity_fields` and `worker_identity_fields` from the published
  object. Use these lists to build `identity`: select each listed config field,
  using JSON null for absent optional fields; then add `state_root`,
  `team_directory`, ordered `workers` projections, and `leader` from the manifest.
  Config and manifest must agree on each projected field and worker identity.
- Add `internal_name`, actual `display_name` and `requested_name`, `created_at`,
  ISO `bound_at`, `leader_pane_pid`, `owner_id` (tmux_pane_owner_id), `leader`,
  and `identity`. Add `config_sha256` and `manifest_sha256` of the exact startup
  file bytes. These digests are Leader startup evidence, not lifetime equality
  gates: normal mutable counters, task assignments, and next-task IDs may change.

The bridge validates this record against the run, isolated namespace, fresh
paired Team files and tmux ownership. Mutating commands then persist its digest
and `binding_state: accepted`; passive status/await/inspect validate in memory.
The immutable identity must remain equal throughout every operation.

Official Codex does not start either workflow on the Leader's behalf. Use OMX's
existing task, mailbox, worktree, and lifecycle interfaces; the bridge owns no
replacement task store. Normal subprocess commands have a 5000 ms timeout;
`--command-timeout-ms` provides an explicit bounded override for start/inspect
diagnostics. `--startup-timeout-ms` bounds the ACK/GO startup sequence.

## Observe, wait, and steer

`status` is passive: directly read the exact Team config, manifest, phase,
tasks, worker records and wakeable event log. Do not call top-level OMX status
or await: both invoke monitoring and can assign work or integrate worktrees.
OMX API read-config, read-manifest, list-tasks and get-summary also have
recovery/migration/snapshot writes and are not passive readers. Before Team
binding, `inspect` authorizes only the frozen Leader pane. A bound active run
allows that Leader and config/manifest-agreed Worker panes with verified PIDs
in the same server/session/window. Extra HUD/unowned panes are ignored, never
authorized for capture; changed Worker identities are never adopted. Neither command
delivers instructions or mutates lifecycle state. Absent Team state after GO
is reported as `awaiting-team`, not verified startup. A sole Team without its
binding is `team-unbound` and provides direct read-only evidence only. Ask the
same proven Leader to publish the exact exclusive binding or report a blocker;
do not fabricate a recovered binding, start another Team, or invoke lifecycle
commands. Reads are bounded to
1 MiB per file and 1000 tasks; oversized evidence fails closed.

`await` invokes only `omx team api await-event` with `wakeable_only:true`,
an explicit/latest wakeable cursor, and a 1–60000 ms timeout. It invokes zero
Codex processes; a returned Team event can reflect ongoing model work.
Pinned OMX wakeable events include task completion/failure, worker state,
messages, integration conflicts and stale signals. A timeout is a successful
local wait result, not task completion. There is no daemon: no bridge watcher
remains after the current official Codex turn. Continue later through `resume`
or a new Human message; do not promise unattended cross-turn wakeups.

`steer` generates a unique `message_id` and sends the exact instruction through
OMX send-message from `supervisor` to `leader-fixed`. The sender label is
unauthenticated; reverse supervisor mailbox is unsupported in OMX 0.21.6.
Capability stays `experimental-one-way-file-ack`, never mailbox round-trip
verified. `ACK:<message_id>` denotes an exact file ACK under the run directory:
the Leader atomically creates the specified JSON containing team (actual internal name), message_id,
leader_pane_id and context_digest. A successful API envelope and nested
dispatch.ok establish transport submission only. `--ack-timeout-ms` bounds
each ACK wait to 1–30000 ms (default 5000).

If API/schema/dispatch delivery fails or the ACK times out, persist the degraded
reason and use a fresh verified named-buffer with the same message ID and ACK
path. The Leader must deduplicate that ID because initial delivery may already
have happened. Recheck generation, exact pane/PID/owner and buffer bytes before
clear/bracket-paste/Enter; clean only the exact named buffer. A mismatched or
symlink ACK fails closed. Fallback still requires the matching file ACK and
does not establish mailbox supervision.

## Resume, finalize, and abort

All lifecycle operations require the Leader's binding and revalidate exact
internal name, isolated root identity, creation time, Leader cwd/pane/PID,
tmux generation/session/window, owner token and configured worker panes/worktrees.
The root must have exactly one safe Team directory: additional candidates,
including terminal aliases, malformed entries, symlinks and membership journals
fail before invocation. Aliases in other roots do not participate. Every OMX
API/CLI call receives the actual internal name and exact `OMX_TEAM_STATE_ROOT`,
with binding/root/Team/tmux checks before and after. Shutdown instead checks the
terminal removal conditions below. Root environment overrides must match this
isolated root. Status may inspect `go_submitting`; await/steer/resume/finalize/abort
require a valid binding and `go_submitted`, `bound` or `resumed`. Never replay
uncertain GO. Passive commands never write binding acceptance state.

`resume` invokes exact `omx team resume <internal-name>` after preflight and
checks its success prefix and fresh Team/generation evidence. OMX resume mutates and monitors;
it may integrate work and is not a passive supervision check. It does not prove
dead worker resurrection. Missing identity blocks rather than creating a Team.

For `finalize`, all tasks must be `completed`; pending, blocked, in_progress,
failed and unknown states fail closed. The Leader first checkpoints its work and
creates regular `leader-final.json` in the run directory with exact internal team name and
context_digest, a nonempty verification array of {command, result:"pass",
exit_code:0}, plus absolute project handoff_path and its SHA256 handoff_digest.
The bridge freezes final-handoff.md and final-evidence.json before invoking
`omx team shutdown <internal-name>` without force. Shutdown failure preserves
evidence/diagnostics without claiming completion. Leader evidence is not
independent official review, which remains pending after shutdown.

Shutdown uses a separate 60000 ms subprocess bound and persists
`shutdown_submitting` before invocation. Timeout, signal, command error or
incomplete teardown records `shutdown_uncertain`; never automatically retry,
force, or claim completion. Success requires successful exact command completion,
unchanged run/binding/state-root identities, removal of the exact Team directory,
absence of all frozen Worker panes, and preservation of the supervisor. A printed
success prefix alone is insufficient. Finalized/aborted is recorded only after
these checks; retained evidence supports Human/Leader recovery of uncertain cases.

After the execution lifecycle is closed, official Codex independently re-reads
the workspace and diff, reruns the Spec's exact verification commands, and
reviews the result against acceptance criteria. Report `PASS`,
`CHANGES_REQUIRED`, or a bounded blocker with evidence. Route required repairs
to the existing DS41 Leader or an explicitly scoped repair story without
recursive or competing Team orchestration.

Explicit `abort` authorizes destructive exact `omx team shutdown <internal-name>
--force --confirm-issues` after the same identity gate. Missing/changed Team
state refuses shutdown. Abort records aborted evidence, never success. Neither
finalize nor abort directly kills the supervisor window or an entire session;
the supervisor must remain live. No invented OMX steer/finalize/abort/cancel
verbs are passed through to the CLI.

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
