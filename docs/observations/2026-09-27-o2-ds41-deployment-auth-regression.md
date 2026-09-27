# O2 DS41 installation and authentication regression — 2026-09-27

## Scope

- Downstream project: `/Volumes/data/githubCode/Omini2Workspace/O2-desktop`
- O2 policy commit at initial installation: `128f5b7935c36c4b9156286822492a8f44cf28be`
- Runtime baseline: Codex CLI `0.156.1`, oh-my-codex `0.21.6`, tmux `3.7b`,
  Node.js `22.22.2`
- `DEEPSEEK_API_KEY` was checked only for nonempty presence in a login shell. Its
  value was never read, printed, logged or written to an artifact.
- Provider smoke used `/private/tmp` and the synthetic prompt `PROFILE_OK`; no O2
  repository content was sent to DeepSeek.

## Initial installation

The installer completed with `ok: true` and wrote the four managed runtime files
plus paired project/Codex-Home receipts. SHA-256 values matched the receipt and
the installed Skill/receipt paths were ignored by O2 Git policy. A local
`codex --profile pcaom-ds41 debug prompt-input` parse check succeeded.

## Authentication regression

The first real provider smoke stopped before a DeepSeek request with:

```text
API key login is required, but ChatGPT is currently being used. Logging out.
```

`codex login status` then returned `Not logged in`. The installed Profile had
`forced_login_method = "api"`. Codex's configuration reference defines this field
as restricting the allowed authentication method; it is not the custom-provider
selector. The earlier synthetic runtime used a disposable Codex Home without an
existing ChatGPT login, so it could not expose this shared-home interaction.

Reference: <https://developers.openai.com/ja-JP/docs/config-file/config-reference>

## Fix and regression evidence

The Profile now omits `forced_login_method`. Explicit
`model_provider = "deepseek"` and the provider's `DEEPSEEK_API_KEY` environment
binding continue to select DeepSeek. Bridge validation rejects any reintroduced
`forced_login_method` key.

Fresh targeted regression:

```text
PYTHONDONTWRITEBYTECODE=1 python3.12 -m unittest \
  tests.test_codex_omx_ds41_target \
  tests.test_codex_omx_ds41_installer \
  tests.test_codex_omx_ds41_bridge -q

Ran 115 tests in 281.224s
OK
```

The repaired installer upgraded the same managed targets with `ok: true`, wrote
digest-addressed rollback backups and refreshed both receipts. O2 added an exact
ignore rule for `.pcaom/backups/codex-omx-ds41-supervised-team/`; its focused
policy suite passed `5/5` and `just check` passed.

The repaired installed Profile then completed a real synthetic provider call:

```text
model: deepseek-flash
provider: deepseek
reasoning effort: high
PROFILE_OK
```

No DS41 Team, worktree, Bridge start or O2 task was launched. O2 runtime and
dogfood remain unverified. Restoring the pre-existing official ChatGPT login is a
separate recovery action and must be verified with `codex login status`.
