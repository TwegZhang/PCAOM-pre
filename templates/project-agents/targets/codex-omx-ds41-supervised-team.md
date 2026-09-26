## Execution ownership

- DS41 Codex Leader is the only execution-plane fan-out owner for the active task tree.
- DS41 Codex Leader owns Ultragoal, OMX Team lifecycle, Worker delegation, implementation, and aggregate verification.
- Official Codex must not edit code while DS41 Team is active; it owns requirements, bounded steering, and independent final review after Team terminal state.
- Larry DSH and DS41 OMX Team must never be active in the same task tree. Switching targets requires an explicit handoff after the current runtime reaches a terminal state.

A stronger model alone does not justify fan-out. Start OMX Team only for genuinely
independent lanes whose coordination benefit justifies the cost; record the
trigger and expected benefit. These are policy requirements, not claims of
runtime enforcement.

## Blockers and Final Review

Report `BLOCKED_ARCHITECTURE` and stop dependent implementation when scope or
architecture needs revision; return the decision to Human + Official Codex.
Report `BLOCKED_POLICY_CONFLICT` and stop dependent work when instruction
priority cannot be resolved. Do not override project-owned instructions.

DS41 Codex Leader must provide fresh evidence from aggregate verification.
After Team terminal state, Official Codex must independently re-read the workspace
and diff, run the required verification commands, and review against the approved
Spec before returning `PASS` or `CHANGES_REQUIRED`. Model output alone is not
proof of successful execution. Static checks do not establish runtime or dogfood
success. Scoped repairs remain with DS41 Codex Leader and require fresh
verification and another independent final review.
