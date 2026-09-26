## Execution Plane

Use Codex directly for small, bounded work, OMX for ambiguous or quality-first
exploration, and DSH for implementation from an approved Spec. DeepSeek is the
default DSH worker. Larry DSH is the only execution-plane fan-out owner within DSH
execution; delegated experts must not start competing orchestration. Do not nest
OMX and DSH without evidence of benefit, explicit ownership, cost bounds, and a
recovery path. These are policy requirements, not claims of runtime enforcement.

## Codex Escalation

Codex owns feature design and is the designated requirements reviewer.

Escalate difficult concurrency or state consistency, security-sensitive work,
cross-core-module changes, or repeated reasonable failures on the same defined
problem to Codex as a bounded one-shot task. Supply the question, constraints,
workspace scope, acceptance criteria, and evidence, including failed attempts.

After Codex returns, DeepSeek must re-read the workspace and diff and independently
run the required verification commands. Provider text is not proof of successful
execution or acceptance.

## Codex Final Review

Codex performs final review against the approved Spec and fresh evidence and
returns `PASS` or `CHANGES_REQUIRED`. For `CHANGES_REQUIRED`, DSH fixes the scoped
issues and reruns verification before requesting another review.
