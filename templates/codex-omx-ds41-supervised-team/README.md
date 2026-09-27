# Codex + OMX + DS41 supervised Team target

**Current status: `generated-unverified`.** This bundle contains static declarations,
an implemented installer, downstream Skill, and bounded command bridge. A disposable
synthetic run verified the installed Profile/provider startup and the bounded Team,
worktree, shutdown, and independent-final-review capabilities on the pinned runtime.
Accordingly, Profile/installer are `config-verified`, while Team/worktree/final review
are `runtime-smoke-verified`. The supervisor bridge remains
`experimental-unverified`; the whole Skill, Ultragoal, resume/recovery, dogfood, and
production behavior remain unverified. Ultragoal and resume/recovery specifically
remain `runtime-unverified`. See the linked runtime observation for the exact
evidence and gaps.

The approved [design](../../docs/superpowers/specs/2026-09-26-pcaom-codex-omx-ds41-supervised-team-design.md)
defines this target. PCAOM generates reviewable artifacts; Codex and OMX own execution.

## Layouts

The generated bundle is intended for `.pcaom/generated/codex-omx-ds41/`:

```text
pcaom-target.json
install-manifest.json
install.mjs
codex/pcaom-ds41.config.toml
codex/deepseek-models.json
project/.codex/skills/pcaom-ds41-team/SKILL.md
project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs
```

The install map declares these installed destinations:

```text
$CODEX_HOME/pcaom-ds41.config.toml
$CODEX_HOME/model-catalogs/pcaom-deepseek-models.json
<project>/.codex/skills/pcaom-ds41-team/SKILL.md
<project>/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs
```

The installer resolves `__PCAOM_MODEL_CATALOG_PATH__` to an absolute catalog path.
It also resolves `__PCAOM_PROJECT_PATH__` to the one canonical downstream project
root and records that exact root as trusted in the standalone Profile. The Profile
preseeds Codex's TUI detection state and uses `approval_policy = "never"` with
`sandbox_mode = "danger-full-access"`. This is required because the DS41 Leader
must write Git worktree metadata and connect to the existing tmux Unix socket;
Codex `workspace-write`, including extra writable roots, does not authorize that
socket. This is a high-risk automation profile: use it only for explicitly
authorized repositories on a trusted machine. It does not trust parent directories
or other projects, but its shell commands are not filesystem-sandboxed. Installation
must preserve the user's default Codex configuration and unrelated project instructions.
The overlay must not set `forced_login_method`: that setting restricts the shared
Codex Home's authentication method and can log out an existing ChatGPT subscription
session. Explicit `model_provider = "deepseek"` plus provider `env_key =
"DEEPSEEK_API_KEY"` selects DeepSeek without changing the official supervisor's
login identity.

## Prerequisites and activation

OMX Team starts only from a clean Git workspace. Before invoking the bridge,
commit or deliberately account for the installed Skill, approved Spec, and any
approved Team DAG. Add downstream ignore rules for generated `.omx/`,
`.omx-pcaom-team-state/`, and installer receipts when those artifacts are not
project-owned. The bridge checks both tracked and untracked changes before it
creates a DS41 window and fails closed when the workspace is dirty.

The validation baseline is Codex CLI `0.156.1`, oh-my-codex `0.21.6`, and tmux
`3.7b`. Node.js is required for the installer and bridge. Static tests support
Python 3.9 or newer with an exact profile template check; Python 3.11 or newer
also validates the profile using `tomllib`. Runtime use also requires
an approved Feature Spec, an authorized downstream workspace and permission to
send its task context to DeepSeek.

The approved `FEATURE_SPEC.md` must contain both comments below as exact full
lines and the exact `## Verification` heading, followed by at least one
nonempty fenced `sh` or `bash` block. Copy this fragment and replace the example
command with the project's actual acceptance command:

````markdown
<!-- PCAOM_APPROVED: yes -->
<!-- PCAOM_CONTEXT_TRANSFER: DeepSeek authorized -->

## Verification
```bash
python3 -m unittest discover -s tests -v
```
````

These markers are machine-readable preflight gates, not substitutes for Human
approval or data-transfer authorization. Record them only after obtaining that
approval and authorization. Missing exact markers, heading or nonempty shell
fence makes start fail before window creation.

Run these implemented installer commands from this complete bundle directory.
Replace the example
absolute paths with the intended project and Codex Home:

```sh
node install.mjs install --project /absolute/project --codex-home /absolute/codex-home --dry-run
node install.mjs install --project /absolute/project --codex-home /absolute/codex-home
node install.mjs uninstall --project /absolute/project --codex-home /absolute/codex-home --dry-run
node install.mjs uninstall --project /absolute/project --codex-home /absolute/codex-home
```

Installation rejects unmanaged conflicts; uninstall removes only files
whose ownership and current digest match the paired installation receipts. Neither command
starts Codex or a Team.

Supply `DEEPSEEK_API_KEY` through the trusted launcher environment. The profile
stores only the environment variable name. Never put its value in artifacts,
command arguments, logs, handoff text, or observations. Ensure the DS41 process
inherits the trusted environment without displaying its values.

## Intended runtime topology

Invoke `$pcaom-ds41-team` in the official Codex supervisor inside tmux. The intended
layout uses two windows in the same session:

- `supervisor`: official Codex handles requirements, steering, and final review.
- `ds41-team-<slug>`: an independent `codex --profile pcaom-ds41` Leader, OMX
  worker panes, and HUD. DS41 owns Ultragoal and Team fan-out during implementation.

Workers use `--profile pcaom-ds41 --model deepseek-flash -c
model_reasoning_effort="high"`; the explicit model prevents OMX from appending a
different configured default before Codex loads the standalone Profile. Because
Codex shell initialization can restore a user's global worker arguments, the
Leader re-exports these exact values in the same shell command that invokes Team
and verifies every generated startup script before binding. Start
Team with an explicit executor role (`N:executor`), verify one approved lane per
Worker before implementation, and do not nest Codex native subagents under DS41
Workers. Specs that require exact lane preservation also need a matching approved
OMX PRD/test-spec pair and Team DAG sidecar; legacy text decomposition is not
accepted as proof of lane ownership. The Leader uses that approved launch hint
verbatim—even if it omits a shared agent type—so OMX can preserve distinct
per-node roles. Independent nodes need distinct file/domain and task-text hints,
because OMX deliberately groups overlapping scopes. The Leader then verifies the
persisted owners. The supervisor independently rereads the workspace and runs
acceptance checks after execution. The recorded synthetic r14 observation verifies
this bounded topology once; other repositories and uncovered lifecycle paths still
require their own evidence.

## Supervisor commands and lifecycle

From official Codex in the downstream project, use these Skill invocations
(they are not shell commands):

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

The Skill maps each command to `node
.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs` with the same verb
and arguments, from the project root. For example:

```sh
node .codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs start --spec FEATURE_SPEC.md --workers 3
```

Read the [Skill contract](project/.codex/skills/pcaom-ds41-team/SKILL.md) for exact
preflight, ACK records, timeouts and recovery conditions. Official Codex must not
edit code while DS41 Team is active; the DS41 Leader alone owns execution writes,
Ultragoal and Team lifecycle. Never activate Larry DSH on the same task tree.

Start uses ACK → GO: the Leader validates context and writes
`leader-accepted.json`, then ends its turn before a distinct GO permits execution.
An uncertain `go_submitting` is never automatically replayed. Each run creates
an isolated `<project>/.omx-pcaom-team-state/<run_id>` and passes its canonical
path as `OMX_TEAM_STATE_ROOT` to Leader/Workers. The frozen filesystem identity
must remain unchanged. The Leader publishes exclusive `team-bound.json` from
actual startup output and matching config/manifest. `<exact-team>` is a Bridge
run name, not OMX's internal Team name; lifecycle calls use the bound internal
name and exact isolated root. Missing/changed binding blocks lifecycle actions.

`status` reads exact files passively. `await` uses only
`omx team api await-event` (1–60000 ms), with no model invocation. Top-level OMX
status/await and several API summary readers mutate or monitor state in the
pinned version; they are not passive substitutes. There is no daemon or automatic
cross-turn wakeup. No background supervisor model tokens are spent by a local
wait, but ongoing DS41 work still uses model tokens. On the next Human turn use
status, then resume only if needed: `omx team resume` mutates and monitors.

Steering is `experimental-one-way-file-ack`: an unauthenticated `supervisor`
sender delivers to `leader-fixed`, with an exact message-ID file ACK. Reverse
supervisor mailbox is unsupported. Dispatch success proves submission only.
Failure/timeout degrades to a freshly loaded and read-back-verified named-buffer
using the same message ID; the Leader must deduplicate and still write the ACK.
Neither path establishes bidirectional mailbox supervision or promotes status.

The Leader aggregates verification and checkpoints before writing
`leader-final.json`. Finalize requires every task completed, freezes handoff and
evidence, then invokes exact non-force shutdown. Success requires removal of the
bound Team directory and worker panes while preserving the supervisor. A
`shutdown_uncertain` result is not completion and is not automatically retried.
Explicit abort uses force with issue confirmation and records abortion, never
success. After closure, official Codex rereads workspace/diff, reruns Spec checks,
and reports `PASS` or `CHANGES_REQUIRED`; Leader evidence is not final review.

The earlier design's mailbox round-trip and top-level await proposal is not the
implemented capability. The narrower pinned behavior above and in the Skill
governs use; additional runtime observations are still required for uncovered
capabilities.

## Catalog and evidence

The minimal catalog declares only `deepseek-flash` (DeepSeek V4.1 Flash), Responses
protocol through the profile, a conservative 1,000,000-token context window, image
input, freeform patching, parallel tools, and `low`/`high`/`max` reasoning.
Field names follow the local Codex `0.156.1` catalog: `multi_agent_version: "v2"`
selects multi-agent v2; `minimal_client_version` is `0.144.0`. No copied system
prompt is included. These declarations do not establish actual model capabilities.

Status promotion requires fresh, separately recorded evidence:

| Status | Required evidence |
| --- | --- |
| `generated-unverified` | The overall target remains here while uncovered lifecycle capabilities remain. |
| `config-verified` | Successful dry-run/install, parsed configuration, correct profile startup model, and version preflight. |
| `runtime-smoke-verified` | Per-capability evidence requires its actual synthetic execution; whole-target promotion additionally requires both processes/windows, DS41 workers, worktrees, steering/ACK, resume, shutdown, and independent review. |
| `dogfood-verified` | Real authorized project acceptance with quality, cost, time, intervention, and rework measurements. |

Record commands, versions, results, and gaps in `docs/observations/` before any
promotion. Mailbox supervision requires its own round-trip evidence; a fallback
does not verify the experimental bridge or unrelated runtime capabilities.
The partial synthetic runtime evidence and per-capability verdict are recorded in
[the runtime observation](../../docs/observations/2026-09-27-codex-omx-ds41-runtime-smoke.md).
The later [O2 deployment observation](../../docs/observations/2026-09-27-o2-ds41-deployment-auth-regression.md)
records and fixes the shared-home `forced_login_method` regression while preserving
the existing ChatGPT subscription login method.
