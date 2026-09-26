# PCAOM Project AGENTS Templates

These templates separate project-owned instructions from Reference Compiler
output. They define the common base contract; they are not a working compiler or
evidence of runtime execution.

## Files

- `AGENTS.wrapper.md`: minimal root wrapper with a project-owned section and one
  PCAOM managed block.
- `AGENTS.common.md`: target-neutral authority, feature design, blocker,
  verification, and data/credential policy.
- `targets/larry-dsh-headless.md`: Larry DSH execution ownership and review policy.
- `targets/codex-omx-ds41-supervised-team.md`: DS41 execution ownership and
  Official Codex supervision and review policy.
- `AGENTS.generated.md`: Larry compatibility fixture until the deterministic
  emitter is implemented. It contains the full common policy followed by the
  Larry target policy, separated by one newline, for `.pcaom/AGENTS.generated.md`.

Future emitters must select exactly one target policy and combine it with the
common policy, applying project-specific inputs through the Reference Compiler.
The compatibility fixture does not activate the DS41 target.

## Existing Projects

For an existing root `AGENTS.md`, insert or replace exactly one complete block
delimited by `<!-- PCAOM:START -->` and `<!-- PCAOM:END -->`. Recompilation
must not modify content outside that block; preserve those bytes and the project
file structure. Human-maintained project rules take precedence over generated
defaults while retaining the host's native scope and precedence.

## Projects Without AGENTS.md

Create the minimal wrapper when the project has no root `AGENTS.md`. All sections
outside its managed block immediately belong to the project. Later recompilation
may update only that block and `.pcaom/AGENTS.generated.md` for this instruction
pair; it must preserve the project-owned sections.

## Other Instruction Files

V0 does not create, replace, or own scoped `AGENTS.md` files or `AGENTS.local.md`.
Record their presence and scope during profiling. Preserve their native authority
and report known conflicts rather than deleting or replacing project instructions.

## Failure Boundary

Malformed, reversed, incomplete, or duplicate markers must fail closed without
modifying existing files. Known policy conflicts must produce
`BLOCKED_POLICY_CONFLICT` and appear in the compile report. Do not resolve them by
deleting or replacing project instructions.

The deterministic, non-destructive merge belongs to the Reference Compiler and
is not performed by manually copying these templates. That implementation must
validate ownership and inputs, preserve content outside the block, atomically
write outputs, re-read and validate them, and record conflicts before promoting
manifest status. These templates alone do not verify that merge behavior.
