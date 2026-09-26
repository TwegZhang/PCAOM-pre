import json
import tomllib
import unittest
from pathlib import Path


BUNDLE = Path(__file__).resolve().parents[1] / "templates" / "codex-omx-ds41-supervised-team"


class CodexOmxDs41TargetTests(unittest.TestCase):
    def read_required(self, name):
        path = BUNDLE / name
        self.assertTrue(path.is_file(), f"missing bundle artifact: {path}")
        return path.read_text(encoding="utf-8")

    def test_target_metadata_starts_unverified(self):
        target = json.loads(self.read_required("pcaom-target.json"))
        self.assertEqual(target["schema_version"], 0)
        self.assertEqual(target["target"], "codex-omx-ds41-supervised-team")
        self.assertEqual(target["status"], "generated-unverified")
        self.assertEqual(target["runtime_ref"], {
            "codex_cli": "0.156.1", "oh_my_codex": "0.21.6", "tmux": "3.7b",
        })
        self.assertEqual(target["model"], {
            "id": "deepseek-flash", "family": "DeepSeek V4.1 Flash",
            "provider": "deepseek", "protocol": "responses",
        })
        self.assertEqual(target["capabilities"], {
            "profile": "generated-unverified", "installer": "generated-unverified",
            "skill": "generated-unverified", "supervisor_bridge": "experimental-unverified",
            "ultragoal": "runtime-unverified", "team": "runtime-unverified",
            "worktree": "runtime-unverified", "final_review": "runtime-unverified",
        })

    def test_profile_uses_environment_auth_and_separate_profile_file(self):
        text = self.read_required("codex/pcaom-ds41.config.toml")
        self.assertEqual(tomllib.loads(text), {
            "model": "deepseek-flash", "model_provider": "deepseek",
            "model_reasoning_effort": "high", "forced_login_method": "api",
            "web_search": "disabled", "model_catalog_json": "__PCAOM_MODEL_CATALOG_PATH__",
            "model_providers": {"deepseek": {
                "name": "DeepSeek", "base_url": "https://api.deepseek.com/",
                "wire_api": "responses", "env_key": "DEEPSEEK_API_KEY",
                "env_key_instructions": "Set DEEPSEEK_API_KEY in the trusted launcher environment.",
            }},
        })
        self.assertNotIn("experimental_bearer_token", text)
        self.assertNotIn("[profiles.", text)
        self.assertNotRegex(text, r"sk-[A-Za-z0-9]")

    def test_catalog_contains_only_the_pinned_model(self):
        catalog = json.loads(self.read_required("codex/deepseek-models.json"))
        self.assertEqual([model["slug"] for model in catalog["models"]], ["deepseek-flash"])
        model = catalog["models"][0]
        self.assertEqual(model["context_window"], 1_000_000)
        self.assertIs(model["supports_parallel_tool_calls"], True)
        self.assertEqual(model["multi_agent_version"], "v2")
        self.assertEqual(model["apply_patch_tool_type"], "freeform")
        self.assertEqual(model["input_modalities"], ["text", "image"])
        self.assertEqual(model["default_reasoning_level"], "high")
        self.assertEqual([level["effort"] for level in model["supported_reasoning_levels"]],
                         ["low", "high", "max"])
        self.assertEqual(model["minimal_client_version"], "0.144.0")
        self.assertNotIn("model_messages", model)
        self.assertNotIn("base_instructions", model)

    def test_install_map_has_exact_scopes_and_destinations(self):
        manifest = json.loads(self.read_required("install-manifest.json"))
        self.assertEqual(manifest, {
            "schema_version": 0, "owner": "pcaom:codex-omx-ds41-supervised-team",
            "files": [
                {"source": "codex/pcaom-ds41.config.toml", "scope": "codex_home",
                 "destination": "pcaom-ds41.config.toml"},
                {"source": "codex/deepseek-models.json", "scope": "codex_home",
                 "destination": "model-catalogs/pcaom-deepseek-models.json"},
                {"source": "project/.codex/skills/pcaom-ds41-team/SKILL.md", "scope": "project",
                 "destination": ".codex/skills/pcaom-ds41-team/SKILL.md"},
                {"source": "project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs",
                 "scope": "project", "destination": ".codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs"},
            ],
        })

    def test_readme_explains_installation_and_evidence_boundaries(self):
        text = self.read_required("README.md")
        for required in ("generated-unverified", "config-verified", "runtime-smoke-verified",
                         "dogfood-verified", "--dry-run", "install.mjs install", "install.mjs uninstall",
                         "DEEPSEEK_API_KEY", "supervisor", "ds41-team-", "trusted", "$CODEX_HOME"):
            with self.subTest(required=required):
                self.assertIn(required, text)


if __name__ == "__main__":
    unittest.main()
