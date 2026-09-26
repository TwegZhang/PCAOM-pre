# Codex + OMX + DS41 supervised Team target

**Current status: `generated-unverified`.** This bundle contains static declarations;
passing template tests does not demonstrate provider, Team, worktree, or supervision
runtime behavior. The supervisor bridge remains `experimental-unverified`.

The approved [design](../../docs/superpowers/specs/2026-09-26-pcaom-codex-omx-ds41-supervised-team-design.md)
defines this target. PCAOM generates reviewable artifacts; Codex and OMX own execution.

## Layouts

The generated bundle is intended for `.pcaom/generated/codex-omx-ds41/`:

```text
pcaom-target.json
install-manifest.json
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
The profile is a standalone file. Installation must preserve the user's default
Codex configuration and unrelated project instructions.

## Prerequisites and activation

The validation baseline is Codex CLI `0.156.1`, oh-my-codex `0.21.6`, and tmux
`3.7b`. Node.js is required for the installer and bridge; Python 3.11 or newer
is required for the static tests using `tomllib`. Runtime use also requires
an approved Feature Spec, an authorized downstream workspace and permission to
send its task context to DeepSeek.

These are the planned installer commands, run from the complete bundle directory;
the installer, Skill, and bridge are delivered by subsequent implementation tasks.
They cannot be exercised using the metadata-only bundle alone. Replace the example
absolute paths with the intended project and Codex Home:

```sh
node install.mjs install --project /absolute/project --codex-home /absolute/codex-home --dry-run
node install.mjs install --project /absolute/project --codex-home /absolute/codex-home
node install.mjs uninstall --project /absolute/project --codex-home /absolute/codex-home --dry-run
node install.mjs uninstall --project /absolute/project --codex-home /absolute/codex-home
```

Installation must reject unmanaged conflicts; uninstall must remove only files
whose ownership and current digest match the installation receipt. Neither command
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

Workers also use `--profile pcaom-ds41`. The supervisor independently rereads the
workspace and runs acceptance checks after execution. This topology is a design
contract pending runtime evidence.

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
| `generated-unverified` | Static artifacts and contract checks only; current status. |
| `config-verified` | Successful dry-run/install, parsed configuration, correct profile startup model, and version preflight. |
| `runtime-smoke-verified` | Actual synthetic execution proving both processes/windows, DS41 workers, worktrees, steering/ACK, resume, shutdown, and independent review. |
| `dogfood-verified` | Real authorized project acceptance with quality, cost, time, intervention, and rework measurements. |

Record commands, versions, results, and gaps in `docs/observations/` before any
promotion. Mailbox supervision requires its own round-trip evidence; a fallback
does not verify the experimental bridge or unrelated runtime capabilities.
