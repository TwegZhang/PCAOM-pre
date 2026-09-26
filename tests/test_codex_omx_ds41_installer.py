import hashlib
import json
import os
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
        self.assertEqual(set(actual), set(expected + self.receipts()))
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

    def receipts(self):
        return [self.project / '.pcaom/installations/codex-omx-ds41-supervised-team.json',
                self.codex_home / 'pcaom-installations/codex-omx-ds41-supervised-team.json']

    def snapshot(self):
        return {str(p): p.read_bytes() for root in (self.project, self.codex_home)
                for p in root.rglob('*') if p.is_file()}

    def install_ok(self):
        result = self.run_installer(*self.args())
        self.assertEqual(result.returncode, 0, result.stderr)
        return result

    def fails_unchanged(self, *args):
        before = self.snapshot()
        result = self.run_installer(*args)
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(result.stdout, '')
        self.assertFalse(json.loads(result.stderr)['ok'])
        self.assertEqual(self.snapshot(), before)
        self.assertFalse(list(self.root.rglob('*.tmp')))

    def test_unmanaged_collision_preserves_everything(self):
        target = self.codex_home / 'pcaom-ds41.config.toml'
        target.write_text('user owned')
        self.fails_unchanged(*self.args())

    def test_identical_install_has_deterministic_receipts(self):
        self.install_ok()
        left, right = self.receipts()
        self.assertTrue(left.exists() and right.exists(), 'both ownership receipts required')
        self.assertEqual(left.read_bytes(), right.read_bytes())
        receipt = json.loads(left.read_bytes())
        self.assertEqual(receipt['schema_version'], 0)
        self.assertEqual(receipt['owner'], self.manifest['owner'])
        self.assertEqual(receipt['project_root'], str(self.project))
        self.assertEqual(receipt['codex_home'], str(self.codex_home))
        self.assertRegex(receipt['bundle_digest'], '^[0-9a-f]{64}$')
        self.assertEqual(receipt['files'], sorted(receipt['files'], key=lambda f: (f['scope'], f['destination'])))
        before = self.snapshot()
        self.install_ok()
        self.assertEqual(before, self.snapshot())

    def test_invalid_receipts_fail_closed(self):
        self.install_ok()
        self.assertTrue(all(p.exists() for p in self.receipts()), 'receipts required')
        original = self.receipts()[0].read_bytes()
        mutations = [lambda r: r.update(owner='other'), lambda r: r.update(project_root='/other'),
                     lambda r: r.update(codex_home='/other'), lambda r: r.update(files=[]),
                     lambda r: r.update(bundle_digest='0' * 64),
                     lambda r: r['files'][0].update(sha256='0' * 64)]
        for mutate in mutations:
            receipt = json.loads(original)
            mutate(receipt)
            for p in self.receipts():
                p.write_text(json.dumps(receipt))
            self.fails_unchanged(*self.args())
            self.fails_unchanged('uninstall', *self.args()[1:])
        for p in self.receipts():
            p.write_bytes(original)
        for invalid in (None, b'invalid', original + b' '):
            p = self.receipts()[0]
            if invalid is None:
                p.unlink()
            else:
                p.write_bytes(invalid)
            self.fails_unchanged(*self.args())
            self.fails_unchanged('uninstall', *self.args()[1:])
            p.write_bytes(original)

    def test_upgrade_backs_up_verified_prior_bytes(self):
        self.install_ok()
        self.assertTrue(self.receipts()[0].exists(), 'receipt required for upgrade')
        old = json.loads(self.receipts()[0].read_bytes())
        before = self.snapshot()
        source = self.bundle / self.manifest['files'][-1]['source']
        source.write_bytes(source.read_bytes() + b'\n// upgraded\n')
        dry_run = self.run_installer(*self.args(), '--dry-run')
        self.assertEqual(dry_run.returncode, 0, dry_run.stderr)
        self.assertEqual(len([a for a in json.loads(dry_run.stdout)['actions'] if a['action'] == 'backup']), 4)
        self.assertEqual(self.snapshot(), before)
        self.install_ok()
        backups = {}
        for record in old['files']:
            root = self.project if record['scope'] == 'project' else self.codex_home
            prefix = '.pcaom/backups' if record['scope'] == 'project' else 'pcaom-backups'
            backup = root / prefix / 'codex-omx-ds41-supervised-team' / old['bundle_digest'] / record['destination']
            self.assertEqual(backup.read_bytes(), before[str(root / record['destination'])])
            backups[str(backup)] = backup.read_bytes()
        result = self.run_installer('uninstall', *self.args()[1:])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.snapshot(), backups)

    def test_modified_file_blocks_uninstall_and_install(self):
        self.install_ok()
        (self.codex_home / 'pcaom-ds41.config.toml').write_text('modified')
        self.fails_unchanged(*self.args())
        self.fails_unchanged('uninstall', *self.args()[1:])

    def test_uninstall_removes_only_owned_files(self):
        self.install_ok()
        unrelated = self.project / '.codex/skills/unrelated.txt'
        unrelated.write_text('keep')
        result = self.run_installer('uninstall', *self.args()[1:])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.snapshot(), {str(unrelated): b'keep'})

    def inject(self, before, after):
        script = self.bundle / 'install.mjs'
        text = script.read_text()
        self.assertIn(before, text)
        script.write_text(text.replace(before, after, 1))

    def test_install_readback_failure_rolls_back(self):
        self.inject('const actual = readFileSync(operation.destination);',
                    'const actual = Buffer.from("injected mismatch");')
        self.fails_unchanged(*self.args())
        self.assert_empty()

    def test_uninstall_fault_rolls_back(self):
        self.install_ok()
        # Inject at filesystem boundary, after one successful delete.
        script = self.bundle / 'install.mjs'
        script.write_text(script.read_text().replace('unlinkSync,', 'unlinkSync as realUnlinkSync,', 1)
                          + '\n')
        self.inject('const OWNER =', 'let deletes = 0; function unlinkSync(p) { realUnlinkSync(p); if (!p.endsWith(".tmp") && ++deletes === 1) throw new Error("injected delete fault"); }\nconst OWNER =')
        self.fails_unchanged('uninstall', *self.args()[1:])
        self.assertTrue(all(p.exists() for p in self.receipts()), 'rollback retains receipts')

    def test_dry_run_reports_receipts_backups_and_deletes(self):
        result = self.run_installer(*self.args(), '--dry-run')
        data = json.loads(result.stdout)
        self.assertIn('actions', data)
        self.assertEqual(len([a for a in data['actions'] if a['action'] == 'receipt']), 2)
        self.assert_empty()
        self.install_ok()
        before = self.snapshot()
        result = self.run_installer('uninstall', *self.args()[1:], '--dry-run')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(json.loads(result.stdout)['actions']), 6)
        self.assertEqual(self.snapshot(), before)

    def test_receipt_write_failure_restores_upgrade_and_backups(self):
        self.install_ok()
        source = self.bundle / self.manifest['files'][-1]['source']
        source.write_bytes(source.read_bytes() + b'\n// next version\n')
        self.inject('renameSync(temporary, destination);',
                    'renameSync(temporary, destination); if (destination.includes("pcaom-installations")) throw new Error("receipt fault");')
        self.fails_unchanged(*self.args())

    def test_rollback_diagnostic_checks_actual_restored_state(self):
        self.install_ok()
        source = self.bundle / self.manifest['files'][-1]['source']
        source.write_bytes(source.read_bytes() + b'\n// next version\n')
        self.inject('renameSync(temporary, destination);',
                    'renameSync(temporary, destination); if (destination.includes("pcaom-installations")) throw new Error("receipt fault");')
        before = self.snapshot()
        result = self.run_installer(*self.args())
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.snapshot(), before)
        diagnostic = json.loads(result.stderr)
        self.assertNotEqual(diagnostic['error'], 'rollback-failed')
        self.assertEqual(diagnostic['rollbackProblems'], [])
        self.assertEqual(diagnostic['reason'], 'receipt fault')

    def test_uninstall_preserves_shared_directory_boundaries(self):
        shared = [self.project / '.codex', self.project / '.codex/skills',
                  self.project / '.pcaom/installations',
                  self.codex_home / 'model-catalogs', self.codex_home / 'pcaom-installations']
        for directory in shared:
            directory.mkdir(parents=True, exist_ok=True)
        self.install_ok()
        result = self.run_installer('uninstall', *self.args()[1:])
        self.assertEqual(result.returncode, 0, result.stderr)
        for directory in shared:
            self.assertTrue(directory.is_dir(), str(directory))
        self.assertFalse((self.project / '.codex/skills/pcaom-ds41-team').exists())
        self.assertEqual(self.snapshot(), {})

    def test_uninstall_rollback_diagnostic_checks_actual_restored_state(self):
        self.install_ok()
        self.inject('if (action.action === "delete") unlinkSync(action.destination);',
                    'if (action.action === "delete") { unlinkSync(action.destination); if (action.destination.includes("pcaom-installations")) throw new Error("delete fault"); }')
        self.inject('renameSync(temporary, destination);',
                    'renameSync(temporary, destination); if (destination.includes("pcaom-installations")) throw new Error("restore fault");')
        before = self.snapshot()
        result = self.run_installer('uninstall', *self.args()[1:])
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.snapshot(), before)
        diagnostic = json.loads(result.stderr)
        self.assertNotEqual(diagnostic['error'], 'rollback-failed')
        self.assertEqual(diagnostic['rollbackProblems'], [])
        self.assertEqual(diagnostic['reason'], 'delete fault')

    def test_conflicting_backup_fails_before_replacement(self):
        self.install_ok()
        old = json.loads(self.receipts()[0].read_bytes())
        record = old['files'][0]
        backup = self.codex_home / 'pcaom-backups/codex-omx-ds41-supervised-team' / old['bundle_digest'] / record['destination']
        backup.parent.mkdir(parents=True)
        backup.write_text('unrelated backup')
        source = self.bundle / self.manifest['files'][-1]['source']
        source.write_bytes(source.read_bytes() + b'\n// next version\n')
        self.fails_unchanged(*self.args())

    def test_uninstall_does_not_require_current_source_bytes(self):
        self.install_ok()
        (self.bundle / 'codex/pcaom-ds41.config.toml').write_text('changed source without marker')
        result = self.run_installer('uninstall', *self.args()[1:])
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(self.snapshot(), {})

    def test_receipt_change_before_mutation_fails_closed(self):
        self.install_ok()
        self.inject('transaction(actions, verify);',
                    'writeFileSync(receipts[0].destination, "concurrent receipt change"); transaction(actions, verify);')
        before = self.snapshot()
        result = self.run_installer(*self.args())
        self.assertNotEqual(result.returncode, 0, result.stdout)
        before[str(self.receipts()[0])] = b'concurrent receipt change'
        self.assertEqual(self.snapshot(), before)

    def test_success_output_redacts_key_value(self):
        secret = 'synthetic-secret'
        self.project = self.root / secret
        self.project.mkdir()
        result = subprocess.run(['node', str(self.bundle / 'install.mjs'), *self.args(), '--dry-run'],
                                env=dict(os.environ, DEEPSEEK_API_KEY=secret), text=True,
                                capture_output=True, check=False)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertNotIn(secret, result.stdout + result.stderr)
        self.assertTrue(json.loads(result.stdout)['ok'])

    def test_uninstall_cleanup_fault_restores_files(self):
        self.install_ok()
        self.inject('      rmdirSync(path);', '      rmdirSync(path); throw new Error("cleanup fault");')
        self.fails_unchanged('uninstall', *self.args()[1:])

    def test_directory_identity_change_before_mutation_fails(self):
        self.install_ok()
        self.inject('transaction(actions, verify);',
                    'renameSync(options.projectRoot, options.projectRoot + ".moved"); mkdirSync(options.projectRoot); transaction(actions, verify);')
        result = self.run_installer('uninstall', *self.args()[1:])
        self.assertNotEqual(result.returncode, 0, result.stdout)
        self.assertEqual(list(self.project.iterdir()), [])
        self.assertTrue(self.receipts()[1].exists())

    def test_symlink_receipt_parent_fails_closed(self):
        self.install_ok()
        parent = self.receipts()[0].parent
        moved = self.project / 'moved-receipts'
        parent.rename(moved)
        parent.symlink_to(moved, target_is_directory=True)
        self.fails_unchanged(*self.args())
        self.fails_unchanged('uninstall', *self.args()[1:])

    def assert_concurrent_change_preserved(self, command, upgrade=False):
        if command == 'uninstall' or upgrade:
            self.install_ok()
        if upgrade:
            source = self.bundle / 'codex/deepseek-models.json'
            source.write_text(source.read_text() + '\n')
        condition = ('action.action === "write" && action.destination.endsWith("pcaom-deepseek-models.json")'
                     if upgrade else 'written.length === 1')
        self.inject('written.push(action.destination);',
                    'written.push(action.destination); if (' + condition + ') { '
                    'writeFileSync(action.destination + ".concurrent", "third-party content"); '
                    'renameSync(action.destination + ".concurrent", action.destination); }')
        result = self.run_installer(command, *self.args()[1:])
        self.assertNotEqual(result.returncode, 0)
        diagnostic = json.loads(result.stderr)
        target = Path(diagnostic['written'][-1])
        self.assertTrue(target.is_file(), 'concurrent leaf must survive rollback')
        self.assertEqual(target.read_bytes(), b'third-party content')
        self.assertEqual(diagnostic['error'], 'rollback-failed')
        self.assertIn(str(target), diagnostic['rollbackProblems'])
        self.assertIn(str(target), diagnostic['rollbackConflicts'])
        self.assertTrue(diagnostic['reason'])

    def test_fresh_install_preserves_concurrent_replacement_during_rollback(self):
        self.assert_concurrent_change_preserved('install')

    def test_upgrade_preserves_concurrent_replacement_during_rollback(self):
        self.assert_concurrent_change_preserved('install', upgrade=True)

    def test_uninstall_preserves_concurrent_recreation_during_rollback(self):
        self.assert_concurrent_change_preserved('uninstall')

    def test_rollback_preserves_replacement_with_identical_transaction_bytes(self):
        self.inject('written.push(action.destination);',
                    'written.push(action.destination); if (written.length === 1) { '
                    'writeFileSync(action.destination + ".concurrent", action.bytes); '
                    'renameSync(action.destination + ".concurrent", action.destination); }')
        result = self.run_installer(*self.args())
        self.assertNotEqual(result.returncode, 0)
        diagnostic = json.loads(result.stderr)
        target = Path(diagnostic['written'][0])
        self.assertTrue(target.is_file())
        self.assertEqual(target.read_bytes(), (self.bundle / 'codex/deepseek-models.json').read_bytes())
        self.assertEqual(diagnostic['error'], 'rollback-failed')
        self.assertIn(str(target), diagnostic['rollbackConflicts'])


if __name__ == "__main__":
    unittest.main()
