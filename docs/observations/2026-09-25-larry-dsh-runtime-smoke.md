# Larry DSH Headless Runtime Observation — 2026-09-25

## Environment

- DSH CLI: `@deepseek-ai/dsh@0.1.5-rc.3`
- Upstream tag: `dsh-v0.1.5-rc.3`
- Upstream revision: `a4c74a91e06b00fe0b0937bde982170c526cc842`
- Active Profile: `$DSH_HOME/profiles/larry-dsh-headless`
- Codex provider: `@deepseek-ai/dsh-subagent-codex@0.1.5-rc.3`

No web access token or model API key is recorded in this observation.

## Passed Evidence

1. `dsh --version` reported `0.1.5-rc.3`.
2. The Profile was initialized from the official `headless` default Profile.
3. The matching Codex provider package installed successfully.
4. `dsh --profile larry-dsh-headless --dump-config` exited successfully.
5. The composed config contains:
   - `subagent-codex` with `providerName: codex` and `permissionMode: never`;
   - `tool-subagent-codex` with `toolName: subagent_codex`;
   - `backgroundMode: one-shot` and `maxDepth: provider-managed`.
6. The Git-tracked Profile contract tests passed after alignment with the manifest emitted by the installed CLI.
7. From a real SSH + tmux shell, `larry-dsh-headless` returned the requested `LARRY_DSH_OK` marker through DeepSeek.
8. In the synthetic project, DSH read `README.md` and honored the project-level `AGENTS.md`, returning `PCAOM_DSH_SMOKE_9274 DSH_AGENTS_LOADED_4812`.
9. DeepSeek invoked `subagent_codex` exactly once for a bounded, no-write task; the result returned as `LARRY_CODEX_OK CODEX_ONE_SHOT_OK`.

## Version-Specific Finding

DSH `0.1.5-rc.3` does not expose `--dump-config-schema`. The pinned adapter therefore uses successful config composition plus runtime smoke tests as its promotion evidence; it does not claim schema-dump support.

The DSH instruction loader automatically reads project-level `AGENTS.md` files. It does not automatically load `EXECUTION_POLICY.md` from the Profile directory. The Reference Compiler must emit project policy into the target project's `AGENTS.md`; the fixed Profile remains responsible for runtime capabilities.

## Superseded Diagnostic

An earlier attempt from Codex's controlled command runner stopped before model execution with:

```text
MISSING_CREDENTIAL: llm-deepseek: no API key for provider route "deepseek-official"
```

That result did not reproduce in the user's real SSH + tmux environment. In that environment, the exported key was visible and both the official headless baseline and Larry Profile completed. The earlier error therefore describes the controlled runner's credential boundary, not the deployed Profile's runtime status.

These larger claims remain unverified:

- DeepSeek re-verification after a Codex result.
- a real feature implementation with repository writes and tests;
- Goal recovery, Team, Schedule, cost behavior, or production reliability.

## Current Verdict

`RUNTIME_SMOKE_VERIFIED`

The Profile is promoted to `runtime-smoke-verified`. The next evidence stage is a bounded real-project dogfood task that verifies implementation, fresh tests, and DeepSeek re-reading workspace state after any Codex task. Do not send real repository content to an external model unless that data transfer is authorized.
