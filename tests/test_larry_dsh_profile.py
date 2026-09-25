import json
import unittest
from pathlib import Path


PROFILE_DIR = Path(__file__).resolve().parents[1] / "templates" / "larry-dsh-headless"
RUNTIME_REVISION = "a4c74a91e06b00fe0b0937bde982170c526cc842"
PACKAGE_VERSION = "0.1.5-rc.3"


class LarryDshProfileContractTests(unittest.TestCase):
    def read_required(self, name: str) -> str:
        path = PROFILE_DIR / name
        self.assertTrue(path.is_file(), f"missing profile artifact: {path}")
        return path.read_text(encoding="utf-8")

    def test_package_manifest_pins_official_headless_composition(self) -> None:
        package = json.loads(self.read_required("package.json"))

        self.assertEqual(package["name"], "dsh-profile-larry-dsh-headless")
        self.assertIs(package["private"], True)
        self.assertEqual(package["dsh"]["profile"]["patchReload"], "startup")
        self.assertEqual(
            package["dependencies"],
            {"@deepseek-ai/dsh-subagent-codex": PACKAGE_VERSION},
        )
        self.assertEqual(
            package["dsh"]["profile"]["bundles"],
            [
                "@deepseek-ai/dsh-base",
                "@deepseek-ai/dsh-headless",
                "@deepseek-ai/dsh-subagent-codex",
            ],
        )

    def test_cordis_patch_matches_bounded_codex_delegation(self) -> None:
        expected = """- id: subagent-codex
  config:
    providerName: codex
    permissionMode: never

- insert:
    - id: tool-subagent-codex
      name: '@deepseek-ai/dsh-tool-subagent'
      config:
        provider: codex
        toolName: subagent_codex
        backgroundMode: one-shot
        maxDepth: provider-managed
"""
        patch = self.read_required("cordis.patch.yml")

        self.assertEqual(patch, expected)
        for unsupported in (
            "dsh-experimental-agent-team",
            "dsh-schedule",
            "dsh-web-app",
            "dsh-workflow",
        ):
            self.assertNotIn(unsupported, patch)

    def test_pcaom_metadata_records_runtime_smoke_verification(self) -> None:
        metadata = json.loads(self.read_required("pcaom-target.json"))

        self.assertEqual(metadata["schema_version"], 0)
        self.assertEqual(metadata["target"], "larry-dsh-headless")
        self.assertEqual(metadata["status"], "runtime-smoke-verified")
        self.assertEqual(
            metadata["runtime_ref"],
            {
                "repository": "deepseek-ai/deepseek-harness",
                "revision": RUNTIME_REVISION,
                "cli_package": "@deepseek-ai/dsh",
                "cli_version": PACKAGE_VERSION,
                "maturity": "developer-preview",
            },
        )
        self.assertEqual(
            metadata["capabilities"],
            {
                "deepseek_execution": "runtime-smoke-verified",
                "project_instructions": "runtime-smoke-verified",
                "codex_delegation": "runtime-smoke-verified",
                "goal": "in-box-unverified",
                "team": "disabled",
                "schedule": "disabled",
                "saved_workflow": "unsupported",
            },
        )
        self.assertEqual(
            metadata["install_location"],
            "$DSH_HOME/profiles/larry-dsh-headless",
        )

    def test_execution_policy_preserves_ownership_and_evidence_boundaries(self) -> None:
        policy = self.read_required("EXECUTION_POLICY.md")

        for required in (
            "FEATURE_SPEC.md",
            "DeepSeek",
            "唯一 fan-out owner",
            "bounded one-shot",
            "final-text-only",
            "重新读取工作区 diff",
            "BLOCKED_ARCHITECTURE",
            "human-root-turn",
            "PASS",
            "CHANGES_REQUIRED",
        ):
            self.assertIn(required, policy)

    def test_readme_documents_install_and_runtime_smoke_boundary(self) -> None:
        readme = self.read_required("README.md")

        for required in (
            "runtime-smoke-verified",
            "$DSH_HOME/profiles/larry-dsh-headless",
            "npm install",
            "dsh --profile larry-dsh-headless --dump-config",
            "0.1.5-rc.3 does not expose `--dump-config-schema`",
            "project-level `AGENTS.md`",
            "smoke test",
            "not a real-project dogfood result",
        ):
            self.assertIn(required, readme)

        self.assertNotIn(
            "dsh --profile larry-dsh-headless --dump-config-schema",
            readme,
        )


if __name__ == "__main__":
    unittest.main()
