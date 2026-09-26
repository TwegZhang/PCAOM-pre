import hashlib
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

if sys.version_info >= (3, 11):
    import tomllib
else:
    tomllib = None


BUNDLE = Path(__file__).resolve().parents[1] / "templates/codex-omx-ds41-supervised-team"
MARKER = "__PCAOM_MODEL_CATALOG_PATH__"


class CodexOmxDs41InstallerTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name).resolve()
        self.bundle = self.root / "bundle"
        shutil.copytree(BUNDLE, self.bundle)
        bridge = self.bundle / "project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs"
        bridge.parent.mkdir(parents=True, exist_ok=True)
        bridge.write_text("// Synthetic installer fixture; not the production bridge.\n")
        self.project = self.root / "project"
        self.codex_home = self.root / "codex home"
        self.project.mkdir()
        self.codex_home.mkdir()
        self.manifest_path = self.bundle / "install-manifest.json"
        self.manifest = json.loads(self.manifest_path.read_text())

    def run_installer(self, *args):
        return subprocess.run(["node", str(self.bundle / "install.mjs"), *args],
                              cwd=self.bundle, text=True, capture_output=True, check=False)

    def args(self):
        return ["install", "--project", str(self.project), "--codex-home", str(self.codex_home)]

    def assert_empty(self):
        self.assertEqual(list(self.project.iterdir()), [])
        self.assertEqual(list(self.codex_home.iterdir()), [])

    def assert_failure(self, result):
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(result.stdout, "")
        self.assertEqual(len(result.stderr.splitlines()), 1, result.stderr)
        diagnostic = json.loads(result.stderr)
        self.assertIs(diagnostic["ok"], False)
        self.assertTrue(diagnostic["error"])
        self.assert_empty()

    def test_dry_run_writes_nothing_and_is_deterministic(self):
        result = self.run_installer(*self.args(), "--dry-run")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        data = json.loads(result.stdout)
        self.assertEqual(len(result.stdout.splitlines()), 1)
        self.assertIs(data["ok"], True)
        operations = data["operations"]
        self.assertEqual(len(operations), 4)
        self.assertEqual(operations, sorted(operations, key=lambda op: (op["scope"], op["destination"])))
        for op in operations:
            self.assertEqual(set(op), {"scope", "source", "destination", "digest"})
            self.assertRegex(op["digest"], r"^[0-9a-f]{64}$")
        self.assertEqual(result.stdout, self.run_installer(*self.args(), "--dry-run").stdout)
        self.assert_empty()

    def test_install_writes_exactly_four_files_and_resolves_catalog(self):
        original = (self.bundle / "codex/pcaom-ds41.config.toml").read_bytes()
        result = self.run_installer(*self.args())
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(result.stderr, "")
        data = json.loads(result.stdout)
        self.assertIs(data["ok"], True)
        expected = []
        for record in self.manifest["files"]:
            root = self.project if record["scope"] == "project" else self.codex_home
            destination = root / record["destination"]
            expected.append(destination)
            source = (self.bundle / record["source"]).read_bytes()
            if record["destination"] == "pcaom-ds41.config.toml":
                catalog = str(self.codex_home / "model-catalogs/pcaom-deepseek-models.json")
                source = source.replace(MARKER.encode(), catalog.encode())
            self.assertEqual(destination.read_bytes(), source)
            self.assertEqual(destination.stat().st_mode & 0o777, 0o600)
        actual = [p for root in (self.project, self.codex_home) for p in root.rglob("*") if p.is_file()]
        self.assertEqual(set(actual), set(expected))
        self.assertEqual((self.bundle / "codex/pcaom-ds41.config.toml").read_bytes(), original)
        json.loads((self.codex_home / "model-catalogs/pcaom-deepseek-models.json").read_text())
        for op in data["operations"]:
            self.assertEqual(op["digest"], hashlib.sha256(Path(op["destination"]).read_bytes()).hexdigest())

    def test_profile_escapes_del_in_catalog_path(self):
        self.codex_home = self.root / "codex\x7fhome"
        self.codex_home.mkdir()
        result = self.run_installer(*self.args())
        self.assertEqual(result.returncode, 0, result.stderr)
        profile = (self.codex_home / "pcaom-ds41.config.toml").read_text()
        catalog = str((self.codex_home / "model-catalogs/pcaom-deepseek-models.json").resolve())
        self.assertNotIn("\x7f", profile)
        self.assertIn('model_catalog_json = "' + catalog.replace("\x7f", "\\u007f") + '"', profile)
        if tomllib is not None:
            self.assertEqual(tomllib.loads(profile)["model_catalog_json"], catalog)

    def test_invalid_arguments_write_nothing(self):
        variants = [self.args() + ["--unknown"], self.args() + ["--dry-run", "--dry-run"],
                    self.args() + ["--project", str(self.project)],
                    ["install", "--project", "relative", "--codex-home", str(self.codex_home)],
                    ["install", "--project", str(self.root / "absent"), "--codex-home", str(self.codex_home)],
                    ["install", "--project", str(self.manifest_path), "--codex-home", str(self.codex_home)],
                    ["install", "--project", str(self.project)],
                    self.args()[:-1], ["unsupported", *self.args()[1:]],
                    ["uninstall", *self.args()[1:]]]
        for args in variants:
            with self.subTest(args=args):
                self.assert_failure(self.run_installer(*args))

    def test_invalid_manifest_write_nothing(self):
        mutations = [lambda m: m.update(schema_version=1), lambda m: m.update(owner="other"),
                     lambda m: m.update(files=[]),
                     lambda m: m["files"][3].update(destination=m["files"][2]["destination"]),
                     lambda m: m["files"][3].update(source=m["files"][2]["source"]),
                     lambda m: m["files"][3].update(destination="../escape"),
                     lambda m: m["files"][3].update(destination="."),
                     lambda m: m["files"][3].update(scope="unsupported"),
                     lambda m: m["files"][3].update(source="missing.mjs"),
                     lambda m: m["files"][3].update(source="../install-manifest.json"),
                     lambda m: m["files"][3].update(source="project")]
        for mutate in mutations:
            manifest = json.loads(json.dumps(self.manifest))
            mutate(manifest)
            self.manifest_path.write_text(json.dumps(manifest))
            with self.subTest(manifest=manifest):
                self.assert_failure(self.run_installer(*self.args()))

    def test_profile_requires_exactly_one_marker(self):
        profile = self.bundle / "codex/pcaom-ds41.config.toml"
        for text in ("no marker", MARKER + MARKER):
            profile.write_text(text)
            self.assert_failure(self.run_installer(*self.args()))

    def test_source_symlink_escape_is_rejected(self):
        source = self.bundle / self.manifest["files"][-1]["source"]
        source.unlink()
        source.symlink_to(self.manifest_path.parent.parent / "outside")
        (self.root / "outside").write_text("outside")
        self.assert_failure(self.run_installer(*self.args()))


if __name__ == "__main__":
    unittest.main()
