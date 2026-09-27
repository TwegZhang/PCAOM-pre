# DS41 Leader Readiness and Update-Modal Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent Codex startup modals from consuming the DS41 Leader handoff, produce precise retained diagnostics, and preserve an independent ACK wait budget without deploying the change to O2.

**Architecture:** The standalone DS41 Profile disables Codex startup update checks, while the supervisor bridge independently proves composer readiness and rejects the observed modal before any input delivery. The bridge records the last redacted bounded pane capture on failure and resets its bounded deadline between readiness and acknowledgment. Existing exact tmux identity, named-buffer, ACK, rollback, and secret-redaction contracts remain authoritative.

**Tech Stack:** Node.js ESM bridge and installer, tmux CLI, Codex TOML Profile, Python `unittest` synthetic-process fixtures.

---

## File Map

- Modify `templates/codex-omx-ds41-supervised-team/codex/pcaom-ds41.config.toml`: disable update checks only in the standalone DS41 Profile.
- Modify `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs`: validate the new Profile field, gate handoff on the composer, reject the update modal, split timeout budgets, and persist failure capture.
- Modify `tests/test_codex_omx_ds41_bridge.py`: add fake startup states and bridge regression assertions.
- Modify `tests/test_codex_omx_ds41_target.py`: lock the exact Profile bytes and parsed configuration.
- Modify `tests/test_codex_omx_ds41_installer.py`: prove installation preserves the new Profile key.
- Modify `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/SKILL.md`: document readiness, modal failure, independent timeout budgets, and diagnostic evidence.
- Modify `templates/codex-omx-ds41-supervised-team/README.md`: document the generated Profile control and runtime failure evidence.
- Create `docs/observations/2026-09-27-ds41-leader-readiness-regression.md`: record commands, versions, synthetic evidence, and the real-runtime verification gap.

### Task 1: Lock the Profile update-check control

**Files:**
- Modify: `tests/test_codex_omx_ds41_target.py:100-146`
- Modify: `tests/test_codex_omx_ds41_installer.py:124-176`
- Modify: `templates/codex-omx-ds41-supervised-team/codex/pcaom-ds41.config.toml:1-8`
- Modify: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs:156-184`

- [ ] **Step 1: Add failing Profile tests**

Add `check_for_update_on_startup = false` to `expected_text` and add
`"check_for_update_on_startup": False` to `expected_profile` in the target
test. In the installer test, parse the installed Profile and assert:

```python
self.assertIs(tomllib.loads(profile)["check_for_update_on_startup"], False)
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  tests.test_codex_omx_ds41_target.CodexOmxDs41TargetTests.test_profile_uses_environment_auth_and_separate_profile_file \
  tests.test_codex_omx_ds41_installer.CodexOmxDs41InstallerTests.test_install_writes_exactly_four_files_and_resolves_catalog -v
```

Expected: FAIL because the generated Profile does not contain
`check_for_update_on_startup = false`.

- [ ] **Step 3: Implement the minimal Profile change**

Insert this top-level TOML field before `model_catalog_json`:

```toml
check_for_update_on_startup = false
```

Extend the bridge's exact top-level Profile expectation:

```js
'': {
  model:'deepseek-flash',
  model_provider:'deepseek',
  model_reasoning_effort:'high',
  web_search:'disabled',
  approval_policy:'never',
  sandbox_mode:'danger-full-access',
  check_for_update_on_startup:false,
  model_catalog_json:path.join(home,'model-catalogs/pcaom-deepseek-models.json'),
},
```

- [ ] **Step 4: Run the focused tests and verify GREEN**

Run the Step 2 command. Expected: both tests PASS.

### Task 2: Reject the blocking modal before handoff

**Files:**
- Modify: `tests/test_codex_omx_ds41_bridge.py:16-171, 747-758`
- Modify: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs:314-324, 344-445`

- [ ] **Step 1: Add a failing update-modal fixture and test**

Make fake `capture-pane` return the observed modal for scenario
`update-modal`, including a fake secret to prove redaction:

```python
if scenario == 'update-modal':
    print('Ask Codex to do anything')
    print('Update available · 0.156.1 → 0.157.1')
    print('1. Update now')
    print('2. Skip')
    print('3. Skip until next version')
    print(os.environ.get('DEEPSEEK_API_KEY', ''))
```

Add a test requiring readiness failure, no handoff delivery, retained redacted
capture, and exact-window rollback:

```python
def test_update_modal_blocks_handoff_and_persists_redacted_capture(self):
    self.env['PCAOM_TEST_SCENARIO'] = 'update-modal'
    result, data = self.start()
    self.assert_failure((result, data), 'readiness', 'LEADER_TUI_BLOCKED')
    self.assertEqual(self.calls('set-buffer'), [])
    self.assertEqual(self.calls('send-keys'), [])
    self.assertEqual(self.calls('kill-window'), [
        {'program': 'tmux', 'args': ['kill-window', '-t', '@2'],
         'manifest_state': 'failed', 'state_root': None,
         'selected_env': {'OMX_TEAM_WORKER_CLI': None,
                          'OMX_TEAM_WORKER_LAUNCH_ARGS': None}}
    ])
    run = json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
    evidence = self.project/run['leader_diagnostic_path']
    self.assertIn('Update available', evidence.read_text())
    self.assertIn('[REDACTED]', evidence.read_text())
    self.assertNotIn(self.env['DEEPSEEK_API_KEY'], evidence.read_text())
```

Use the existing call helper's actual record shape if its environment fields
make the exact dictionary noisy; the invariant is the single exact
`kill-window -t @2` call.

- [ ] **Step 2: Run the modal test and verify RED**

Run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  tests.test_codex_omx_ds41_bridge.BridgeTests.test_update_modal_blocks_handoff_and_persists_redacted_capture -v
```

Expected: FAIL because the existing bridge treats the `codex` process as ready
and submits a handoff.

- [ ] **Step 3: Implement modal rejection and diagnostic capture**

Introduce exact bounded predicates and capture recording:

```js
const updateModal = output =>
  /Update available\s*·[^\n]+/i.test(output) &&
  /Skip until next version/i.test(output);
const interactiveComposer = output => /(?:^|\n)\s*› Ask Codex to do anything\s*(?:\n|$)/.test(output);
function recordLeaderCapture(output) { return redact(output).slice(-8192); }
```

Update `waitForLeader` to evaluate in this order: exact identity, pane liveness,
bounded capture, fatal output, update modal, composer readiness. For the modal:

```js
const error = new Error('Leader TUI blocked by Codex update prompt');
error.code = 'LEADER_TUI_BLOCKED';
throw error;
```

Pass a callback into readiness and acknowledgment polling so `start` always
holds the last redacted capture. In the catch path, before killing a proven
owned window, exclusively create `leader-pane-diagnostic.txt` with mode `0600`
when capture exists, and record its project-relative path in
`manifest.leader_diagnostic_path`.

- [ ] **Step 4: Run the modal test and verify GREEN**

Run the Step 2 command. Expected: PASS.

### Task 3: Require composer readiness and independent ACK time

**Files:**
- Modify: `tests/test_codex_omx_ds41_bridge.py:16-171, 747-758, 929-934`
- Modify: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs:314-343, 383-404`

- [ ] **Step 1: Add failing startup and deadline tests**

Add scenario `composer-delayed` whose first two `capture-pane` calls return only
`Codex loading`, then return `› Ask Codex to do anything`. Assert the first
`set-buffer` call occurs after at least three captures.

Add scenario `ack-after-readiness-budget`: delay readiness for most of the
configured startup budget, then write a valid ACK only after handoff. Invoke
with a small test timeout and assert start succeeds because ACK receives a new
full budget.

- [ ] **Step 2: Run both tests and verify RED**

Run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  tests.test_codex_omx_ds41_bridge.BridgeTests.test_handoff_waits_for_interactive_composer \
  tests.test_codex_omx_ds41_bridge.BridgeTests.test_ack_receives_independent_timeout_budget -v
```

Expected: the composer test shows early submission or the timeout-budget test
fails under the shared deadline.

- [ ] **Step 3: Implement the minimal readiness and deadline changes**

Require `interactiveComposer(output)` before returning from `waitForLeader`.
Reset the global deadline after readiness and start a new deadline only after
handoff submission:

```js
deadline = Date.now() + options['startup-timeout-ms'];
stage = 'readiness';
waitForLeader(manifest, rememberCapture);
deadline = undefined;
// verified named-buffer handoff transport
stage = 'acceptance';
deadline = Date.now() + options['startup-timeout-ms'];
waitForAcknowledgment(manifest, acknowledgmentPath, acknowledgment, rememberCapture);
deadline = undefined;
```

- [ ] **Step 4: Run both tests and verify GREEN**

Run the Step 2 command. Expected: both PASS.

- [ ] **Step 5: Run the complete bridge suite**

Run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests.test_codex_omx_ds41_bridge -v
```

Expected: all bridge tests PASS with zero failures/errors.

### Task 4: Synchronize operator documentation and evidence

**Files:**
- Modify: `templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/SKILL.md:205-215`
- Modify: `templates/codex-omx-ds41-supervised-team/README.md`
- Create: `docs/observations/2026-09-27-ds41-leader-readiness-regression.md`
- Modify: `tests/test_codex_omx_ds41_target.py:186-237`

- [ ] **Step 1: Add failing documentation-contract assertions**

Require the Skill or bundle README to contain these exact operator concepts:

```python
for required in (
    "check_for_update_on_startup = false",
    "LEADER_TUI_BLOCKED",
    "leader-pane-diagnostic.txt",
    "independent readiness and acknowledgment budgets",
):
    self.assertIn(required, text)
```

- [ ] **Step 2: Run the target test and verify RED**

Run:

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest tests.test_codex_omx_ds41_target -v
```

Expected: FAIL because the generated documentation lacks the new contract.

- [ ] **Step 3: Update the Skill, README, and observation**

Document that the Profile suppresses startup update checks, the bridge still
fails closed on a detected modal, readiness and ACK each have a bounded budget,
and the retained diagnostic is redacted local evidence rather than acceptance.

The observation must record:

```text
Environment: Codex 0.156.1, OMX 0.21.6, tmux 3.7b
Original reproduction: update modal remained visible at 3s and 6s
Synthetic regression: exact commands and pass/fail counts
Gap: no repaired bundle was deployed to O2 and no post-fix real Team smoke ran
```

- [ ] **Step 4: Run the target test and verify GREEN**

Run the Step 2 command. Expected: all target tests PASS.

### Task 5: Full verification without downstream deployment

**Files:**
- Verify all modified PCAOM files only.

- [ ] **Step 1: Run focused target suites**

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  tests.test_codex_omx_ds41_bridge \
  tests.test_codex_omx_ds41_target \
  tests.test_codex_omx_ds41_installer \
  tests.test_ds41_evidence_verifier -v
```

Expected: all focused tests PASS.

- [ ] **Step 2: Run syntax and artifact validation**

```sh
node --check templates/codex-omx-ds41-supervised-team/install.mjs
node --check templates/codex-omx-ds41-supervised-team/project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs
node scripts/verify-ds41-installer-roundtrip.mjs
git diff --check
```

Expected: both syntax checks exit 0, round-trip prints `"ok":true`, and diff
check exits 0.

- [ ] **Step 3: Run the full repository suite**

```sh
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -q
```

Expected: exit 0 with zero failures/errors.

- [ ] **Step 4: Audit scope and downstream boundary**

Run:

```sh
git status --short
git diff --name-only HEAD
```

Expected: only planned PCAOM source/test/docs files plus the user's pre-existing
README, old plan, and observation changes appear. No path under
`/Volumes/data/githubCode/Omini2Workspace/O2-desktop` is written or deployed.

- [ ] **Step 5: Commit only the repair-owned files**

Stage the Profile, bridge, tests, generated Skill/README, observation, and this
plan; explicitly exclude all pre-existing unrelated workspace changes. Commit:

```sh
git commit -m "fix(ds41): harden leader startup readiness"
```

Do not push, install, publish, or copy artifacts to O2.

