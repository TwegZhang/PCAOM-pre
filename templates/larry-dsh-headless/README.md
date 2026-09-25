# Larry DSH Headless Base Profile V0

**Status:** `runtime-smoke-verified`

This directory is the first concrete PCAOM compile target. It combines the DeepSeek Harness headless execution surface with the official Codex subagent provider and a Larry execution policy.

It is a Git-tracked template, not an active DSH Profile. DSH does not discover this directory from the current workspace. The active copy must live at:

```text
$DSH_HOME/profiles/larry-dsh-headless
```

## Fixed Runtime Contract

- Upstream repository: `deepseek-ai/deepseek-harness`
- Upstream tag: `dsh-v0.1.5-rc.3`
- Upstream revision: `a4c74a91e06b00fe0b0937bde982170c526cc842`
- Required DSH CLI package: `@deepseek-ai/dsh@0.1.5-rc.3`
- Profile dependency: `@deepseek-ai/dsh-subagent-codex@0.1.5-rc.3`
- Maturity: developer preview

The base and headless bundles are resolved in-box from the running DSH installation. They are intentionally not duplicated in this Profile's `dependencies`. The local machine installed `@deepseek-ai/dsh@latest` as `0.1.5-rc.3`; the matching provider version is used to avoid mixing release lines.

## Files

- `package.json`: native DSH Profile manifest and Codex provider dependency.
- `cordis.patch.yml`: provider configuration and one-shot delegation tool.
- `EXECUTION_POLICY.md`: compiler input/template for Larry execution policy. DSH does not auto-load this profile-local file.
- `pcaom-target.json`: PCAOM metadata; DSH does not consume this file.

DSH `0.1.5-rc.3` automatically loads a project-level `AGENTS.md` (and local overlays), not `EXECUTION_POLICY.md` from a Profile directory. The Reference Compiler must therefore render the applicable parts of this policy into the target project's `AGENTS.md`. The fixed Profile supplies runtime capabilities; the project artifact supplies project-specific operating rules.

## Deployment

Do not perform these steps until the required DSH CLI version and npm package availability have been checked.

1. Initialize or locate `$DSH_HOME` using the official DSH CLI.
2. Copy this template to `$DSH_HOME/profiles/larry-dsh-headless`.
3. Enter the installed Profile directory and install its declared dependency:

```sh
npm install
```

4. Confirm the running CLI reports the required version.
5. Dump the composed configuration without claiming runtime success:

```sh
dsh --profile larry-dsh-headless --dump-config
```

DSH 0.1.5-rc.3 does not expose `--dump-config-schema`; schema-dump success is therefore not a valid promotion gate for this pinned adapter.

6. Inspect the dump for the base/headless bundles, `subagent-codex` provider and `subagent_codex` tool.
7. Run a disposable smoke test in a temporary workspace with a harmless read-only task before allowing repository writes.

Example smoke test request:

```sh
dsh --profile larry-dsh-headless "Read FEATURE_SPEC.md and report its acceptance criteria without modifying files."
```

## Runtime Smoke Evidence

The following evidence was observed on 2026-09-25 from a real SSH + tmux shell using only synthetic project content:

- exact CLI and Profile dependency versions recorded;
- `--dump-config` succeeds;
- Codex delegation tool appears in the composed configuration;
- DeepSeek executes through `larry-dsh-headless`;
- a project-level `AGENTS.md` marker reaches the DeepSeek instruction chain;
- one bounded `subagent_codex` call returns through DSH without modifying files.

`runtime-smoke-verified` is not a real-project dogfood result. It does not yet prove feature implementation, repository writes, DeepSeek re-reading a Codex-produced diff, full acceptance verification, cost behavior, Goal recovery, or Team execution.
