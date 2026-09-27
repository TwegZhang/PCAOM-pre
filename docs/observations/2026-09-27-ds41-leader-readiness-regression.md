# DS41 Leader readiness and Team namespace regression — 2026-09-27

## Scope

- Runtime baseline: Codex CLI `0.156.1`, oh-my-codex `0.21.6`, tmux `3.7b`.
- Real downstream evidence came from the authorized O2 run `kg02-walking-4`.
- The repair was developed and tested in PCAOM only. It was not installed into
  O2 while that held run was being integrated and shut down.
- No credential value was read, printed, or recorded.

## Observed failures

The DS41 Leader pane remained on Codex's startup update chooser for captures at
approximately three and six seconds. The prior bridge treated
`pane_current_command=codex` as readiness evidence, pasted the handoff into that
modal, and spent the same timeout budget on both TUI readiness and the later ACK.
After the operator chose **Skip until next version**, the same O2 Leader accepted
the handoff and produced the required ACK. This establishes that the original
failure was a TUI-state detection defect, not a DeepSeek identity or credential
failure.

The O2 Team later created OMX 0.21.6's regular JSON runtime sidecar
`team/notice-ledger.json`. The prior namespace validator counted every entry as a
Team candidate, so passive Bridge status failed with `IDENTITY_INVALID` despite
one valid Team directory.

The same real run also showed all three approved DAG nodes initially allocated to
worker-1. Local reproduction against the pinned OMX allocator showed that both
role-agnostic `3` and shared-role `3:executor` launch forms can collapse these
overlapping lanes. O2 recovered the live tasks through OMX's supported
claim/release lifecycle before they became terminal, but static worker assignment
metadata did not synchronize back. This is a pinned upstream/runtime limitation,
not a capability repaired by PCAOM; the bridge must verify persisted ownership and
stop before implementation when allocation is wrong.

## Repair

- The standalone DS41 Profile sets `check_for_update_on_startup = false`.
- Startup now waits for the actual interactive composer, detects the update modal
  as `LEADER_TUI_BLOCKED`, and sends no handoff while it is present.
- Readiness and acknowledgment use independent timeout budgets. Failed startup
  preserves only the latest bounded, redacted `leader-pane-diagnostic.txt` and
  records its relative path in the run manifest.
- Namespace validation accepts exactly one bounded, regular, non-symlink
  `notice-ledger.json` JSON-object sidecar beside the sole Team directory. Unknown,
  malformed, or symlink entries still fail closed.
- Documentation no longer presents `N:executor` as a lane-preservation mechanism.
  PCAOM does not replace or patch the OMX allocator.

## Verification boundary

Fresh PCAOM verification passed:

```text
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest \
  tests.test_codex_omx_ds41_bridge \
  tests.test_codex_omx_ds41_target \
  tests.test_codex_omx_ds41_installer \
  tests.test_ds41_evidence_verifier -v

Ran 132 tests in 300.693s
OK

PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -q
Ran 148 tests in 311.216s
OK

PYTHONDONTWRITEBYTECODE=1 python3.12 -m unittest \
  tests.test_codex_omx_ds41_target tests.test_codex_omx_ds41_installer -q
Ran 46 tests in 6.295s
OK
```

Both JavaScript entry points passed `node --check`; `git diff --check` exited 0.
`node scripts/verify-ds41-installer-roundtrip.mjs` returned `ok: true` for the
dry-run, install, identical reinstall, parsed profile/catalog, exact uninstall,
sentinel preservation, and cleanup checks. Codex CLI 0.156.1 also accepted
`-c check_for_update_on_startup=false` in a real `debug prompt-input` parse.

This observation does not claim a post-fix real Team smoke: no repaired bundle
has yet been installed into O2, and the overall target remains
`generated-unverified`.
