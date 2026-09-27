# Codex + OMX + DS41 supervised Team runtime observation — 2026-09-27

## Scope and safety boundary

- Disposable synthetic repository only; no private project content was sent.
- `DEEPSEEK_API_KEY` presence was checked without reading, printing, or recording
  its value.
- Runtime: Codex CLI `0.156.1`, oh-my-codex `0.21.6`, tmux `3.7b`, Node.js
  `22.22.2`, model catalog entry `deepseek-flash` (DeepSeek V4.1 Flash).
- The standalone Profile used `approval_policy = "never"` and
  `sandbox_mode = "danger-full-access"` in the exact trusted synthetic project.
  This was necessary for Git worktree metadata and the existing tmux socket and
  is not a safe default for arbitrary repositories.

## Successful r14 evidence

1. A direct real provider call through the installed Profile returned the
   requested `DS41_PROFILE_OK` marker. The Leader and both Team workers displayed
   `DeepSeek V4.1 Flash high`.
2. Bridge `start` created one separate DS41 Leader window while preserving the
   official Codex supervisor window. The Team used an isolated run-specific state
   root and created two detached Git worktrees.
3. An approved Team DAG preserved two independent lanes:
   `clamp -> worker-1/executor` and
   `normalize -> worker-2/team-executor`. Both persisted tasks declared
   `delegation.mode = none`; exact session-log search found no `spawn_agent` tool
   call and the isolated state root contained one Team only.
4. Worker 2 asked the required Unicode-whitespace question before editing. The
   official supervisor answered through Bridge `steer`; OMX mailbox delivery did
   not produce the file ACK within the initial bound, so the bridge used its
   documented, identity-checked tmux fallback. The Leader created the exact file
   ACK and the bridge returned `acknowledged: true`.
5. Worker commits were integrated into the synthetic root. The Leader ran
   `python3 -m unittest discover -s tests -v`; official Codex independently ran
   the same command before and after shutdown. Each integrated run passed four
   tests. `git diff --check` passed and the final diff contained only
   `src/__init__.py`, `src/math_utils.py`, and `src/text_utils.py`.
6. `leader-final.json` named the exact Team/context, recorded the verification
   command with exit code 0, and matched the SHA-256 of the final handoff.
7. Bridge `finalize` accepted the exact OMX shutdown success line after diagnostic
   output, removed the exact Team directory and worker/HUD panes, and preserved
   the official supervisor pane. The completed DS41 Leader window was then closed
   explicitly; the supervisor pane remained live. Because the Leader had already
   cherry-picked both lane commits, OMX shutdown also created two merge commits;
   its reports showed no additional diff, and post-shutdown tests confirmed the
   workspace content was unchanged.

## Repository verification

- `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest discover -s tests -q`:
  140 tests, exit 0, `OK` (final rerun: 323.690 seconds).
- `PYTHONDONTWRITEBYTECODE=1 python3.12 -m unittest
  tests.test_codex_omx_ds41_target tests.test_codex_omx_ds41_installer
  tests.test_codex_omx_ds41_bridge -v`: 115 tests, exit 0, `OK`.
- Both JavaScript entry points passed `node --check`; all three target JSON files
  parsed successfully; `git diff --check` exited 0.
- `node scripts/verify-ds41-installer-roundtrip.mjs` completed dry-run, install,
  identical reinstall, parsed profile/catalog validation, exact uninstall, sentinel
  preservation, and temporary cleanup with `ok: true`.

## Superseded attempts and resulting fixes

- r10: OMX appended its configured default model, so DeepSeek rejected the worker
  model. The worker launch contract now includes both the Profile and explicit
  `--model deepseek-flash`; shutdown parsing now accepts one exact success line
  after bounded diagnostics instead of requiring it as stdout line one.
- r11: shell initialization replaced inherited worker arguments. GO now requires
  re-exporting the exact worker CLI/arguments in the same shell command as Team
  launch and inspecting generated worker startup scripts before binding.
- r12: an explicit shared `2:executor` override collapsed distinct DAG roles onto
  one worker. r13 also collapsed lanes because overlapping task hints affected
  OMX allocation. r14 used the approved role-agnostic launch hint verbatim,
  distinct roles, and narrow non-overlapping task descriptions; persisted owners
  then matched the approved lanes.
- OMX rejected earlier dirty repositories. The bridge now preflights
  `git status --porcelain=v1 --untracked-files=all` before window creation.

## Limits and verdict

The overall target remains `generated-unverified`. This run establishes
`config-verified` for the Profile and installer and `runtime-smoke-verified` for
the bounded Team, worktree, and independent-final-review capabilities. It does
not promote the whole Skill or experimental supervisor bridge.

Unverified: `resume`, forced `abort`, crash/restart recovery, unattended operation,
real-project dogfood, cost/latency comparison, and production reliability.
Ultragoal encountered an objective-mismatch checkpoint during this run; the DS41
Leader manually reconciled the durable plan before continuing, so Ultragoal stays
`runtime-unverified`. The observed steering path was documented degraded fallback
with exact file ACK, not a verified reverse mailbox or general mailbox round trip.
