import hashlib
import json
import os
import shutil
import subprocess
import tempfile
import unittest
from pathlib import Path

BUNDLE = Path(__file__).resolve().parents[1] / 'templates/codex-omx-ds41-supervised-team'
BRIDGE = BUNDLE / 'project/.codex/skills/pcaom-ds41-team/scripts/supervisor-bridge.mjs'
# Synthetic process fixtures mirror pinned version output and tmux pane fields;
# passing tests do not establish actual runtime/provider startup capability.
# Spec requires these full-line markers and a nonempty sh/bash Verification fence.
SPEC = '''<!-- PCAOM_APPROVED: yes -->
<!-- PCAOM_CONTEXT_TRANSFER: DeepSeek authorized -->
# Feature
## Constraints
Synthetic fixtures only.
## Touchpoints
fixture.txt
## Unknowns
None.
## Verification
```sh
python3 -m unittest
```
'''
FAKE = r'''#!/usr/bin/env python3
import json, os, pathlib, sys
p = pathlib.Path(sys.argv[0]).name
a = sys.argv[1:]
root = pathlib.Path(os.environ['PCAOM_TEST_ROOT'])
scenario = os.environ.get('PCAOM_TEST_SCENARIO', '')
with open(os.environ['PCAOM_TEST_CALL_LOG'], 'a') as f:
    f.write(json.dumps({'program':p,'args':a,'selected_env':{k:os.environ.get(k) for k in ['OMX_TEAM_WORKER_CLI','OMX_TEAM_WORKER_LAUNCH_ARGS']}})+'\n')
if a in [['--version'], ['-V']]:
    if p == 'omx' and 'PCAOM_TEST_VERSION' in os.environ:
        print(os.environ['PCAOM_TEST_VERSION'])
    else:
        print('wrong' if scenario == p+'-version' else {'codex':'codex-cli 0.156.1','omx':'oh-my-codex v0.21.6\nNode.js v22.22.2','tmux':'tmux 3.7b'}[p])
elif p == 'omx':
    sys.exit('Unexpected OMX runtime command during preflight')
elif a[0] == 'list-panes':
    print('$1\t@1\t%1\tsupervisor\t0\tcodex')
    if (root/'created').exists():
        print('$1\t'+('@9' if scenario == 'changed' else '@2')+'\t%2\tds41-team-demo\t'+('1' if scenario == 'dead' else '0')+'\t'+('zsh' if scenario == 'timeout' else 'codex'))
elif a[0] == 'new-window':
    (root/'created').touch()
    print('$1\t@2\t%2')
elif a[0] == 'set-buffer':
    (root/'buffer').write_text(a[-1])
elif a[0] == 'show-buffer':
    sys.stdout.write('wrong' if scenario == 'buffer' else (root/'buffer').read_text())
elif a[0] == 'send-keys' and a[-1] == 'Enter':
    (root/'entered').touch()
elif a[0] == 'capture-pane':
    if (root/'entered').exists():
        text = (root/'buffer').read_text()
        import re
        match = re.search(r'PCAOM_ACCEPTED:([a-f0-9-]+)',text)
        print('pending' if scenario == 'acceptance' else 'PCAOM_ACCEPTED:'+match[1])
    else:
        print('Fatal: startup failed' if scenario == 'fatal' else 'Codex interactive composer')
    print(os.environ.get('DEEPSEEK_API_KEY',''))
'''


class BridgeTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name).resolve()
        self.project = self.root / 'project'
        self.project.mkdir()
        subprocess.run(['git', 'init', '-q', str(self.project)], check=True)
        self.home = self.root / 'home'
        self.home.mkdir()
        self.catalog = self.home / 'catalog.json'
        shutil.copyfile(BUNDLE / 'codex/deepseek-models.json', self.catalog)
        self.profile = self.home / 'pcaom-ds41.config.toml'
        self.profile.write_text((BUNDLE / 'codex/pcaom-ds41.config.toml').read_text().replace('__PCAOM_MODEL_CATALOG_PATH__', str(self.catalog)))
        self.skill = self.project / '.codex/skills/pcaom-ds41-team/SKILL.md'
        self.skill.parent.mkdir(parents=True)
        self.skill.write_text('synthetic installed Skill')
        self.spec = self.project / 'FEATURE_SPEC.md'
        self.spec.write_text(SPEC)
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        for name in ['tmux', 'omx', 'codex']:
            app = bin_dir / name
            app.write_text(FAKE)
            app.chmod(0o700)
        self.log = self.root / 'calls.jsonl'
        self.env = dict(os.environ, PATH=str(bin_dir)+os.pathsep+os.environ['PATH'],
                        TMUX='synthetic,1,0', TMUX_PANE='%1', CODEX_HOME=str(self.home),
                        DEEPSEEK_API_KEY='secret-sentinel-never-log',
                        PCAOM_TEST_CALL_LOG=str(self.log), PCAOM_TEST_ROOT=str(self.root))

    def invoke(self, *args):
        result = subprocess.run(['node', str(BRIDGE), *args], cwd=self.project,
                                env=self.env, capture_output=True, text=True)
        self.assertNotIn('secret-sentinel-never-log', result.stdout+result.stderr+(self.log.read_text() if self.log.exists() else ''))
        stream = result.stdout if result.returncode == 0 else result.stderr
        self.assertEqual(len(stream.splitlines()), 1, stream)
        self.assertEqual(result.stderr if result.returncode == 0 else result.stdout, '')
        data = json.loads(stream)
        self.assertEqual(data['ok'], result.returncode == 0)
        return result, data

    def start(self):
        return self.invoke('start', '--spec', str(self.spec), '--workers', '2', '--team', 'demo', '--startup-timeout-ms', '350')

    def calls(self, command=None):
        calls = [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []
        return [c for c in calls if command is None or c['args'][0] == command]

    def test_preflight_requires_environment(self):
        for key in ['TMUX', 'TMUX_PANE', 'DEEPSEEK_API_KEY', 'CODEX_HOME']:
            old = self.env.pop(key)
            with self.subTest(key=key):
                self.assertNotEqual(self.start()[0].returncode, 0)
                self.assertEqual(self.calls('new-window'), [])
            self.env[key] = old

    def test_preflight_rejects_versions(self):
        for scenario in ['tmux-version', 'codex-version', 'omx-version']:
            self.env['PCAOM_TEST_SCENARIO'] = scenario
            self.assertNotEqual(self.start()[0].returncode, 0)
            self.assertEqual(self.calls('new-window'), [])

    def test_omx_exact_version_with_diagnostics(self):
        for version in ['oh-my-codex 0.21.6\nNode.js v22.22.2', 'oh-my-codex v0.21.6\nNode.js v22.22.2']:
            self.env['PCAOM_TEST_VERSION'] = version
            self.profile.chmod(0)
            result, data = self.start()
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('readable', data['error'])
        for version in ['oh-my-codex v0.21.7', 'oh-my-codex v0.21.6-beta', 'oh-my-codex vv0.21.6', 'junk\noh-my-codex v0.21.6', 'oh-my-codex v0.21.6\noh-my-codex v0.22.0']:
            self.env['PCAOM_TEST_VERSION'] = version
            self.assertIn('version', self.start()[1]['error'])

    def test_preflight_exact_team_collision_without_runtime_commands(self):
        state = self.project/'.omx/state/team/demo'
        state.mkdir(parents=True)
        self.assertNotEqual(self.start()[0].returncode, 0)
        self.assertEqual(self.calls('new-window'), [])
        self.assertEqual([c for c in self.calls() if c['program'] == 'omx' and c['args'] != ['--version']], [])

    def test_dead_or_fatal_leader_never_receives_handoff(self):
        for scenario in ['dead', 'fatal']:
            with self.subTest(scenario=scenario):
                self.env['PCAOM_TEST_SCENARIO'] = scenario
                self.assertNotEqual(self.start()[0].returncode, 0)
                self.assertEqual(self.calls('set-buffer'), [])
                shutil.rmtree(self.project/'.omx')
                (self.root/'created').unlink()

    def test_preflight_rejects_missing_files_and_unapproved_spec(self):
        for path in [self.profile, self.catalog, self.skill, self.spec]:
            original = path.read_text()
            path.unlink()
            self.assertNotEqual(self.start()[0].returncode, 0)
            path.write_text(original)
        for text in [SPEC.replace('PCAOM_APPROVED: yes', 'PCAOM_APPROVED: no'), SPEC.replace('DeepSeek authorized','no'), SPEC.replace('python3 -m unittest','')]:
            self.spec.write_text(text)
            self.assertNotEqual(self.start()[0].returncode, 0)
        self.assertEqual(self.calls('new-window'), [])

    def test_spec_symlink_outside_and_non_git_rejected(self):
        self.spec.unlink()
        outside = self.root/'outside.md'
        outside.write_text(SPEC)
        self.spec.symlink_to(outside)
        self.assertNotEqual(self.start()[0].returncode, 0)
        self.spec.unlink()
        self.spec.write_text(SPEC)
        shutil.rmtree(self.project/'.git')
        self.assertNotEqual(self.start()[0].returncode, 0)
        self.assertEqual(self.calls('new-window'), [])

    def test_comment_only_verification_is_not_executable(self):
        self.spec.write_text(SPEC.replace('python3 -m unittest', '# run tests later'))
        self.assertNotEqual(self.start()[0].returncode, 0)
        self.assertEqual(self.calls('new-window'), [])

    def test_unreadable_profile_and_existing_window_fail_preflight(self):
        self.profile.chmod(0)
        self.assertNotEqual(self.start()[0].returncode, 0)
        self.profile.chmod(0o600)
        (self.root/'created').touch()
        self.assertNotEqual(self.start()[0].returncode, 0)
        self.assertEqual(self.calls('new-window'), [])

    def test_manifest_symlink_directory_is_rejected_for_inspect(self):
        self.assertEqual(self.start()[0].returncode, 0)
        directory = self.project/'.omx/pcaom-supervisor/demo'
        moved = directory.with_name('moved')
        directory.rename(moved)
        directory.symlink_to(moved, target_is_directory=True)
        self.assertNotEqual(self.invoke('inspect','--team','demo','--pane','leader')[0].returncode, 0)

    def test_start_manifest_context_profile_and_ordered_handoff(self):
        result, data = self.start()
        self.assertEqual(result.returncode, 0, data)
        create, = self.calls('new-window')
        self.assertIn('ds41-team-demo', create['args'])
        self.assertEqual(create['args'][-1], 'codex --profile pcaom-ds41')
        self.assertEqual(create['selected_env'], {'OMX_TEAM_WORKER_CLI':'codex','OMX_TEAM_WORKER_LAUNCH_ARGS':'--profile pcaom-ds41'})
        before = self.calls()[:self.calls().index(create)]
        for call in before:
            self.assertIn((call['program'], call['args'][0]), [('codex','--version'), ('omx','--version'), ('tmux','-V'), ('tmux','list-panes')])
        calls = [c['args'] for c in self.calls()]
        set_args, = [a for a in calls if a[0] == 'set-buffer']
        self.assertEqual(set_args[:2], ['set-buffer','-b'])
        self.assertEqual(set_args[3], '--')
        self.assertRegex(set_args[-1], r'After accepting this instruction, print this exact line: PCAOM_ACCEPTED:[a-f0-9-]+$')
        self.assertNotIn('PCAOM_READY', set_args[-1])
        sequence = [set_args, ['show-buffer','-b',set_args[2]], ['send-keys','-t','%2','C-u'], ['paste-buffer','-t','%2','-b',set_args[2],'-p','-d'], ['send-keys','-t','%2','Enter']]
        indexes = [calls.index(a) for a in sequence]
        self.assertEqual(indexes, sorted(indexes))
        manifest_path = self.project/'.omx/pcaom-supervisor/demo/run.json'
        manifest = json.loads(manifest_path.read_text())
        for key, value in {'schema_version':1,'team':'demo','session':'$1','window_id':'@2','leader_pane_id':'%2','supervisor_pane_id':'%1','profile':'pcaom-ds41','state':'starting'}.items():
            self.assertEqual(manifest[key],value)
        context = Path(manifest['context_path'])
        self.assertEqual(manifest['context_digest'], hashlib.sha256(context.read_bytes()).hexdigest())
        for text in [str(self.spec), hashlib.sha256(self.spec.read_bytes()).hexdigest(), 'Constraints','Touchpoints','Unknowns','Verification','DeepSeek authorized']:
            self.assertIn(text,context.read_text())
        for path in [manifest_path,context]:
            self.assertEqual(path.stat().st_mode & 0o777,0o600)
            self.assertNotIn(self.env['DEEPSEEK_API_KEY'],path.read_text())
        self.assertNotEqual(self.start()[0].returncode,0)
        self.assertEqual(len(self.calls('new-window')),1)

    def test_timeout_rolls_back_only_proven_window(self):
        self.env['PCAOM_TEST_SCENARIO']='timeout'
        self.assertNotEqual(self.start()[0].returncode,0)
        self.assertEqual([c['args'] for c in self.calls('kill-window')],[['kill-window','-t','@2']])
        manifest=json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
        self.assertEqual(manifest['state'],'failed')

    def test_changed_identity_does_not_kill(self):
        self.env['PCAOM_TEST_SCENARIO']='changed'
        self.assertNotEqual(self.start()[0].returncode,0)
        self.assertEqual(self.calls('kill-window'),[])

    def test_bad_buffer_never_submits(self):
        self.env['PCAOM_TEST_SCENARIO']='buffer'
        self.assertNotEqual(self.start()[0].returncode,0)
        self.assertEqual(self.calls('paste-buffer'),[])
        self.assertEqual(self.calls('send-keys'),[])

    def test_failed_acceptance_rolls_back(self):
        self.env['PCAOM_TEST_SCENARIO']='acceptance'
        self.assertNotEqual(self.start()[0].returncode,0)
        self.assertEqual([c['args'] for c in self.calls('kill-window')],[['kill-window','-t','@2']])

    def test_inspect_requires_manifest_and_fresh_identity(self):
        self.assertEqual(self.start()[0].returncode,0)
        for pane in ['leader','%2']:
            result,data=self.invoke('inspect','--team','demo','--pane',pane,'--lines','40')
            self.assertEqual(result.returncode,0,data)
            self.assertIn('[REDACTED]',result.stdout)
        for args in [('demo','%1'),('demo','current'),('unknown','leader')]:
            self.assertNotEqual(self.invoke('inspect','--team',args[0],'--pane',args[1])[0].returncode,0)
        self.env['PCAOM_TEST_SCENARIO']='changed'
        self.assertNotEqual(self.invoke('inspect','--team','demo','--pane','leader')[0].returncode,0)

    def test_malformed_arguments_are_one_json_error(self):
        for args in [[],['unknown'],['start'],['inspect','--team','x'],['start','--spec','x','--workers','0'],['start','--spec','x','--workers','2','--workers','3'],['inspect','--team','../x','--pane','leader'],['inspect','--team','x','--pane','leader','--unknown','x']]:
            self.assertNotEqual(self.invoke(*args)[0].returncode,0)


if __name__ == '__main__':
    unittest.main()
