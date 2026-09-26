import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]


class PcaomAgentsContractTests(unittest.TestCase):
    def read_policy(self, name: str) -> str:
        return self.read_required(f"templates/project-agents/{name}")

    def test_common_policy_is_target_neutral(self) -> None:
        common = self.read_policy("AGENTS.common.md")
        for forbidden in ("Larry", "DSH", "deepseek-flash", "OMX Team", "Codex", "fan-out"):
            with self.subTest(forbidden=forbidden):
                self.assertNotIn(forbidden, common)
        for required in ("FEATURE_SPEC.md", "BLOCKED_ARCHITECTURE", "BLOCKED_POLICY_CONFLICT",
                         "Human owns product scope and architecture", "fresh",
                         "Data and Credential Boundaries", "project-owned instructions"):
            with self.subTest(required=required):
                self.assertIn(required, common)

    def test_target_policies_define_execution_ownership(self) -> None:
        larry = self.read_policy("targets/larry-dsh-headless.md")
        ds41 = self.read_policy("targets/codex-omx-ds41-supervised-team.md")
        self.assertEqual(larry.count("Larry DSH is the only execution-plane fan-out owner"), 1)
        self.assertEqual(ds41.count("DS41 Codex Leader is the only execution-plane fan-out owner"), 1)
        for required in (
            "Official Codex must not edit code while DS41 Team is active",
            "BLOCKED_ARCHITECTURE", "BLOCKED_POLICY_CONFLICT", "fresh",
            "A stronger model alone does not justify fan-out",
            "Switching targets requires an explicit handoff after the current runtime reaches a terminal state",
        ):
            with self.subTest(required=required):
                self.assertIn(required, ds41)

    def test_generated_policy_is_common_plus_larry_compatibility_fixture(self) -> None:
        generated = self.read_policy("AGENTS.generated.md")
        policy_root = ROOT / "templates/project-agents"
        self.assertEqual(
            (policy_root / "AGENTS.generated.md").read_bytes(),
            (policy_root / "AGENTS.common.md").read_bytes()
            + b"\n"
            + (policy_root / "targets/larry-dsh-headless.md").read_bytes(),
        )
        self.assertNotIn("deepseek-flash", generated)

    def read_required(self, name: str) -> str:
        path = ROOT / name
        self.assertTrue(path.is_file(), f"missing project artifact: {path}")
        return path.read_text(encoding="utf-8")

    def test_repository_docs_link_agents_foundation(self) -> None:
        readme = self.read_required("README.md")
        guide = self.read_required("docs/methodology/codex-omx-dsh-usage-guide.md")
        plan = self.read_required("docs/superpowers/plans/2026-09-19-pcaom-v0.md")
        self.assertIn("AGENTS.md", readme)
        for label, target in (
            (
                "PCAOM AGENTS.md 分层与融合设计",
                "docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md",
            ),
            ("下游项目 AGENTS 模板", "templates/project-agents/README.md"),
        ):
            with self.subTest(target=target):
                self.assertIn(f"[{label}]({target})", readme)
                self.assertTrue((ROOT / target).is_file(), f"missing source: {target}")

        self.assertIn(".pcaom/AGENTS.generated.md", guide)
        self.assertIn("Human-maintained", guide)
        self.assertIn("PCAOM:START", guide)
        self.assertIn(
            "当前仅已建立静态模板，Reference Compiler 的非破坏式 merge emitter "
            "尚未实现，也未验证实际融合运行行为。",
            " ".join(guide.split()),
        )

        for item in (
            "- [x] 建立 PCAOM 根 AGENTS contract 和下游 wrapper/generated-policy 静态模板。",
            "- [ ] 实现经验选择、项目特化、复杂度正则化和 policy artifact 生成。",
            "- [ ] 生成 `AGENTS.md`、`.pcaom/manifest.yaml`、`rationale.md`、"
            "`context-map.md`、`escalation-policy.md`。",
            "- [ ] 选择一个真实但边界清晰的 repo，记录原始 Native/DIY baseline。",
            "- [ ] 运行 Larry DSH 编译目标，比较强 Native Codex/OMX baseline、DSH-only "
            "和 DSH + Codex escalation 的验证可靠性、Token/成本/延迟、人工干预和 artifact 复杂度。",
        ):
            with self.subTest(plan_item=item):
                self.assertIn(item, plan.splitlines())

    def test_root_agents_routes_pcaom_work_without_copying_research(self) -> None:
        agents = self.read_required("AGENTS.md")

        for required in (
            "Project Purpose and Boundaries",
            "Source-of-Truth Map",
            "Human owns product scope and architecture",
            "FEATURE_SPEC.md",
            "Every non-trivial feature must receive an approved `FEATURE_SPEC.md` "
            "before implementation.",
            "DSH is the only execution-plane fan-out owner",
            "BLOCKED_ARCHITECTURE",
            "BLOCKED_POLICY_CONFLICT",
            "runtime-smoke-verified",
            "dogfood-verified",
            "docs/methodology/codex-omx-dsh-usage-guide.md",
            "docs/observations/",
            "Do not reimplement an agent runtime.",
            "Do not silently overwrite project-owned instructions.",
            "Do not claim runtime success from static tests.",
        ):
            with self.subTest(required=required):
                self.assertIn(required, agents)

    def test_root_agents_source_paths_exist(self) -> None:
        agents = self.read_required("AGENTS.md")

        for source in (
            "README.md",
            "docs/methodology/compiler-contract-v0.md",
            "docs/methodology/codex-omx-dsh-usage-guide.md",
            "docs/superpowers/specs/2026-09-25-pcaom-dsh-two-layer-design.md",
            "docs/superpowers/specs/2026-09-25-pcaom-agents-layering-design.md",
            "docs/research/dsh-capability-study.md",
            "templates/larry-dsh-headless/README.md",
            "experience/README.md",
        ):
            with self.subTest(source=source):
                self.assertIn(source, agents)
                self.assertTrue((ROOT / source).is_file(), f"missing source: {source}")

    def test_downstream_wrapper_has_one_managed_block_and_preserves_ownership(self) -> None:
        wrapper = self.read_required("templates/project-agents/AGENTS.wrapper.md")
        start_marker = "<!-- PCAOM:START -->"
        end_marker = "<!-- PCAOM:END -->"
        self.assertEqual(wrapper.count(start_marker), 1)
        self.assertEqual(wrapper.count(end_marker), 1)
        start = wrapper.index(start_marker)
        end = wrapper.index(end_marker)
        self.assertLess(start, end)
        managed_block = " ".join(wrapper[start + len(start_marker):end].split())
        outside_content = " ".join(
            (wrapper[:start] + wrapper[end + len(end_marker):]).split()
        )

        for required in (
            ".pcaom/AGENTS.generated.md",
            "the current `FEATURE_SPEC.md`",
            "Human-maintained project rules outside this block take precedence "
            "over PCAOM-generated defaults.",
            "Report `BLOCKED_POLICY_CONFLICT` instead of silently overriding a conflict.",
        ):
            with self.subTest(managed_policy=required):
                self.assertIn(required, managed_block)

        self.assertIn("Project-Owned Instructions", outside_content)
        self.assertIn(
            "Project owners should add project-specific architecture, coding, "
            "security, directory, and verification rules outside the PCAOM markers.",
            outside_content,
        )

    def test_generated_policy_defines_feature_execution_and_verification(self) -> None:
        policy = self.read_required("templates/project-agents/AGENTS.generated.md")
        for required in (
            "Compiler-Owned Generated Policy",
            "FEATURE_SPEC.md",
            "Human owns product scope and architecture",
            "DSH is the only execution-plane fan-out owner",
            "bounded one-shot",
            "re-read the workspace and diff",
            "BLOCKED_ARCHITECTURE",
            "BLOCKED_POLICY_CONFLICT",
            "PASS",
            "CHANGES_REQUIRED",
        ):
            with self.subTest(required=required):
                self.assertIn(required, policy)

        normalized_policy = " ".join(policy.split())
        self.assertIn(
            "Every non-trivial feature requires a Human-approved `FEATURE_SPEC.md` "
            "before implementation.",
            normalized_policy,
        )
        for required in (
            "Human-maintained project rules retain their native scope and precedence, "
            "including root, scoped, and local instruction files.",
            "This generated policy provides defaults and does not silently override "
            "project rules or change the host's instruction loading behavior.",
            "Do not silently override or delete project-owned instructions.",
        ):
            with self.subTest(authority=required):
                self.assertIn(required, normalized_policy)

    def test_template_readme_documents_non_destructive_recompile(self) -> None:
        readme = self.read_required("templates/project-agents/README.md")
        for required in (
            "PCAOM:START",
            "PCAOM:END",
            "must not modify content outside",
            "AGENTS.local.md",
            "fail closed",
            "Reference Compiler",
        ):
            with self.subTest(required=required):
                self.assertIn(required, readme)

        normalized_readme = " ".join(readme.split())
        for required in (
            "Recompilation must not modify content outside that block; preserve "
            "those bytes and the project file structure.",
            "The deterministic, non-destructive merge belongs to the Reference "
            "Compiler and is not performed by manually copying these templates.",
        ):
            with self.subTest(recompile_boundary=required):
                self.assertIn(required, normalized_readme)


if __name__ == "__main__":
    unittest.main()
