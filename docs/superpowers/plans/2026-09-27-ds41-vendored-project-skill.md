# DS41 Vendored Project Skill Plan

**Goal:** Let downstream teams commit and review the generated DS41 Skill and
supervisor bridge while PCAOM continues to manage only machine-local Codex
configuration.

## Contract

- Treat project-scoped Skill and bridge files as repository artifacts.
- On a fresh clone, accept matching project files without overwriting them.
- Install or upgrade project files when PCAOM is the source of the change, so
  Git exposes the resulting reviewable diff.
- Never delete project-scoped files during uninstall.
- Continue managing the model catalog, standalone Profile, and paired receipts.
- Keep the existing CLI and receipt schema; add no new mode or lock file.

## Verification

1. Add failing installer tests for adopting a matching repository Skill,
   mismatch rejection, and uninstall preservation.
2. Run the focused installer suite.
3. Run the complete PCAOM suite.
4. Vendor the approved files into O2, update its policy tests and documentation,
   then run focused O2 tests and `just check`.
5. Reinstall O2 in vendored mode and verify a dry-run uninstall retains the
   tracked Skill and bridge.
