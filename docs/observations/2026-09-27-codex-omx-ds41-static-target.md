# DS41 target static and isolated installer evidence

Artifact status: generated-unverified; static contract tests passed; real profile startup not run.

## Scope and environment

- Date: 2026-09-27, Asia/Shanghai (UTC+08:00); checks ran approximately 03:55–04:00 CST.
- Source commit: `6cd850cbc98f6927c9525aeebfa4bca1f60061eb`.
  This identifies the implementation tested below; the permanent verification
  harness was added in a later observation follow-up on the same date.
- Workspace: `/Volumes/data/githubCode/PCAOM-pre/.worktrees/codex-omx-ds41-supervised-team`.
- OS: macOS 26.5, build 25F71; Darwin arm64.
- Versions from `python3 --version`, `python3.12 --version`, `node --version`,
  `codex --version`, `omx --version`, and `tmux -V`: Python 3.9.6 and 3.12.13,
  Node.js 22.22.2, codex-cli 0.156.1, oh-my-codex 0.21.6, tmux 3.7b.
- Authorization/data boundary: local static validation and disposable synthetic
  installer roots only. No downstream private project or task context was sent
  to DeepSeek. No real profile, provider, Leader, worker, or Team was launched.
- Presence-only environment check returned `KEY_PRESENT False` for
  `DEEPSEEK_API_KEY`; no credential values were printed or recorded.

The [bundle README](../../templates/codex-omx-ds41-supervised-team/README.md),
[Skill contract](../../templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/SKILL.md),
and [approved design](../superpowers/specs/2026-09-26-pcaom-codex-omx-ds41-supervised-team-design.md)
define the relevant boundary. The design describes intended runtime behavior;
the README and Skill record narrower implemented behavior, including one-way
file ACK steering and no supported reverse supervisor mailbox. Neither is proof
of real execution.

## Commands and results

All commands below ran from the workspace above. No installer/bridge implementation
or target status files changed; the follow-up added only the verification harness.

| Command | Result |
| --- | --- |
| `python3 -m unittest discover -s tests -v` | Exit 0; 125 tests, 266.737 seconds, `OK`; no failures/errors/skips reported. |
| `python3.12 -m unittest tests.test_codex_omx_ds41_target tests.test_codex_omx_ds41_installer tests.test_codex_omx_ds41_bridge -v` | Exit 0; 111 tests, 275.686 seconds, `OK`; 9 target, 34 installer, 68 bridge tests; no failures/errors/skips reported. Python 3.12 enables `tomllib` validation. |
| `node --check templates/codex-omx-ds41-supervised-team/install.mjs` | Exit 0, no syntax diagnostics. |
| `node --check templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs` | Exit 0, no syntax diagnostics. |
| `python3 -m json.tool <file>` for each target JSON listed below | All 3 exited 0. |
| `git diff --check` | Exit 0 before observation creation and after its addition. |
| `git status --porcelain` | Empty before tests; empty again before observation creation after removing 3 generated Python 3.12 cache files. |

JSON files checked: `templates/codex-omx-ds41-supervised-team/pcaom-target.json`,
`templates/codex-omx-ds41-supervised-team/install-manifest.json`, and
`templates/codex-omx-ds41-supervised-team/codex/deepseek-models.json`.
Each invocation used Python `subprocess.run(..., check=True)` with parsed JSON
output discarded. Bridge tests use synthetic adapters, including a deliberately
bounded 60-second shutdown timeout; they do not run a real Team.

### Codex catalog loader

```sh
codex debug models -c 'model_catalog_json="/Volumes/data/githubCode/PCAOM-pre/.worktrees/codex-omx-ds41-supervised-team/templates/codex-omx-ds41-supervised-team/codex/deepseek-models.json"'
```

Exit 0. The JSON `models` array contained exactly one entry, with slug
`deepseek-flash`. Codex printed a nonfatal warning that PATH aliases could not
be created (`Operation not permitted (os error 1)`), also seen with `--version`.
This proves local catalog loader compatibility only. It does not load or start
the DS41 profile or prove any declared provider/model capability.

### Secret, legacy configuration, and placeholder scan

The recursive Python scan included hidden paths in the bundle. It found zero
`experimental_bearer_token` or `[profiles.` occurrences and zero credential-shaped
tokens using `(?<![A-Za-z0-9_-])sk-[A-Za-z0-9_-]{8,}`. An initial unbounded
substring scan matched `membership-task-transaction` filenames in the bridge;
those are not key values. Expected `DEEPSEEK_API_KEY` name occurrences were:
README 1, installer 1, source profile 2, Skill 1, bridge 6 (11 total).

```sh
rg --hidden -n 'experimental_bearer_token|\[profiles\.|\bsk-[A-Za-z0-9_-]+|__PCAOM_MODEL_CATALOG_PATH__' templates/codex-omx-ds41-supervised-team --glob '!pcaom-ds41.config.toml'
```

Exit 0 with exactly two intentional source references: `install.mjs:7` defines
the replacement constant and `README.md:36` documents it. The source profile
contains one template marker. Thus the plan's literal expectation of no matches
outside the profile is not met by the source tree; this is a scan-expectation
limitation, not an unresolved installed path. The installed profile parsed below
contains the exact absolute catalog path and no unresolved marker. No source was
edited to conceal these expected matches.

### Isolated installer round trip

The permanent [verification script](../../scripts/verify-ds41-installer-roundtrip.mjs)
reproduces the isolated exercise from any working directory by resolving the
production bundle relative to its own location. Run from the repository root:

```sh
node scripts/verify-ds41-installer-roundtrip.mjs
```

The script requires Node.js and Python 3.12, uses only standard libraries, and
creates an exclusive `mkdtemp` directory beneath the OS temporary directory.
It copies the complete production bundle, including the actual bridge, and
creates explicit `project root` and `codex home` children, each with an unrelated
sentinel. It invokes the Node installer with argument arrays through `execFileSync`
(no shell) for dry-run, install, reinstall, and uninstall. Each result must be one
JSON line with `ok: true`, exactly 4 operations, and the expected destinations.

Tree and SHA-256 assertions establish:

- Dry-run preserved destination directory entries and file bytes, and bundle bytes.
- Install created exactly 4 managed files and 2 receipts alongside the 2 sentinels.
- Identical reinstall preserved all destination file and receipt bytes.
- Node parsed installed JSON receipts/catalog; Python 3.12 `tomllib.loads` parsed
  the installed profile, asserting model `deepseek-flash` and the exact absolute
  catalog path within that run's disposable Codex Home.
- Uninstall removed the 4 managed files and 2 receipts and preserved both
  unrelated sentinels byte-for-byte. Both original and copied bundles remained unchanged.

Cleanup runs in `finally`, only after validating the exact temporary parent's
canonical path, basename prefix and directory filesystem identity. It removes
only that run's disposable directory. Failure produces JSON stderr and a nonzero
exit without printing subprocess output or environment values. No API key is used.

Fresh follow-up verification (2026-09-27, approximately 04:06–04:08 CST):
`node --check scripts/verify-ds41-installer-roundtrip.mjs`
exited 0. The round-trip command ran twice and both executions exited 0 with the
same summary (no persistent temporary paths):

```json
{"ok":true,"installer_invocations":4,"managed_files":4,"receipts":2,"sentinels_preserved":2,"dry_run_unchanged":true,"reinstall_identical":true,"installed_json_toml":true,"bundle_unchanged":true,"exact_uninstall":true,"temporary_removed":true}
```

`PYTHONDONTWRITEBYTECODE=1 python3.12 -m unittest tests.test_codex_omx_ds41_installer -v`
also passed all 34 installer tests in 5.248 seconds. A missing-Python failure
exercise launched the script through Node `spawnSync` with `PATH=/nonexistent`
and an isolated `TMPDIR`; it returned exit 1, JSON stderr with phase
`installed-profile`, empty stdout, and left that temporary parent empty.
Observation links and `git diff --check` were
checked again for this follow-up.

## Evidence limits and next gate

Established: static contracts, Node syntax, JSON/profile parsing, pinned catalog
loader compatibility, isolated installer ownership/idempotence behavior, and
local fake-adapter bridge regressions. A relative-link existence check resolves
both bundle README links and all 4 observation links. No build/typecheck command
is applicable to this observation/harness change and plain JavaScript bundle;
Node syntax checks and the Python suites are the executable checks used here.

Not established: actual model/provider behavior, real profile startup/banner,
Ultragoal, Team topology, worker model identity, worktrees, live steering/ACK,
resume, shutdown, monitoring cost, or independent final review of a DS41 run.
Static loader/installer success does not prove any of these capabilities.

Because the key is absent, the real config/profile-startup and runtime gates were
not attempted. The next config gate requires an authorized disposable environment,
trusted credential injection and a real profile banner showing `deepseek-flash`
on the pinned tools. Runtime smoke then needs separately recorded synthetic
execution evidence for each capability. No runtime-smoke observation or empty
runtime commit was created. `pcaom-target.json` and all capability/status fields
remain unchanged; overall status remains `generated-unverified`.
