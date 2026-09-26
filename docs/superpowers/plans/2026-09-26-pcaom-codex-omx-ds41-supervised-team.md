# PCAOM Codex + OMX + DS41 Supervised Team Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver the first testable `codex-omx-ds41-supervised-team` PCAOM target bundle: target-specific policy, a DeepSeek V4.1 Flash Codex profile, a downstream project Skill, a non-destructive installer, and a no-daemon supervisor bridge.

**Architecture:** PCAOM remains a static artifact compiler rather than an agent runtime. The bundle installs a project-level Skill plus a separate user-level `pcaom-ds41` Codex profile; an official-subscription Codex process supervises a second DS41 Codex process that exclusively owns Ultragoal, OMX Team fan-out, and implementation. Python contract tests validate templates and Node ESM tools; real tmux/Codex/OMX behavior is promoted only through separately recorded smoke evidence.

**Tech Stack:** Markdown, JSON, TOML, Node.js ESM standard library, Python `unittest`/`tomllib`, Codex CLI `0.156.1`, oh-my-codex `0.21.6`, tmux `3.7b`.

---

## Scope and execution constraints

- This milestone ships a reviewable template bundle and activation tools. It does not implement the future profiler, Project IR validator, emitter, daemon, mailbox, scheduler, or dashboard.
- Preserve the existing unrelated worktree changes in `README.md`, `docs/superpowers/plans/2026-09-19-pcaom-v0.md`, and `docs/observations/2026-09-25-o2-desktop-agents-static-compile.md`.
- Keep `templates/project-agents/AGENTS.generated.md` as the Larry DSH compatibility fixture until an emitter exists; prove that it is the composition of common policy plus the Larry target policy.
- Never store or print the value of `DEEPSEEK_API_KEY`. Tests use only the variable name or a synthetic sentinel that must not appear in captured output.
- Static tests may establish only `generated-unverified`. Configuration and runtime status changes require the evidence gates defined in Tasks 9 and 10.

## File map

| Path | Responsibility |
| --- | --- |
| `templates/project-agents/AGENTS.common.md` | Target-neutral Human ownership, Feature Spec, blockers, verification, and non-destructive merge policy. |
| `templates/project-agents/targets/larry-dsh-headless.md` | Larry-only execution ownership and escalation policy. |
| `templates/project-agents/targets/codex-omx-ds41-supervised-team.md` | Official Codex supervisor versus DS41 Leader/Team ownership policy. |
| `templates/project-agents/AGENTS.generated.md` | Existing assembled Larry compatibility fixture; no new emitter is implied. |
| `templates/codex-omx-ds41-supervised-team/pcaom-target.json` | Adapter identity, pinned validation baseline, model identity, and per-capability status. |
| `templates/codex-omx-ds41-supervised-team/install-manifest.json` | Exact source-to-destination installation map and ownership namespace. |
| `templates/codex-omx-ds41-supervised-team/codex/pcaom-ds41.config.toml` | Machine-independent DS41 Codex profile template. |
| `templates/codex-omx-ds41-supervised-team/codex/deepseek-models.json` | Minimal model catalog containing only `deepseek-flash`. |
| `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/SKILL.md` | Downstream user workflow and ownership contract. |
| `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs` | One-shot preflight/start/status/await/steer/inspect/resume/finalize/abort adapter. |
| `templates/codex-omx-ds41-supervised-team/install.mjs` | Dry-run, install, receipt, conflict, and exact uninstall logic. |
| `templates/codex-omx-ds41-supervised-team/README.md` | Generated-versus-installed layout, prerequisites, commands, status, and limits. |
| `tests/test_codex_omx_ds41_target.py` | Static target, profile, catalog, Skill, ownership, and status contracts. |
| `tests/test_codex_omx_ds41_installer.py` | Installer behavior against isolated temporary project and Codex homes. |
| `tests/test_codex_omx_ds41_bridge.py` | Bridge behavior against deterministic fake `tmux`, `omx`, and `codex` executables. |
| `docs/observations/2026-09-26-codex-omx-ds41-static-target.md` | Reproducible static/config evidence and remaining gaps. |
| `docs/observations/2026-09-26-codex-omx-ds41-runtime-smoke.md` | Credential-gated runtime evidence; create only after the real smoke is run. |

### Task 1: Split target-neutral and target-specific AGENTS policy

**Files:**
- Create: `templates/project-agents/AGENTS.common.md`
- Create: `templates/project-agents/targets/larry-dsh-headless.md`
- Create: `templates/project-agents/targets/codex-omx-ds41-supervised-team.md`
- Modify: `templates/project-agents/AGENTS.generated.md`
- Modify: `templates/project-agents/README.md`
- Modify: `tests/test_pcaom_agents_contract.py`

- [ ] **Step 1: Add failing policy-layer tests**

Add helpers that read all four templates, then add these assertions:

```python
COMMON = ROOT / "templates/project-agents/AGENTS.common.md"
TARGETS = ROOT / "templates/project-agents/targets"

def test_common_policy_is_execution_target_neutral(self):
    text = COMMON.read_text()
    for forbidden in ("Larry", "DSH", "deepseek-flash", "OMX Team"):
        self.assertNotIn(forbidden, text)

def test_each_target_declares_one_fanout_owner(self):
    larry = (TARGETS / "larry-dsh-headless.md").read_text()
    ds41 = (TARGETS / "codex-omx-ds41-supervised-team.md").read_text()
    self.assertIn("Larry DSH is the only execution-plane fan-out owner", larry)
    self.assertIn("DS41 Codex Leader is the only execution-plane fan-out owner", ds41)
    self.assertIn("Official Codex must not edit code while DS41 Team is active", ds41)

def test_larry_compatibility_fixture_contains_common_and_larry_policy(self):
    assembled = GENERATED.read_text()
    common = COMMON.read_text()
    larry = (TARGETS / "larry-dsh-headless.md").read_text()
    self.assertIn(common.strip(), assembled)
    self.assertIn(larry.strip(), assembled)
    self.assertNotIn("deepseek-flash", assembled)
```

- [ ] **Step 2: Run the focused test and confirm the missing-template failure**

Run: `python3 -m unittest tests.test_pcaom_agents_contract -v`

Expected: FAIL because `AGENTS.common.md` and `targets/*.md` do not exist.

- [ ] **Step 3: Extract the common policy without changing its meaning**

Move the target-neutral sections from the current generated fixture into `AGENTS.common.md`: Human ownership; approved `FEATURE_SPEC.md`; architecture and policy blockers; evidence-based verification; data/credential boundaries; and non-destructive handling of project-owned instructions. Do not mention a provider, harness, or fan-out owner in this file.

- [ ] **Step 4: Create the two execution-target policies**

Place the current Larry-specific wording in `targets/larry-dsh-headless.md`. Add this exact ownership core to the DS41 target file:

```markdown
## Execution ownership

- DS41 Codex Leader is the only execution-plane fan-out owner for the active task tree.
- DS41 Codex Leader owns Ultragoal, OMX Team lifecycle, Worker delegation, implementation, and aggregate verification.
- Official Codex must not edit code while DS41 Team is active; it owns requirements, bounded steering, and independent final review after Team terminal state.
- Larry DSH and DS41 OMX Team must never be active in the same task tree. Switching targets requires an explicit handoff after the current runtime reaches a terminal state.
```

Also include the two blocker names, fresh-evidence requirement, and the rule that a stronger model alone does not justify fan-out.

- [ ] **Step 5: Reassemble the Larry compatibility fixture and document the temporary composition rule**

Make `AGENTS.generated.md` byte-for-byte contain the common policy followed by the Larry policy, separated by one newline. In `templates/project-agents/README.md`, state that this file remains the Larry fixture until the deterministic emitter is implemented, and that future emitters select exactly one target policy.

- [ ] **Step 6: Run the policy tests**

Run: `python3 -m unittest tests.test_pcaom_agents_contract -v`

Expected: PASS; existing wrapper and managed-block tests remain green.

- [ ] **Step 7: Commit the policy split**

```bash
git add templates/project-agents tests/test_pcaom_agents_contract.py
git commit -m "refactor: split generated policy by execution target"
```

### Task 2: Add target metadata, DS41 profile, and minimal model catalog

**Files:**
- Create: `templates/codex-omx-ds41-supervised-team/pcaom-target.json`
- Create: `templates/codex-omx-ds41-supervised-team/install-manifest.json`
- Create: `templates/codex-omx-ds41-supervised-team/codex/pcaom-ds41.config.toml`
- Create: `templates/codex-omx-ds41-supervised-team/codex/deepseek-models.json`
- Create: `templates/codex-omx-ds41-supervised-team/README.md`
- Create: `tests/test_codex_omx_ds41_target.py`

- [ ] **Step 1: Write failing metadata/profile tests**

Create a `unittest.TestCase` using `json` and `tomllib`. Lock these fields and prohibitions:

```python
def test_target_metadata_starts_unverified(self):
    target = json.loads((BUNDLE / "pcaom-target.json").read_text())
    self.assertEqual(target["target"], "codex-omx-ds41-supervised-team")
    self.assertEqual(target["status"], "generated-unverified")
    self.assertEqual(target["runtime_ref"], {
        "codex_cli": "0.156.1", "oh_my_codex": "0.21.6", "tmux": "3.7b"
    })
    self.assertEqual(target["model"]["id"], "deepseek-flash")
    self.assertEqual(target["model"]["family"], "DeepSeek V4.1 Flash")

def test_profile_uses_environment_auth_and_separate_profile_file(self):
    text = (BUNDLE / "codex/pcaom-ds41.config.toml").read_text()
    profile = tomllib.loads(text)
    self.assertEqual(profile["model"], "deepseek-flash")
    self.assertEqual(profile["model_provider"], "deepseek")
    self.assertEqual(profile["model_providers"]["deepseek"]["env_key"], "DEEPSEEK_API_KEY")
    self.assertEqual(profile["model_providers"]["deepseek"]["wire_api"], "responses")
    self.assertNotIn("experimental_bearer_token", text)
    self.assertNotIn("[profiles.", text)
    self.assertNotRegex(text, r"sk-[A-Za-z0-9]")

def test_catalog_contains_only_the_pinned_model(self):
    catalog = json.loads((BUNDLE / "codex/deepseek-models.json").read_text())
    self.assertEqual([model["slug"] for model in catalog["models"]], ["deepseek-flash"])
    model = catalog["models"][0]
    self.assertEqual(model["context_window"], 1_000_000)
    self.assertTrue(model["supports_parallel_tool_calls"])
```

- [ ] **Step 2: Run the target test and confirm it fails on missing bundle files**

Run: `python3 -m unittest tests.test_codex_omx_ds41_target -v`

Expected: FAIL with `FileNotFoundError` under `templates/codex-omx-ds41-supervised-team`.

- [ ] **Step 3: Add exact target metadata**

Write `pcaom-target.json` as valid JSON with this semantic content:

```json
{
  "schema_version": 0,
  "target": "codex-omx-ds41-supervised-team",
  "status": "generated-unverified",
  "runtime_ref": {"codex_cli": "0.156.1", "oh_my_codex": "0.21.6", "tmux": "3.7b"},
  "model": {"id": "deepseek-flash", "family": "DeepSeek V4.1 Flash", "provider": "deepseek", "protocol": "responses"},
  "capabilities": {
    "profile": "generated-unverified",
    "installer": "generated-unverified",
    "skill": "generated-unverified",
    "supervisor_bridge": "experimental-unverified",
    "ultragoal": "runtime-unverified",
    "team": "runtime-unverified",
    "worktree": "runtime-unverified",
    "final_review": "runtime-unverified"
  }
}
```

- [ ] **Step 4: Add the machine-independent profile template**

Write exactly one standalone Codex profile file, not a `[profiles.*]` table:

```toml
model = "deepseek-flash"
model_provider = "deepseek"
model_reasoning_effort = "high"
forced_login_method = "api"
web_search = "disabled"
model_catalog_json = "__PCAOM_MODEL_CATALOG_PATH__"

[model_providers.deepseek]
name = "DeepSeek"
base_url = "https://api.deepseek.com/"
wire_api = "responses"
env_key = "DEEPSEEK_API_KEY"
env_key_instructions = "Set DEEPSEEK_API_KEY in the trusted launcher environment."
```

- [ ] **Step 5: Add the minimal model catalog and install map**

Use Codex model-catalog schema fields verified against the installed Codex version. The single model entry must enable `multi_agent_v2`, freeform patch, image input, parallel tool calls, and reasoning efforts `low`, `high`, and `max`. Map these four destinations in `install-manifest.json`:

```json
{
  "schema_version": 0,
  "owner": "pcaom:codex-omx-ds41-supervised-team",
  "files": [
    {"source": "codex/pcaom-ds41.config.toml", "scope": "codex_home", "destination": "pcaom-ds41.config.toml"},
    {"source": "codex/deepseek-models.json", "scope": "codex_home", "destination": "model-catalogs/pcaom-deepseek-models.json"},
    {"source": "project/.codex/skills/pcaom-ds41-team/SKILL.md", "scope": "project", "destination": ".codex/skills/pcaom-ds41-team/SKILL.md"},
    {"source": "project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs", "scope": "project", "destination": ".codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs"}
  ]
}
```

- [ ] **Step 6: Document generated and installed layouts**

In the bundle README, include prerequisites, `--dry-run`, install/uninstall commands, the trusted environment-variable boundary, the two tmux windows, all status levels, and a prominent statement that the initial artifact is `generated-unverified`.

- [ ] **Step 7: Run target tests and JSON parsing checks**

Run:

```bash
python3 -m unittest tests.test_codex_omx_ds41_target -v
python3 -m json.tool templates/codex-omx-ds41-supervised-team/pcaom-target.json >/dev/null
python3 -m json.tool templates/codex-omx-ds41-supervised-team/install-manifest.json >/dev/null
python3 -m json.tool templates/codex-omx-ds41-supervised-team/codex/deepseek-models.json >/dev/null
```

Expected: all commands exit 0.

- [ ] **Step 8: Commit the static target identity**

```bash
git add templates/codex-omx-ds41-supervised-team tests/test_codex_omx_ds41_target.py
git commit -m "feat: add ds41 supervised team target metadata"
```

### Task 3: Define the downstream Skill contract

**Files:**
- Create: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/SKILL.md`
- Modify: `tests/test_codex_omx_ds41_target.py`

- [ ] **Step 1: Add failing Skill contract assertions**

Add one test that requires the command surface and safety invariants:

```python
def test_skill_exposes_supervised_team_lifecycle(self):
    text = (BUNDLE / "project/.codex/skills/pcaom-ds41-team/SKILL.md").read_text()
    for command in ("start", "status", "await", "steer", "inspect", "resume", "finalize", "abort"):
        self.assertIn(f"supervisor-bridge.mjs {command}", text)
    for invariant in (
        "DS41 Codex Leader is the only execution-plane fan-out owner",
        "Official Codex must not edit code while DS41 Team is active",
        "named-buffer",
        "no daemon",
        "ACK:<message_id>",
        "BLOCKED_ARCHITECTURE",
        "BLOCKED_POLICY_CONFLICT",
    ):
        self.assertIn(invariant, text)
```

- [ ] **Step 2: Confirm the new assertion fails**

Run: `python3 -m unittest tests.test_codex_omx_ds41_target -v`

Expected: FAIL because `SKILL.md` is absent.

- [ ] **Step 3: Write the complete downstream workflow**

Use frontmatter `name: pcaom-ds41-team`. Document these exact user-level examples:

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

For `start`, require an approved `FEATURE_SPEC.md`, exact verification commands, cleanly explainable worktree state, and an explicit context-transfer authorization. For `finalize`, require terminal Team tasks, DS41 aggregate verification, shutdown evidence, and then official Codex re-read/diff/test/review. State that `await` is local and produces no model call, and that the Skill creates no daemon after the current turn ends.

- [ ] **Step 4: Run target tests**

Run: `python3 -m unittest tests.test_codex_omx_ds41_target -v`

Expected: PASS.

- [ ] **Step 5: Commit the Skill contract**

```bash
git add templates/codex-omx-ds41-supervised-team/project tests/test_codex_omx_ds41_target.py
git commit -m "feat: define ds41 supervised team skill"
```

### Task 4: Implement installer dry-run and successful installation

**Files:**
- Create: `templates/codex-omx-ds41-supervised-team/install.mjs`
- Create: `tests/test_codex_omx_ds41_installer.py`

- [ ] **Step 1: Add a subprocess-based installer test harness**

Create temporary bundle copies, project roots, and Codex homes. Invoke Node without a shell so paths cannot be reinterpreted:

```python
def run_installer(self, *args):
    return subprocess.run(
        ["node", str(self.bundle / "install.mjs"), *args],
        cwd=self.bundle,
        text=True,
        capture_output=True,
        check=False,
    )

def test_dry_run_writes_nothing(self):
    result = self.run_installer(
        "install", "--dry-run", "--project", str(self.project),
        "--codex-home", str(self.codex_home),
    )
    self.assertEqual(result.returncode, 0, result.stderr)
    self.assertEqual(list(self.project.iterdir()), [])
    self.assertEqual(list(self.codex_home.iterdir()), [])

def test_install_writes_four_files_and_resolves_catalog_path(self):
    result = self.run_installer(
        "install", "--project", str(self.project),
        "--codex-home", str(self.codex_home),
    )
    self.assertEqual(result.returncode, 0, result.stderr)
    profile = (self.codex_home / "pcaom-ds41.config.toml").read_text()
    expected = str((self.codex_home / "model-catalogs/pcaom-deepseek-models.json").resolve())
    self.assertIn(f'model_catalog_json = "{expected}"', profile)
    self.assertNotIn("__PCAOM_MODEL_CATALOG_PATH__", profile)
```

- [ ] **Step 2: Run the installer tests and confirm the missing-script failure**

Run: `python3 -m unittest tests.test_codex_omx_ds41_installer -v`

Expected: FAIL because `install.mjs` is absent.

- [ ] **Step 3: Implement argument and manifest validation**

Use only `node:fs`, `node:path`, `node:crypto`, and `node:url`. `parseArgs(argv)` must return `{command, dryRun, projectRoot, codexHome}`; `readManifest(bundleRoot)` must return the validated `{schema_version, owner, files}` object; `destinationRoot(scope, options)` must return only the canonical project root or Codex Home and must throw for every other scope.

Reject unknown arguments, repeated flags, missing absolute roots, unsupported schema versions, duplicate destinations, destinations escaping their root, missing source files, and any command other than `install` or `uninstall`. Emit exactly one JSON object to stdout on success and one JSON diagnostic to stderr on failure; never include environment values.

- [ ] **Step 4: Implement deterministic preparation and atomic writes**

Define:

```javascript
function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}
function renderSource(sourcePath, destinationPath, options) {
  const bytes = readFileSync(sourcePath);
  if (sourcePath.endsWith("pcaom-ds41.config.toml")) {
    const catalog = resolve(options.codexHome, "model-catalogs/pcaom-deepseek-models.json");
    return Buffer.from(bytes.toString("utf8").replace("__PCAOM_MODEL_CATALOG_PATH__", catalog));
  }
  return bytes;
}
function atomicWrite(destination, bytes) {
  mkdirSync(dirname(destination), {recursive: true});
  const temporary = `${destination}.pcaom-${process.pid}.tmp`;
  writeFileSync(temporary, bytes, {mode: 0o600});
  renameSync(temporary, destination);
}
```

Before writing, prepare the complete operation list and validate all sources/destinations so a predictable validation error cannot leave a partial install. `--dry-run` returns the operation list without creating directories or files.

- [ ] **Step 5: Run installer and target tests**

Run:

```bash
python3 -m unittest tests.test_codex_omx_ds41_installer -v
python3 -m unittest tests.test_codex_omx_ds41_target -v
node --check templates/codex-omx-ds41-supervised-team/install.mjs
```

Expected: all commands exit 0.

- [ ] **Step 6: Commit the installer happy path**

```bash
git add templates/codex-omx-ds41-supervised-team/install.mjs tests/test_codex_omx_ds41_installer.py
git commit -m "feat: install ds41 target bundle safely"
```

### Task 5: Harden installer ownership, receipts, idempotence, and uninstall

**Files:**
- Modify: `templates/codex-omx-ds41-supervised-team/install.mjs`
- Modify: `tests/test_codex_omx_ds41_installer.py`

- [ ] **Step 1: Add failing conflict and uninstall tests**

Cover four cases with isolated temporary directories:

```python
def test_unmanaged_collision_fails_without_changes(self):
    target = self.codex_home / "pcaom-ds41.config.toml"
    target.write_text("human-owned")
    before = target.read_bytes()
    result = self.install()
    self.assertNotEqual(result.returncode, 0)
    self.assertEqual(target.read_bytes(), before)

def test_second_identical_install_is_idempotent(self):
    self.assertEqual(self.install().returncode, 0)
    first = self.receipt_bytes()
    self.assertEqual(self.install().returncode, 0)
    self.assertEqual(self.receipt_bytes(), first)

def test_uninstall_refuses_modified_managed_file(self):
    self.assertEqual(self.install().returncode, 0)
    target = self.project / ".codex/skills/pcaom-ds41-team/SKILL.md"
    target.write_text(target.read_text() + "\nlocal edit\n")
    result = self.uninstall()
    self.assertNotEqual(result.returncode, 0)
    self.assertTrue(target.exists())

def test_uninstall_removes_only_receipt_owned_files(self):
    unrelated = self.project / ".codex/keep.txt"
    unrelated.parent.mkdir(parents=True)
    unrelated.write_text("keep")
    self.assertEqual(self.install().returncode, 0)
    self.assertEqual(self.uninstall().returncode, 0)
    self.assertEqual(unrelated.read_text(), "keep")
```

- [ ] **Step 2: Run the new tests and confirm ownership behavior is absent**

Run: `python3 -m unittest tests.test_codex_omx_ds41_installer -v`

Expected: FAIL on collision, receipt, or uninstall assertions.

- [ ] **Step 3: Add deterministic dual receipts**

Write identical semantic receipts to:

```text
<project>/.pcaom/installations/codex-omx-ds41-supervised-team.json
<codex-home>/pcaom-installations/codex-omx-ds41-supervised-team.json
```

Each receipt contains `schema_version`, `owner`, canonical `project_root`, canonical `codex_home`, bundle target digest, and sorted file records `{scope, destination, sha256}`. Do not add timestamps, random IDs, hostnames, or credentials; identical inputs must produce identical receipt bytes.

- [ ] **Step 4: Enforce fail-closed replacement and exact uninstall**

An existing destination may be replaced only when both receipts agree that the same owner manages it and its current digest matches the recorded digest. On uninstall, validate every managed digest before deleting anything; if one differs, delete nothing. Remove empty directories only while walking upward inside the exact managed project Skill or model-catalog directory, never above those roots.

- [ ] **Step 5: Add backup and read-back validation**

Before replacing an older managed file, copy its verified bytes under `.pcaom/backups/codex-omx-ds41-supervised-team/<digest>/` in the applicable root. After writes, re-read all files, compare digests, parse all JSON with `JSON.parse`, and ensure the installed profile contains the resolved catalog path and no unresolved marker. If read-back fails, restore only files touched during this invocation from in-memory previous bytes or delete newly created files.

- [ ] **Step 6: Run installer tests twice to prove deterministic behavior**

Run:

```bash
python3 -m unittest tests.test_codex_omx_ds41_installer -v
python3 -m unittest tests.test_codex_omx_ds41_installer -v
```

Expected: both runs PASS with the same test count.

- [ ] **Step 7: Commit installer hardening**

```bash
git add templates/codex-omx-ds41-supervised-team/install.mjs tests/test_codex_omx_ds41_installer.py
git commit -m "feat: enforce exact ds41 bundle ownership"
```

### Task 6: Implement bridge preflight, start, and inspect

**Files:**
- Create: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs`
- Create: `tests/test_codex_omx_ds41_bridge.py`

- [ ] **Step 1: Build deterministic fake CLI fixtures**

The test setup creates executable fake `tmux`, `omx`, and `codex` files in a temporary `bin` directory. Each executable appends JSON-encoded argv to a log path supplied by `PCAOM_TEST_CALL_LOG`; it returns responses selected by `PCAOM_TEST_SCENARIO`. Invoke the bridge with an explicit environment containing the fake `PATH`, `TMUX`, `TMUX_PANE`, and a synthetic API-key value.

- [ ] **Step 2: Add failing preflight/start/inspect tests**

Implement five explicit tests: `test_preflight_requires_tmux_and_api_key_without_leaking_value`, `test_start_creates_one_window_with_ds41_profile_and_worker_profile`, `test_start_uses_set_show_clear_paste_enter_sequence`, `test_start_timeout_kills_only_the_new_manifest_proven_window`, and `test_inspect_rejects_a_pane_not_owned_by_the_run_manifest`. Each test must assert the bridge exit code, parsed JSON output, and the exact fake-command argv log; the preflight test must additionally assert that the synthetic key value occurs in neither stdout nor stderr.

In the successful start test, require argv evidence for `codex --profile pcaom-ds41`, `OMX_TEAM_WORKER_CLI=codex`, and `OMX_TEAM_WORKER_LAUNCH_ARGS=--profile pcaom-ds41`. Require `tmux set-buffer -b`, `show-buffer -b`, `send-keys <pane> C-u`, `paste-buffer -p -d`, and the final explicit Enter in that order.

- [ ] **Step 3: Run the bridge tests and confirm the missing-script failure**

Run: `python3 -m unittest tests.test_codex_omx_ds41_bridge -v`

Expected: FAIL because `supervisor-bridge.mjs` is absent.

- [ ] **Step 4: Implement safe command execution and JSON output**

Use only `spawnSync` with argv arrays; never use shell command strings. Add these complete output and execution helpers, and use a separate `assertExactIdentity(expected, actual)` helper that compares session, window ID, and the sorted pane-ID arrays and throws on any mismatch:

```javascript
function redact(value) {
  const secret = process.env.DEEPSEEK_API_KEY;
  return secret ? String(value).split(secret).join("[REDACTED]") : String(value);
}

function run(program, args, options = {}) {
  const result = spawnSync(program, args, {encoding: "utf8", ...options});
  return {
    status: result.status ?? 1,
    stdout: redact(result.stdout ?? ""),
    stderr: redact(result.stderr ?? ""),
  };
}

function fail(code, message, evidence = {}) {
  process.stderr.write(`${JSON.stringify({ok: false, code, message: redact(message), evidence})}\n`);
  process.exit(1);
}

function succeed(command, evidence = {}) {
  process.stdout.write(`${JSON.stringify({ok: true, command, evidence})}\n`);
}
```

Redact any value matching `process.env.DEEPSEEK_API_KEY` before emitting output. Preflight checks tmux attachment, required executable versions, readable installed profile/catalog/Skill, nonempty key presence, approved Spec path, and explainable existing Team state before any mutation.

- [ ] **Step 5: Implement start with a run manifest and bounded rollback**

Create `.omx/pcaom-supervisor/<team>/run.json` atomically with exact session, new window ID, leader pane ID, expected Team name, Spec digest, profile name, and lifecycle state. Create only one new window named `ds41-team-<slug>`. Load the initial handoff into a fresh buffer named `pcaom-<team>-handoff`, read it back byte-for-byte, clear the leader composer, bracket-paste, submit, and recapture the pane to prove acceptance. On timeout, kill only the newly created window whose ID still matches the manifest; retain diagnostic evidence and never kill the supervisor window.

- [ ] **Step 6: Implement manifest-bounded inspect**

Resolve `leader` or a numeric pane only through the run manifest plus fresh tmux pane enumeration. Capture a bounded number of lines and redact the API-key sentinel. Reject current-pane inference, names without IDs, missing panes, and panes outside the recorded window.

- [ ] **Step 7: Run bridge syntax and behavior tests**

Run:

```bash
python3 -m unittest tests.test_codex_omx_ds41_bridge -v
node --check templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs
```

Expected: both commands exit 0.

- [ ] **Step 8: Commit the safe bridge startup path**

```bash
git add templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts tests/test_codex_omx_ds41_bridge.py
git commit -m "feat: start ds41 leader from codex supervisor"
```

### Task 7: Complete bridge supervision, recovery, and terminal-state gates

**Files:**
- Modify: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs`
- Modify: `tests/test_codex_omx_ds41_bridge.py`

- [ ] **Step 1: Add failing lifecycle tests**

Add fake scenarios for eight explicit tests: `test_status_returns_raw_team_summary_and_manifest_identity`, `test_await_timeout_does_not_launch_codex_or_send_tmux_keys`, `test_steer_sends_message_id_and_requires_matching_ack`, `test_mailbox_failure_uses_verified_named_buffer_and_marks_degraded`, `test_resume_requires_matching_team_window_and_leader_pane`, `test_finalize_rejects_pending_in_progress_or_failed_tasks`, `test_finalize_shuts_down_only_the_exact_terminal_team`, and `test_abort_uses_exact_team_identity_and_preserves_supervisor_window`. Every test must parse bridge JSON, inspect the exact fake-command argv sequence, and assert absence of unowned tmux/team targets.

- [ ] **Step 2: Run the lifecycle tests and confirm missing-command failures**

Run: `python3 -m unittest tests.test_codex_omx_ds41_bridge -v`

Expected: FAIL because the remaining subcommands are not implemented.

- [ ] **Step 3: Implement status and event-driven await**

`status` calls the installed OMX CLI's JSON status/summary surface and returns the raw parsed object alongside manifest identity; it must not reinterpret a nonterminal state as completion. `await --timeout-ms N` calls the installed local await surface once, returns `timeout` without invoking `codex`, and wakes only for `QUESTION`, `BLOCKED`, `FAILED`, story completion, Team completion, or an explicit Human query.

- [ ] **Step 4: Implement message-ID steering with capability degradation**

Generate a message ID from team identity, current process ID, and cryptographic random bytes. Send a structured payload from `supervisor` to `leader-fixed`, then poll the supervisor mailbox for exactly `ACK:<message_id>` and mark the matching entry delivered. Duplicate acknowledgements must be ignored. If the round trip is unsupported or times out, set `mailbox_supervision` to `degraded-tmux-fallback` in the run manifest and use the same fresh named-buffer verification sequence as startup; never promote the mailbox capability on fallback.

- [ ] **Step 5: Implement exact resume, finalize, and abort**

`resume` revalidates the recorded tmux session/window/panes and exact OMX Team identity before returning context. `finalize` requires every task terminal with no `pending`, `in_progress`, or `failed` tasks, requires DS41 aggregate verification evidence in the Team summary, then invokes exact Team shutdown and preserves a final handoff file for official Codex review. `abort` uses only OMX's exact cancellation/shutdown contract for the manifest Team; if identity proof changes or is missing, fail closed without enumerating or killing sessions.

- [ ] **Step 6: Run all bridge tests twice**

Run:

```bash
python3 -m unittest tests.test_codex_omx_ds41_bridge -v
python3 -m unittest tests.test_codex_omx_ds41_bridge -v
```

Expected: both runs PASS and no test output contains the synthetic API-key sentinel.

- [ ] **Step 7: Commit the lifecycle bridge**

```bash
git add templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs tests/test_codex_omx_ds41_bridge.py
git commit -m "feat: supervise and recover ds41 team runs"
```

### Task 8: Synchronize compiler methodology, root routing, and Experience Library

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/methodology/compiler-contract-v0.md`
- Modify: `docs/methodology/codex-omx-dsh-usage-guide.md`
- Modify: `docs/superpowers/specs/2026-09-25-reference-compiler-v0-design.md`
- Modify: `experience/omx.md`
- Modify: `templates/codex-omx-ds41-supervised-team/README.md`
- Modify: `tests/test_codex_omx_ds41_target.py`

- [ ] **Step 1: Add failing documentation contract tests**

Add assertions that the authoritative docs name both targets, keep DSH and DS41 mutually exclusive within one task tree, call the new target a template bundle rather than a completed compiler, and include `OMX-006` with an evidence grade:

```python
def test_authoritative_docs_route_the_new_target_without_claiming_a_compiler(self):
    expected = {
        ROOT / "README.md": "codex-omx-ds41-supervised-team",
        ROOT / "AGENTS.md": "DS41 Codex Leader",
        ROOT / "docs/methodology/compiler-contract-v0.md": "target adapter",
        ROOT / "docs/methodology/codex-omx-dsh-usage-guide.md": "Official Codex supervisor",
        ROOT / "experience/omx.md": "OMX-006",
    }
    for path, marker in expected.items():
        self.assertIn(marker, path.read_text(), path)
```

- [ ] **Step 2: Run the focused test and confirm documentation gaps**

Run: `python3 -m unittest tests.test_codex_omx_ds41_target -v`

Expected: FAIL on at least the root README, compiler contract, usage guide, or Experience entry.

- [ ] **Step 3: Update the source-of-truth routing**

Make these exact semantic changes:

- `README.md`: list Larry DSH and Codex+OMX+DS41 as parallel target bundles, and label the reference compiler as not yet implemented.
- `AGENTS.md`: route approved, cost-first implementation to either the explicitly selected Larry target or DS41 target; keep one fan-out owner and prohibit nesting.
- `compiler-contract-v0.md`: add `execution_target` as an explicit Project IR choice and require one target adapter in the output manifest.
- `codex-omx-dsh-usage-guide.md`: add the supervised DS41 flow and keep the existing DSH instructions intact.
- Reference compiler design: add the adapter boundary and the per-capability status map, without claiming emitter implementation.

Because `README.md` already contains user changes, inspect `git diff -- README.md` before editing and stage only the new target-routing hunk at commit time.

- [ ] **Step 4: Add the evidence-graded Experience entry**

Add `OMX-006 — Official Codex supervisor with low-cost DS41 Team` to `experience/omx.md` with:

```text
Trigger: approved Spec, long-running or parallel implementation, explicit DeepSeek transfer authorization.
Control: official Codex supervises; DS41 Leader alone owns Ultragoal, Team, and writes.
Evidence grade: mechanism-inference until synthetic runtime smoke; not dogfood evidence.
Failure boundary: mailbox fallback is degraded and cannot promote runtime status.
Verification: exact topology, model identity, worktrees, ACK, resume, terminal shutdown, and independent final review.
```

- [ ] **Step 5: Run documentation and existing Larry tests**

Run:

```bash
python3 -m unittest tests.test_codex_omx_ds41_target -v
python3 -m unittest tests.test_pcaom_agents_contract tests.test_larry_dsh_profile -v
```

Expected: PASS; Larry contracts remain unchanged.

- [ ] **Step 6: Commit only the intended documentation hunks**

Inspect `git diff` and use interactive staging for the pre-modified root README. Do not stage `docs/superpowers/plans/2026-09-19-pcaom-v0.md` or the unrelated observation.

```bash
git add -p README.md
git add AGENTS.md docs/methodology/compiler-contract-v0.md docs/methodology/codex-omx-dsh-usage-guide.md docs/superpowers/specs/2026-09-25-reference-compiler-v0-design.md experience/omx.md templates/codex-omx-ds41-supervised-team/README.md tests/test_codex_omx_ds41_target.py
git diff --cached --check
git commit -m "docs: route supervised ds41 team target"
```

### Task 9: Record static validation and configuration evidence

**Files:**
- Create: `docs/observations/2026-09-26-codex-omx-ds41-static-target.md`
- Modify only if evidence supports promotion: `templates/codex-omx-ds41-supervised-team/pcaom-target.json`

- [ ] **Step 1: Run the complete static suite**

Run:

```bash
python3 -m unittest discover -s tests -v
node --check templates/codex-omx-ds41-supervised-team/install.mjs
node --check templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs
find templates/codex-omx-ds41-supervised-team -name '*.json' -print0 | xargs -0 -n1 python3 -m json.tool >/dev/null
rg -n 'experimental_bearer_token|\[profiles\.|sk-[A-Za-z0-9]|__PCAOM_MODEL_CATALOG_PATH__' templates/codex-omx-ds41-supervised-team --glob '!codex/pcaom-ds41.config.toml'
git diff --check
```

Expected: unit tests and syntax/parsing checks exit 0; the secret/legacy/unresolved-marker search prints nothing; `git diff --check` exits 0.

- [ ] **Step 2: Exercise installer round trips in isolated roots**

Use `mktemp -d` and explicit child paths. Run `--dry-run`, assert both roots remain empty, run install, parse installed JSON and TOML through the tests, run the identical install again, then uninstall. Confirm only the PCAOM-owned files and receipts disappear. Do not point this test at the real project root or real Codex Home.

- [ ] **Step 3: Optionally establish config verification on the real pinned runtime**

Only when Codex CLI reports `0.156.1`, install into a disposable Codex Home, set `DEEPSEEK_API_KEY` in the trusted launcher environment without echoing it, and launch `codex --profile pcaom-ds41` far enough to capture a redacted banner showing `deepseek-flash`. This step does not start OMX Team and does not establish runtime-smoke status.

- [ ] **Step 4: Write the static observation from actual command output**

Record date/timezone, repository commit, exact commands, component versions, pass/fail result, and unrun checks. State one of these outcomes exactly:

```text
Artifact status: generated-unverified; static contract tests passed; real profile startup not run.
```

or, only if Step 3 succeeded:

```text
Artifact status: config-verified for profile and installer only; Team, worktree, bridge, and final-review capabilities remain runtime-unverified.
```

- [ ] **Step 5: Promote only evidence-backed capability fields**

If Step 3 was not run or did not pass, do not edit status fields. If it passed, change only `capabilities.profile` and `capabilities.installer` to `config-verified`; keep the bundle's overall status `generated-unverified` until all required runtime smoke checks pass.

- [ ] **Step 6: Re-run tests after any status edit and commit evidence**

Run: `python3 -m unittest discover -s tests -v`

Expected: PASS.

```bash
git add docs/observations/2026-09-26-codex-omx-ds41-static-target.md templates/codex-omx-ds41-supervised-team/pcaom-target.json
git commit -m "test: record ds41 target static evidence"
```

### Task 10: Run credential-gated synthetic runtime smoke

**Files:**
- Create only after execution: `docs/observations/2026-09-26-codex-omx-ds41-runtime-smoke.md`
- Modify only after complete evidence: `templates/codex-omx-ds41-supervised-team/pcaom-target.json`

- [ ] **Step 1: Enforce runtime prerequisites before mutation**

From a real tmux session, verify exact versions, a nonempty `DEEPSEEK_API_KEY`, no active conflicting Team, and a disposable synthetic Git repository. Stop this task without changing status if credentials or runtime prerequisites are unavailable. Never print the key or pass it as a command-line argument.

- [ ] **Step 2: Install into a disposable Codex Home and synthetic project**

Use explicit temporary paths and the installer from Task 5. Create a synthetic `FEATURE_SPEC.md` whose work has at least two independent lanes, exact tests, a deliberate Worker question, and a deliberate recoverable failure. Start an official-subscription supervisor Codex in tmux window 0 and invoke `$pcaom-ds41-team start --spec FEATURE_SPEC.md --workers 2`.

- [ ] **Step 3: Capture topology, provider, and worktree evidence**

Record redacted evidence proving two independent Codex processes in one session; supervisor window 0; DS41 Leader, Worker panes, and HUD in window 1; Leader and all Workers reporting `deepseek-flash`; and each Worker using an independent worktree. A profile file or launch argv alone is insufficient provider evidence.

- [ ] **Step 4: Exercise event-driven supervision and recovery**

Run `status` and an `await` timeout while recording that no Codex process is launched and no tmux keys are sent. Then exercise a `QUESTION`, `steer`, matching `ACK:<message_id>`, duplicate ACK handling, `BLOCKED` or recoverable failure, `resume`, and the documented named-buffer fallback. Record whether external-supervisor mailbox round-trip is supported; if not, leave it experimental/degraded.

- [ ] **Step 5: Prove terminal gates and independent final review**

Show that `finalize` rejects a nonterminal Team. Complete all tasks, have the DS41 Leader run aggregate verification, checkpoint Ultragoal, and perform exact Team shutdown. Then have official Codex independently re-read the workspace and diff, rerun the Spec verification commands, and return `PASS`, `CHANGES_REQUIRED`, or a named blocker. Confirm the supervisor window survives.

- [ ] **Step 6: Record evidence and promote capabilities independently**

Create the runtime observation with exact commands, versions, redacted outputs, task lifecycle, token/cost information available from the providers, failures, recovery, and unverified gaps. Set a capability to `runtime-smoke-verified` only when its own check passed. Set overall status to `runtime-smoke-verified` only if topology, real model identity, worktrees, event/ACK path, recovery, exact shutdown, and official final review all passed; otherwise retain the lower status and list the gap.

- [ ] **Step 7: Run regression tests and commit runtime evidence**

Run: `python3 -m unittest discover -s tests -v`

Expected: PASS.

```bash
git add docs/observations/2026-09-26-codex-omx-ds41-runtime-smoke.md templates/codex-omx-ds41-supervised-team/pcaom-target.json
git commit -m "test: record ds41 supervised runtime smoke"
```

If the runtime observation was not created because prerequisites were absent, make no empty commit and report the explicit verification gap.

### Task 11: Perform final implementation review and handoff

**Files:**
- Modify only files required by review findings

- [ ] **Step 1: Run the final local verification matrix**

Run:

```bash
python3 -m unittest discover -s tests -v
node --check templates/codex-omx-ds41-supervised-team/install.mjs
node --check templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs
git diff --check
git status --short
```

Expected: all tests and syntax checks pass; status shows only explicitly preserved pre-existing user changes or deliberate uncommitted runtime evidence.

- [ ] **Step 2: Run the bounded cleanup review**

Invoke `$ai-slop-cleaner` only on the changed installer, bridge, tests, and target documentation. Preserve behavior with the green suite, prefer deletion and existing helpers, add no dependencies, and rerun Step 1 after any edit.

- [ ] **Step 3: Run an independent code review**

Invoke `$code-review` with the approved design, this plan, the complete target diff, static observation, and runtime observation if present. Require findings to distinguish correctness defects from unverified capabilities. Fix every critical or important finding with a regression test, then rerun Step 1.

- [ ] **Step 4: Verify status language against evidence**

Search all new artifacts for `config-verified`, `runtime-smoke-verified`, `dogfood-verified`, `stable`, and `supported`. For every occurrence, point to the exact observation evidence. Downgrade claims that lack evidence; the mailbox bridge remains experimental until successful repeated dogfood.

- [ ] **Step 5: Produce the final handoff**

Report changed files, commits, exact passing commands and counts, the actual bundle/capability status, runtime checks not run, remaining risks, and the preserved pre-existing worktree changes. Do not describe the reference compiler, daemon monitoring, or dogfood as complete unless their separate evidence exists.
