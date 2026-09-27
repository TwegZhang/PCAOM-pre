# DS41 Leader Readiness and Update-Modal Hardening Design

**Status:** Approved design; implementation and downstream deployment pending.

## Problem

The supervised DS41 bridge currently treats a tmux pane whose current command is
`codex` as an interactive-ready Leader. Codex CLI `0.156.1` can display an
update modal before the composer accepts input. The bridge then pastes its
handoff into the modal, waits for an acknowledgment that the Leader never saw,
and reports a generic timeout.

Observed O2 failures safely rolled back before Ultragoal, Team, workers, or
implementation started. A controlled launch reproduced the modal for at least
six seconds:

```text
Update available · 0.156.1 → 0.157.1
1. Update now
2. Skip
3. Skip until next version
```

Increasing the existing timeout alone cannot repair an indefinitely blocking
modal.

## Scope

This change hardens the generated `codex-omx-ds41-supervised-team` target in
PCAOM. It will:

1. disable startup update checks in the standalone `pcaom-ds41` Profile;
2. require positive interactive-composer readiness before handoff;
3. reject a recognized blocking update modal with a precise error;
4. give Leader readiness and acknowledgment independent bounded wait budgets;
5. persist a bounded, redacted final pane capture before safe rollback; and
6. add regression coverage and synchronize the generated Skill documentation.

It will not automate modal keypresses, update Codex, change the pinned runtime,
launch a Team, modify O2, or publish/install the repaired artifacts downstream.

## Alternatives

### Selected: profile prevention plus bridge detection

Set `check_for_update_on_startup = false` in the standalone Profile and retain a
bridge-side guard for known update-modal output. This prevents the observed
prompt while making future configuration or version drift fail visibly rather
than misdirecting the handoff.

### Rejected: profile setting only

This is smaller, but a missing/overridden setting or another blocking startup
state would recreate the silent handoff failure.

### Rejected: automatically choose “Skip”

Driving a version-specific modal with keystrokes is brittle. A layout or focus
change could select “Update now” or corrupt another prompt, creating an
unacceptable external mutation risk.

## Runtime Design

### Profile

The generated `pcaom-ds41.config.toml` will set:

```toml
check_for_update_on_startup = false
```

The installer continues to validate and install the Profile through its
existing managed-file path. No global user configuration is modified.

### Readiness gate

For each poll, the bridge will revalidate exact tmux server/session/window/pane
identity, require a live pane, and capture bounded output. Readiness requires
both:

- `pane_current_command` resolves to `codex`; and
- the captured TUI contains the interactive composer marker.

Recognized fatal startup output remains an immediate failure. Recognized Codex
update-modal output becomes an immediate `LEADER_TUI_BLOCKED` failure before
any named buffer, paste, or Enter action. Other non-ready states continue to
poll until the readiness budget expires.

The composer marker is not sufficient by itself: modal rejection is evaluated
first because the composer may remain visible behind the modal.

### Timeout semantics

`--startup-timeout-ms` remains the bounded duration configured by callers, but
is applied separately to:

1. Leader interactive readiness; and
2. handoff acknowledgment.

The acknowledgment deadline starts only after readiness is proven and the
handoff is submitted. This prevents slow but valid startup from consuming the
entire Leader response budget. The maximum pre-GO elapsed time can therefore be
approximately twice the configured value plus bounded bridge commands.

### Failure evidence and rollback

Before rollback of a proven bridge-owned window, the bridge writes the last
bounded pane capture to the run directory as a regular, non-symlink,
permission-restricted file. Existing secret redaction is applied before the
write. The manifest records the relative evidence filename and precise failure
code/stage.

The bridge retains its current exact-identity rollback rule. It never kills a
window whose identity changed, and it never treats captured text as acceptance
evidence.

## Tests

Implementation follows red-green-refactor:

1. Add a fake-tmux update-modal scenario and prove that the current bridge
   incorrectly submits the handoff.
2. Require the repaired bridge to fail at `readiness` with
   `LEADER_TUI_BLOCKED`, persist redacted diagnostics, submit no buffer or keys,
   and kill only the proven owned window.
3. Add a not-yet-ready composer scenario and prove it waits rather than
   submitting early.
4. Prove readiness and acknowledgment receive independent timeout budgets.
5. Require the generated Profile and installer round-trip to preserve
   `check_for_update_on_startup = false`.
6. Run the focused bridge, target, and installer suites, syntax checks,
   installer round-trip, full PCAOM tests, and `git diff --check`.

Tests based on fake processes establish bridge behavior only. A later real
runtime smoke is required before promoting runtime evidence.

## Release Boundary

This change is implemented and verified only in PCAOM. It must not be copied,
installed, deployed, or published to O2 while the current O2 DS41 Team run is in
progress. Downstream deployment requires a separate explicit instruction after
that run reaches a safe terminal state and its evidence is preserved.

