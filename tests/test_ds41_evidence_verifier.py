import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'scripts/verify-ds41-installer-roundtrip.mjs'
BUNDLE = ROOT / 'templates/codex-omx-ds41-supervised-team'


class EvidenceVerifierTests(unittest.TestCase):
    def setUp(self):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        self.root = Path(temporary.name)
        self.scratch = self.root / 'scratch'
        self.scratch.mkdir()

    def run_verifier(self, *args, **environment):
        result = subprocess.run(['node', str(SCRIPT), *map(str, args)],
                                capture_output=True, text=True,
                                env={**os.environ, 'TMPDIR': str(self.scratch),
                                     'PYTHONOPTIMIZE': '1', **environment})
        self.assertEqual(list(self.scratch.iterdir()), [], 'Temporary artifacts leaked')
        return result

    def copied_bundle(self):
        return Path(shutil.copytree(BUNDLE, self.root / 'bundle'))

    def failure(self, result, phase, check, cause):
        self.assertEqual(result.returncode, 1, result.stdout)
        self.assertEqual(result.stdout, '')
        data = json.loads(result.stderr)
        self.assertIn('failure', data)
        self.assertEqual(data['failure']['phase'], phase)
        self.assertEqual(data['failure']['check'], check)
        self.assertEqual(data['failure']['cause'], cause)
        self.assertNotIn(str(self.root), result.stderr)
        return data

    def test_production_passes_with_optimized_hostile_python_environment(self):
        result = self.run_verifier(PYTHONPATH='/nonexistent', PYTHONHOME='/nonexistent')
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertTrue(json.loads(result.stdout)['temporary_removed'])

    def test_catalog_model_mutation_fails_under_optimization(self):
        bundle = self.copied_bundle()
        catalog = bundle / 'codex/deepseek-models.json'
        data = json.loads(catalog.read_text())
        data['models'][0]['slug'] = 'synthetic-wrong-model'
        catalog.write_text(json.dumps(data))
        self.failure(self.run_verifier('--bundle', bundle), 'installed-profile', 'model', 'validation_failed')

    def test_profile_model_mutation_fails_under_optimization(self):
        bundle = self.copied_bundle()
        profile = bundle / 'codex/pcaom-ds41.config.toml'
        profile.write_text(profile.read_text().replace('model = "deepseek-flash"', 'model = "synthetic-wrong-model"'))
        self.failure(self.run_verifier('--bundle', bundle), 'installed-profile', 'model', 'validation_failed')

    def test_profile_project_trust_mutation_fails_under_optimization(self):
        bundle = self.copied_bundle()
        profile = bundle / 'codex/pcaom-ds41.config.toml'
        profile.write_text(profile.read_text().replace('trust_level = "trusted"',
                                                       'trust_level = "untrusted"'))
        self.failure(self.run_verifier('--bundle', bundle), 'installed-profile',
                     'project-trust', 'validation_failed')

    def test_missing_python_is_distinct_and_cleans_up(self):
        data = self.failure(self.run_verifier('--python', '/nonexistent/pcaom-python'),
                            'installed-profile', 'python', 'subprocess_not_found')
        self.assertEqual(data['failure']['code'], 'ENOENT')

    def test_invalid_options_fail_before_temporary_directory_access(self):
        for args in [('--unknown', 'x'), ('--bundle',), ('--bundle', 'relative'),
                     ('--python', './relative'), ('--python', 'python3.12', '--python', 'python3.12'),
                     ('--bundle', str(BUNDLE), '--bundle', str(BUNDLE))]:
            with self.subTest(args=args):
                self.failure(self.run_verifier(*args, TMPDIR=str(self.root / 'absent')),
                             'arguments', 'options', 'validation_failed')

    def test_invalid_json_has_safe_diagnostic(self):
        bundle = self.copied_bundle()
        (bundle / 'install-manifest.json').write_text('synthetic-private-content')
        result = self.run_verifier('--bundle', bundle)
        self.failure(result, 'setup', 'manifest', 'invalid_json')
        self.assertNotIn('synthetic-private-content', result.stderr)

    def test_profile_parse_and_catalog_path_have_distinct_checks(self):
        bundle = self.copied_bundle()
        profile = bundle / 'codex/pcaom-ds41.config.toml'
        original = profile.read_text()
        for content, check in [(original + '\ninvalid toml !', 'toml'),
                               (original.replace('model_catalog_json =',
                                                 'model_catalog_json = "/wrong"\n# model_catalog_json ='), 'catalog-path')]:
            with self.subTest(check=check):
                profile.write_text(content)
                self.failure(self.run_verifier('--bundle', bundle), 'installed-profile', check, 'validation_failed')

    def test_subprocess_exit_does_not_expose_child_output(self):
        bundle = self.copied_bundle()
        (bundle / 'install.mjs').write_text('console.error("synthetic-private-content"); process.exit(7);')
        result = self.run_verifier('--bundle', bundle)
        data = self.failure(result, 'dry-run', 'installer', 'subprocess_exit')
        self.assertEqual(data['failure']['status'], 7)
        self.assertNotIn('synthetic-private-content', result.stderr)

    def test_missing_bundle_is_filesystem_failure_and_cleans_up(self):
        self.failure(self.run_verifier('--bundle', self.root / 'absent'), 'setup', 'bundle-copy', 'filesystem')

    def test_cleanup_identity_failure_retains_primary_failure(self):
        bundle = self.copied_bundle()
        (bundle / 'install.mjs').write_text('''
import fs from 'node:fs';
import path from 'node:path';
const root = path.dirname(path.dirname(process.argv[1]));
fs.renameSync(root, root + '.retained');
fs.mkdirSync(root);
process.exit(7);
''')
        result = subprocess.run(['node', str(SCRIPT), '--bundle', str(bundle)],
                                capture_output=True, text=True,
                                env={**os.environ, 'TMPDIR': str(self.scratch)})
        data = self.failure(result, 'dry-run', 'installer', 'subprocess_exit')
        self.assertEqual(data['failure']['status'], 7)
        self.assertEqual(data['cleanup_failure'], {'phase': 'cleanup',
                         'check': 'exact-temporary-root', 'cause': 'cleanup_failed'})
        # Identity replacement must fail closed; the enclosing test fixture owns cleanup.
        self.assertEqual(len(list(self.scratch.iterdir())), 2)
