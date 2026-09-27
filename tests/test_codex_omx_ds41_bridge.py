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
PROJECT_MARKER = '__PCAOM_PROJECT_PATH__'
INTERNAL = 'demo-' + hashlib.sha256(b'fixture').hexdigest()[:8]
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
    manifest=root/'project/.omx/pcaom-supervisor/demo/run.json'
    state=json.loads(manifest.read_text()).get('state') if manifest.exists() else None
    f.write(json.dumps({'program':p,'args':a,'manifest_state':state,'state_root':os.environ.get('OMX_TEAM_STATE_ROOT'),'selected_env':{k:os.environ.get(k) for k in ['OMX_TEAM_WORKER_CLI','OMX_TEAM_WORKER_LAUNCH_ARGS']}})+'\n')
if p == 'git':
    import subprocess
    sys.exit(subprocess.run([os.environ['PCAOM_TEST_REAL_GIT'], *a]).returncode)
elif a in [['--version'], ['-V']]:
    if scenario == 'delayed-version' and p == 'codex':
        import time
        time.sleep(2)
    if p == 'omx' and 'PCAOM_TEST_VERSION' in os.environ:
        print(os.environ['PCAOM_TEST_VERSION'])
    else:
        print('wrong' if scenario == p+'-version' else {'codex':'codex-cli 0.156.1','omx':'oh-my-codex v0.21.6\nNode.js v22.22.2','tmux':'tmux 3.7b'}[p])
elif p == 'omx':
    if a[:3] == ['team','api','await-event']:
        request=json.loads(a[4])
        data={'status':'timeout','cursor':request['after_event_id'],'event':None}
        if scenario == 'event': data={'status':'event','cursor':'e3','event':{'event_id':'e3','team':request['team_name'],'type':'task_completed','worker':'worker-1','created_at':'now'}}
        print(json.dumps({'schema_version':'1.0','timestamp':'2026-09-27T00:00:00Z','command':'wrong' if scenario == 'bad-envelope' else 'omx team api await-event','ok':True,'operation':'await-event','data':data}))
    elif a[:3] == ['team','api','send-message']:
        if scenario == 'api-error': sys.exit('unsupported sender')
        request=json.loads(a[4])
        import re
        body=request['body']
        ack_path=json.loads(re.search(r'^Acknowledgment path: (.+)$',body,re.M)[1])
        ack=json.loads(re.search(r'^Acknowledgment JSON: (.+)$',body,re.M)[1])
        if scenario not in ['dispatch-false','ack-timeout','schema-error']:
            if scenario == 'steer-bad-ack': ack['message_id']='wrong'
            pathlib.Path(ack_path).write_text(json.dumps(ack))
        print(json.dumps({'schema_version':'bad' if scenario == 'schema-error' else '1.0','timestamp':'2026-09-27T00:00:00Z','command':'omx team api send-message','ok':True,'operation':'send-message','data':{'message':{'message_id':'omx-id'},'dispatch':{'ok':scenario != 'dispatch-false'}}}))
    elif a[:2] == ['team','resume']:
        print('wrong' if scenario == 'bad-prefix' else 'Team started: '+a[2])
    elif a[:2] == ['team','shutdown']:
        if scenario == 'shutdown-error': sys.exit('shutdown gate failed')
        if scenario == 'shutdown-delayed':
            import time
            time.sleep(6)
        if scenario == 'shutdown-timeout':
            import time
            time.sleep(61)
        if scenario not in ['bad-prefix','shutdown-partial']:
            import shutil
            shutil.rmtree(pathlib.Path(os.environ['OMX_TEAM_STATE_ROOT'])/'team'/a[2])
            if scenario != 'shutdown-worker-left': (root/'workers').unlink(missing_ok=True)
        if scenario == 'shutdown-log-prefix': print('[omx:team] shutdown cleanup complete')
        print('wrong' if scenario == 'bad-prefix' else 'Team shutdown complete: '+a[2])
    else: sys.exit('Unexpected OMX runtime command during preflight')
elif a[0] == 'display-message':
    if a[-1] == '#{session_id}':
        print('$1')
        sys.exit(0)
    pane=a[a.index('-t')+1]
    print('$1\t@2\t'+pane+'\t'+('999' if scenario == 'pane-pid-changed' else ('222' if pane == '%2' else '333'))+'\towner-demo\t1700000000\tfixture:2')
elif a[0] == 'list-panes':
    generation = '\t/tmp/fake-tmux.sock\t'+('999' if scenario == 'restarted' or (scenario == 'restart-start' and (root/'created').exists()) else '123')+'\t1700000000'
    print('$1\t@1\t%1\tsupervisor\t0\tcodex'+generation)
    if (root/'created').exists():
        print('$1\t'+('@9' if scenario == 'changed' or (scenario == 'identity-after-buffer' and (root/'buffer').exists()) else '@2')+'\t%2\tds41-team-demo\t'+('1' if scenario == 'dead' else '0')+'\t'+('zsh' if scenario == 'timeout' else 'codex')+generation)
        if (root/'workers').exists(): print('$1\t@2\t%3\tds41-team-demo\t0\tcodex'+generation)
        if (root/'extra-hud').exists(): print('$1\t@2\t%4\tds41-team-demo\t0\tnode'+generation)
elif a[0] == 'show-environment':
    if (root/'session-env.json').exists():
        for key,value in json.loads((root/'session-env.json').read_text()).items():
            print('-'+key if value is None else key+'='+value)
    else: print('DEEPSEEK_API_KEY=previous-secret-sentinel\nCODEX_HOME=/previous/home\nPATH=/usr/bin:/bin' if scenario == 'previous-env' else '-DEEPSEEK_API_KEY')
elif a[0] == '-C':
    count=int((root/'attaches').read_text())+1 if (root/'attaches').exists() else 1
    (root/'attaches').write_text(str(count))
    if scenario == 'restore-fails' and count > 1: sys.exit('restoration attach injected failure')
    if scenario != 'import-fails':
        (root/'session-env.json').write_text(json.dumps({k:os.environ.get(k) for k in ['DEEPSEEK_API_KEY','CODEX_HOME','PATH']}))
elif a[0] == 'set-environment':
    environment=json.loads((root/'session-env.json').read_text()) if (root/'session-env.json').exists() else {}
    if '-u' in a: environment.pop(a[-1],None)
    if '-r' in a: environment[a[-1]]=None
    (root/'session-env.json').write_text(json.dumps(environment))
elif a[0] == 'show-options':
    if scenario == 'previous-env': print('update-environment[2] CUSTOM_VAR')
elif a[0] == 'set-option' and scenario == 'option-fails':
    sys.exit('cannot set import allowlist')
elif a[0] == 'new-window':
    (root/'created').touch()
    if (root/'session-env.json').exists():
        (root/'leader-env.json').write_text((root/'session-env.json').read_text())
    print('$1\t@2\t%2')
elif a[0] == 'set-buffer':
    (root/'buffer').write_text(a[-1])
elif a[0] == 'show-buffer':
    sys.stdout.write('wrong' if scenario in ['buffer','buffer-cleanup'] else (root/'buffer').read_text())
elif a[0] == 'send-keys' and a[-1] == 'Enter':
    (root/'entered').touch()
    text=(root/'buffer').read_text()
    if text.startswith('Steering message:'):
        import re
        ack_path=json.loads(re.search(r'^Acknowledgment path: (.+)$',text,re.M)[1])
        ack=json.loads(re.search(r'^Acknowledgment JSON: (.+)$',text,re.M)[1])
        if scenario != 'ack-timeout': pathlib.Path(ack_path).write_text(json.dumps(ack))
        sys.exit(0)
    if text.startswith('GO JSON: '):
        (root/'go').write_text(text)
        if scenario == 'go-enter': sys.exit('GO Enter failure')
        if scenario == 'workers-after-go': (root/'workers').touch()
        sys.exit(0)
    if scenario == 'ack-after-readiness-budget':
        import re, time
        ack_path=json.loads(re.search(r'^Acknowledgment path: (.+)$',text,re.M)[1])
        ack=json.loads(re.search(r'^Acknowledgment JSON: (.+)$',text,re.M)[1])
        (root/'ack-schedule.json').write_text(json.dumps({'path':ack_path,'ack':ack,'due':time.time()+0.45}))
        sys.exit(0)
    if scenario == 'submit': sys.exit('submission failed')
    if scenario in ['accepted','cleanup','bad-ack','stale-ack','previous-env','symlink-ack','early-workers','workers-after-go','go-enter','go-paste','composer-delayed']:
        import re
        text=(root/'buffer').read_text()
        ack_path=json.loads(re.search(r'^Acknowledgment path: (.+)$',text,re.M)[1])
        ack=json.loads(re.search(r'^Acknowledgment JSON: (.+)$',text,re.M)[1])
        if scenario == 'bad-ack': ack['team']='wrong'
        if scenario == 'stale-ack': ack['handoff_id']='old-handoff'
        temporary=pathlib.Path(ack_path+'.tmp')
        temporary.write_text(json.dumps(ack))
        temporary.chmod(0o600)
        if scenario == 'symlink-ack': pathlib.Path(ack_path).symlink_to(temporary)
        else:
            os.link(temporary,ack_path)
            temporary.unlink()
        if scenario == 'early-workers': (root/'workers').touch()
elif a[0] == 'paste-buffer' and scenario == 'go-paste' and (root/'buffer').read_text().startswith('GO JSON: '):
    sys.exit('GO paste failure')
elif a[0] == 'paste-buffer' and scenario == 'paste':
    sys.exit('paste failed')
elif a[0] == 'delete-buffer':
    if scenario in ['cleanup','buffer-cleanup']: sys.exit('buffer cleanup failed')
    (root/'buffer').unlink(missing_ok=True)
elif a[0] == 'capture-pane':
    count=int((root/'captures').read_text())+1 if (root/'captures').exists() else 1
    (root/'captures').write_text(str(count))
    if scenario == 'ack-after-readiness-budget' and not (root/'entered').exists():
        import time
        time.sleep(0.20)
        print('Codex loading' if count < 4 else '› Ask Codex to do anything')
    elif scenario == 'ack-after-readiness-budget':
        import time
        schedule=json.loads((root/'ack-schedule.json').read_text())
        if time.time() >= schedule['due'] and not pathlib.Path(schedule['path']).exists():
            pathlib.Path(schedule['path']).write_text(json.dumps(schedule['ack']))
        print('Leader processing')
    elif scenario == 'composer-delayed' and count < 3:
        print('Codex loading')
    elif scenario == 'update-modal':
        print('› Ask Codex to do anything')
        print('Update available · 0.156.1 → 0.157.1')
        print('1. Update now')
        print('2. Skip')
        print('3. Skip until next version')
    elif (root/'entered').exists():
        text = (root/'buffer').read_text() if (root/'buffer').exists() else ''
        import re
        print(text if scenario == 'echo' else 'Leader processing')
    else:
        print('Fatal: startup failed' if scenario == 'fatal' else '› Ask Codex to do anything')
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
        self.catalog = self.home / 'model-catalogs/pcaom-deepseek-models.json'
        self.catalog.parent.mkdir()
        shutil.copyfile(BUNDLE / 'codex/deepseek-models.json', self.catalog)
        self.profile = self.home / 'pcaom-ds41.config.toml'
        self.profile.write_text(
            (BUNDLE / 'codex/pcaom-ds41.config.toml').read_text()
            .replace('__PCAOM_MODEL_CATALOG_PATH__', str(self.catalog))
            .replace(PROJECT_MARKER, str(self.project))
        )
        self.skill = self.project / '.codex/skills/pcaom-ds41-team/SKILL.md'
        self.skill.parent.mkdir(parents=True)
        self.skill.write_text('synthetic installed Skill')
        self.spec = self.project / 'FEATURE_SPEC.md'
        self.spec.write_text(SPEC)
        (self.project / '.gitignore').write_text('.omx/\n.omx-pcaom-team-state/\n')
        subprocess.run(['git', '-C', str(self.project), 'add', '.'], check=True)
        subprocess.run(
            ['git', '-C', str(self.project), '-c', 'user.name=PCAOM Test',
             '-c', 'user.email=pcaom-test@example.invalid', 'commit', '-qm', 'test fixture'],
            check=True,
        )
        bin_dir = self.root / 'bin'
        bin_dir.mkdir()
        for name in ['tmux', 'omx', 'codex', 'git']:
            app = bin_dir / name
            app.write_text(FAKE)
            app.chmod(0o700)
        self.log = self.root / 'calls.jsonl'
        self.env = dict(os.environ, PATH=str(bin_dir)+os.pathsep+os.environ['PATH'],
                        TMUX='synthetic,1,0', TMUX_PANE='%1', CODEX_HOME=str(self.home),
                        DEEPSEEK_API_KEY='secret-sentinel-never-log',
                        PCAOM_TEST_SCENARIO='accepted',
                        PCAOM_TEST_REAL_GIT=shutil.which('git'),
                        PCAOM_TEST_CALL_LOG=str(self.log), PCAOM_TEST_ROOT=str(self.root))

    def invoke(self, *args):
        result = subprocess.run(['node', str(BRIDGE), *args], cwd=self.project,
                                env=self.env, capture_output=True, text=True)
        self.assertNotIn('secret-sentinel-never-log', result.stdout+result.stderr+(self.log.read_text() if self.log.exists() else ''))
        self.assertNotIn('previous-secret-sentinel', result.stdout+result.stderr+(self.log.read_text() if self.log.exists() else ''))
        stream = result.stdout if result.returncode == 0 else result.stderr
        self.assertEqual(len(stream.splitlines()), 1, stream)
        self.assertEqual(result.stderr if result.returncode == 0 else result.stdout, '')
        data = json.loads(stream)
        self.assertEqual(data['ok'], result.returncode == 0)
        return result, data

    def start(self):
        scenario = self.env.get('PCAOM_TEST_SCENARIO')
        timeout = '1500' if scenario == 'ack-after-readiness-budget' else '350' if scenario in ['timeout','acceptance','echo'] else '5000'
        return self.invoke('start', '--spec', str(self.spec), '--workers', '2', '--team', 'demo', '--startup-timeout-ms', timeout, '--command-timeout-ms', '100' if self.env.get('PCAOM_TEST_SCENARIO') == 'delayed-version' else '5000')

    def assert_failure(self, outcome, stage, code='BRIDGE_ERROR'):
        result,data=outcome
        self.assertNotEqual(result.returncode,0,data)
        self.assertEqual(data.get('stage'),stage,data)
        self.assertEqual(data.get('code'),code,data)
        return data

    def calls(self, command=None):
        calls = [json.loads(line) for line in self.log.read_text().splitlines()] if self.log.exists() else []
        return [c for c in calls if command is None or c['args'][0] == command]

    def team_fixture(self):
        self.assertEqual(self.start()[0].returncode, 0)
        self.run_dir=self.project/'.omx/pcaom-supervisor/demo'
        run=json.loads((self.run_dir/'run.json').read_text())
        self.state_root=Path(run.get('state_root',str(self.project/'.omx/state')))
        self.team_dir=self.state_root/'team'/INTERNAL
        self.team_dir.mkdir(parents=True)
        (self.root/'workers').touch()
        worker={'name':'worker-1','index':1,'role':'executor','assigned_tasks':['1'],'pid':333,'pane_id':'%3','working_dir':str(self.project),'worktree_path':str(self.project),'team_state_root':str(self.state_root)}
        self.config={'name':INTERNAL,'display_name':'demo','requested_name':'demo','task':'Synthetic','agent_type':'executor','worker_launch_mode':'interactive','lifecycle_profile':'default','worker_count':1,'max_workers':20,'workers':[worker],'created_at':'2026-09-27T00:00:00Z','tmux_session':'fixture:2','tmux_session_id':'$1','tmux_session_created':'1700000000','next_task_id':2,'leader_cwd':str(self.project),'team_state_root':str(self.state_root),'leader_pane_id':'%2','leader_pane_pid':222,'hud_pane_id':None,'hud_pane_pid':None,'tmux_pane_owner_id':'owner-demo','resize_hook_name':None,'resize_hook_target':None,'config_generation':1}
        self.write_team()
        (self.team_dir/'phase.json').write_text(json.dumps({'current_phase':'team-exec','iteration':1}))
        (self.team_dir/'tasks').mkdir()
        self.task={'id':'1','subject':'fixture','description':'synthetic','status':'completed','created_at':'now','version':1}
        (self.team_dir/'tasks/task-1.json').write_text(json.dumps(self.task))
        worker_dir=self.team_dir/'workers/worker-1'
        worker_dir.mkdir(parents=True)
        for name,value in [('identity',worker),('status',{'state':'done'}),('heartbeat',{'pid':333,'alive':True})]:
            (worker_dir/(name+'.json')).write_text(json.dumps(value))
        (self.team_dir/'events').mkdir()
        events=[{'event_id':'e1','team':INTERNAL,'type':'task_completed','worker':'worker-1','created_at':'now'}, {'event_id':'e2','team':INTERNAL,'type':'worker_diff_activity','worker':'worker-1','created_at':'now'}]
        (self.team_dir/'events/events.ndjson').write_text('\n'.join(json.dumps(event) for event in events)+'\n')
        self.bind_team()
        self.log.write_text('')

    def bind_team(self):
        run=json.loads((self.run_dir/'run.json').read_text())
        if 'binding_contract' not in run: return
        binding=dict(run['binding_contract'])
        keys=binding.pop('identity_fields')
        worker_keys=binding.pop('worker_identity_fields')
        identity={key:self.config.get(key) for key in keys}
        identity.update(state_root=str(self.state_root),team_directory=str(self.team_dir),workers=[{key:worker.get(key) for key in worker_keys} for worker in self.config['workers']],leader={'session_id':'session','worker_id':'leader-fixed','role':'leader'})
        binding.update(internal_name=INTERNAL,display_name='demo',requested_name='demo',created_at=self.config['created_at'],bound_at='2026-09-27T01:00:00Z',leader_pane_pid=222,owner_id='owner-demo',leader=identity['leader'],identity=identity,config_sha256=hashlib.sha256((self.team_dir/'config.json').read_bytes()).hexdigest(),manifest_sha256=hashlib.sha256((self.team_dir/'manifest.v2.json').read_bytes()).hexdigest())
        (self.run_dir/'team-bound.json').write_text(json.dumps(binding))

    def write_team(self):
        (self.team_dir/'config.json').write_text(json.dumps(self.config))
        (self.team_dir/'manifest.v2.json').write_text(json.dumps(dict(self.config,schema_version=2,leader={'session_id':'session','worker_id':'leader-fixed','role':'leader'})))

    def runtime_calls(self):
        return [c['args'] for c in self.calls() if c['program']=='omx']

    def final_fixture(self):
        run=json.loads((self.run_dir/'run.json').read_text())
        handoff=self.project/'handoff.md'
        handoff.write_text('Synthetic final handoff')
        proof={'team':INTERNAL,'context_digest':run['context_digest'],'verification':[{'command':'python3 -m unittest','result':'pass','exit_code':0}], 'handoff_path':str(handoff),'handoff_digest':hashlib.sha256(handoff.read_bytes()).hexdigest()}
        (self.run_dir/'leader-final.json').write_text(json.dumps(proof))

    def test_status_returns_raw_team_summary_and_manifest_identity(self):
        self.team_fixture()
        before=(self.run_dir/'run.json').read_bytes()
        result,data=self.invoke('status','--team','demo')
        self.assertEqual(result.returncode,0,data)
        evidence=data['evidence']
        self.assertEqual(evidence['mode'],'passive')
        self.assertEqual(evidence['team_identity']['config'],self.config)
        self.assertEqual(evidence['tasks'],[self.task])
        self.assertEqual(evidence['latest_wakeable_event']['event_id'],'e1')
        self.assertEqual(before,(self.run_dir/'run.json').read_bytes())
        self.assertEqual(self.runtime_calls(),[])
        self.assertTrue(all(c['program']=='git' or c['program']=='tmux' and c['args'][0] in ['list-panes','display-message'] for c in self.calls()))

    def test_status_accepts_runtime_notice_ledger_beside_single_team(self):
        self.team_fixture()
        notice = self.state_root/'team/notice-ledger.json'
        notice.write_text(json.dumps({'schema_version': 1, 'notices': []}))
        result, data = self.invoke('status','--team','demo')
        self.assertEqual(result.returncode, 0, data)
        self.assertEqual(data['evidence']['tasks'], [self.task])

    def test_status_rejects_malformed_runtime_notice_ledger_as_identity_failure(self):
        self.team_fixture()
        (self.state_root/'team/notice-ledger.json').write_text('{')
        self.assert_failure(self.invoke('status','--team','demo'),
                            'status','IDENTITY_INVALID')

    def test_status_rejects_symlink_runtime_notice_ledger(self):
        self.team_fixture()
        target = self.root/'notice-ledger-target.json'
        target.write_text(json.dumps({'schema_version': 1, 'notices': []}))
        (self.state_root/'team/notice-ledger.json').symlink_to(target)
        self.assert_failure(self.invoke('status','--team','demo'),
                            'status','IDENTITY_INVALID')

    def test_status_awaiting_team_and_uncertain_go(self):
        self.assertEqual(self.start()[0].returncode,0)
        self.log.write_text('')
        result,data=self.invoke('status','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(data['evidence']['status'],'awaiting-team')
        self.assertEqual(self.runtime_calls(),[])

    def test_start_allocates_exclusive_root_and_requires_leader_binding(self):
        result,data=self.start()
        self.assertEqual(result.returncode,0,data)
        run=data['evidence']
        self.assertIn('run_id',run)
        self.assertEqual(run['binding_contract'].get('adapter_version'),1)
        state_root=self.project/'.omx-pcaom-team-state'/run['run_id']
        self.assertEqual(run['state_root'],str(state_root))
        self.assertEqual(run['state_root_identity'],{'dev':state_root.stat().st_dev,'ino':state_root.stat().st_ino,'uid':state_root.stat().st_uid})
        self.assertIn('OMX_TEAM_STATE_ROOT='+str(state_root),self.calls('new-window')[0]['args'])
        self.assertIn('team-bound.json',(self.root/'go').read_text())

    def test_unbound_team_blocks_all_mutating_or_await_calls(self):
        self.team_fixture()
        (self.run_dir/'team-bound.json').unlink(missing_ok=True)
        result,data=self.invoke('status','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(data['evidence']['status'],'team-unbound')
        for command in ['await','steer','resume','finalize','abort']:
            self.assert_failure(self.invoke(*self.lifecycle_arguments(command)),command,'TEAM_UNBOUND')
        self.assertEqual(self.runtime_calls(),[])

    def test_active_inspect_authorizes_workers_but_not_extra_hud(self):
        self.team_fixture()
        (self.root/'extra-hud').touch()
        for pane in ['leader','%3']:
            result,data=self.invoke('inspect','--team','demo','--pane',pane)
            self.assertEqual(result.returncode,0,data)
        self.assert_failure(self.invoke('inspect','--team','demo','--pane','%4'),'inspect')
        self.config['workers'][0]['pid']=334
        self.write_team()
        self.assert_failure(self.invoke('inspect','--team','demo','--pane','%3'),'inspect','IDENTITY_INVALID')

    def test_unbound_inspect_cannot_adopt_recorded_worker_panes(self):
        self.team_fixture()
        (self.run_dir/'team-bound.json').unlink()
        file=self.run_dir/'run.json'
        manifest=json.loads(file.read_text())
        manifest['pane_ids'].append('%3')
        file.write_text(json.dumps(manifest))
        self.assert_failure(self.invoke('inspect','--team','demo','--pane','%3'),'inspect')
        self.assertEqual(self.calls('capture-pane'),[])
        result,data=self.invoke('inspect','--team','demo','--pane','leader')
        self.assertEqual(result.returncode,0,data)

    def test_shutdown_delayed_success_and_partial_teardown(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='shutdown-delayed'
        result,data=self.invoke('abort','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertFalse(self.team_dir.exists())
        self.assertEqual(self.calls('team')[-1]['manifest_state'],'shutdown_submitting')

    def test_shutdown_partial_teardown_is_uncertain_and_cannot_retry(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='shutdown-partial'
        self.assert_failure(self.invoke('abort','--team','demo'),'abort')
        self.assertEqual(json.loads((self.run_dir/'run.json').read_text())['state'],'shutdown_uncertain')
        self.log.write_text('')
        self.assert_failure(self.invoke('abort','--team','demo'),'abort')
        self.assertEqual(self.runtime_calls(),[])

    def test_binding_replay_internal_mismatch_and_root_replacement(self):
        self.team_fixture()
        binding_path=self.run_dir/'team-bound.json'
        original=json.loads(binding_path.read_text())
        for key,value in [('internal_name','other'),('run_id','replayed'),('go_id','replayed'),('context_digest','0'*64),('state_root','/other')]:
            binding_path.write_text(json.dumps(dict(original,**{key:value})))
            self.assert_failure(self.invoke('resume','--team','demo'),'resume','IDENTITY_INVALID')
            self.assertEqual(self.calls(),[])
        binding_path.write_text(json.dumps(original))
        moved=self.state_root.with_name(self.state_root.name+'-original')
        self.state_root.rename(moved)
        self.state_root.mkdir()
        self.assert_failure(self.invoke('abort','--team','demo'),'abort','IDENTITY_INVALID')
        self.state_root.rmdir()
        self.state_root.symlink_to(moved,target_is_directory=True)
        self.assert_failure(self.invoke('abort','--team','demo'),'abort')
        self.assertEqual(self.calls(),[])

    def test_mutable_counters_do_not_invalidate_binding_startup_hashes(self):
        self.team_fixture()
        self.config['next_task_id']=42
        self.config['config_generation']=9
        self.config['workers'][0]['assigned_tasks']=['1','2']
        self.write_team()
        result,data=self.invoke('resume','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(self.runtime_calls(),[['team','resume',INTERNAL]])
        self.assertEqual(self.calls('team')[0]['state_root'],str(self.state_root))
        run=json.loads((self.run_dir/'run.json').read_text())
        self.assertEqual(run['binding_state'],'accepted')
        self.assertEqual(run['binding_digest'],hashlib.sha256((self.run_dir/'team-bound.json').read_bytes()).hexdigest())

    def test_binding_json_key_order_is_not_identity(self):
        self.team_fixture()
        file=self.run_dir/'team-bound.json'
        file.write_text(json.dumps(json.loads(file.read_text()),sort_keys=True))
        result,data=self.invoke('status','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(data['evidence']['status'],'bound')

    def test_invalid_binding_status_is_unbound_without_authority(self):
        self.team_fixture()
        file=self.run_dir/'team-bound.json'
        binding=json.loads(file.read_text())
        binding['go_id']='replayed'
        file.write_text(json.dumps(binding))
        result,data=self.invoke('status','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(data['evidence']['status'],'team-unbound')
        self.assertEqual(self.calls(),[])
        self.assert_failure(self.invoke('abort','--team','demo'),'abort','IDENTITY_INVALID')
        self.assertEqual(self.calls(),[])

    def test_pinned_resolver_isolated_root_excludes_alias_and_extra_candidate_blocks(self):
        executable=shutil.which('omx')
        module=Path(executable).resolve().parents[1]/'team/team-identity.js' if executable else Path('/missing')
        if not module.is_file(): self.skipTest('Pinned OMX resolver unavailable')
        package=json.loads((module.parents[2]/'package.json').read_text())
        if package['version'] != '0.21.6': self.skipTest('Exact OMX 0.21.6 required')
        self.team_fixture()
        (self.team_dir/'phase.json').write_text(json.dumps({'current_phase':'complete'}))
        other=self.project/'.omx/state/team/evil'
        other.mkdir(parents=True)
        alias=dict(self.config,name='evil',display_name=INTERNAL,requested_name=INTERNAL)
        (other/'config.json').write_text(json.dumps(alias))
        def resolve():
            result=subprocess.run(['node','--input-type=module','-e','const m=await import(process.argv[1]); console.log(JSON.stringify({name:m.buildInternalTeamName("demo",{runId:"fixture"}),resolved:m.resolveTeamNameForCurrentContext(process.argv[2],process.argv[3],JSON.parse(process.argv[4]))}));',module.as_uri(),INTERNAL,str(self.project),json.dumps({'OMX_TEAM_STATE_ROOT':str(self.state_root)})],capture_output=True,text=True,check=True)
            return json.loads(result.stdout)
        self.assertEqual(resolve(),{'name':INTERNAL,'resolved':INTERNAL})
        self.assertEqual(self.invoke('await','--team','demo','--timeout-ms','1')[0].returncode,0)
        self.assertEqual(self.calls('team')[0]['state_root'],str(self.state_root))
        extra=self.state_root/'team/evil'
        shutil.copytree(other,extra)
        self.assertEqual(resolve()['resolved'],'evil')
        self.log.write_text('')
        self.assert_failure(self.invoke('abort','--team','demo'),'abort','IDENTITY_INVALID')
        self.assertEqual(self.calls(),[])

    def test_shutdown_timeout_is_uncertain_with_sixty_second_bound(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='shutdown-timeout'
        data=self.assert_failure(self.invoke('abort','--team','demo'),'abort','COMMAND_TIMEOUT')
        self.assertEqual(data['command_evidence']['timeout_ms'],60000)
        self.assertEqual(json.loads((self.run_dir/'run.json').read_text())['state'],'shutdown_uncertain')
        self.log.write_text('')
        self.assert_failure(self.invoke('abort','--team','demo'),'abort')
        self.assertEqual(self.runtime_calls(),[])

    def test_shutdown_requires_frozen_workers_gone(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='shutdown-worker-left'
        self.assert_failure(self.invoke('abort','--team','demo'),'abort')
        self.assertEqual(json.loads((self.run_dir/'run.json').read_text())['state'],'shutdown_uncertain')

    def test_await_timeout_does_not_launch_codex_or_send_tmux_keys(self):
        self.team_fixture()
        for extra,cursor in [((),'e1'),(('--after-event-id','explicit'),'explicit')]:
            result,data=self.invoke('await','--team','demo','--timeout-ms','100',*extra)
            self.assertEqual(result.returncode,0,data)
            self.assertEqual(data['evidence']['status'],'timeout')
            self.assertEqual(data['evidence']['cursor'],cursor)
            args=self.runtime_calls()[-1]
            self.assertEqual(args[:4],['team','api','await-event','--input'])
            self.assertEqual(json.loads(args[4]),{'team_name':INTERNAL,'after_event_id':cursor,'timeout_ms':100,'poll_ms':100,'wakeable_only':True})
            self.assertEqual(args[5:],['--json'])
        self.assertEqual(self.calls('send-keys'),[])
        self.assertFalse(any(c['program']=='codex' for c in self.calls()))

    def test_steer_sends_message_id_and_requires_matching_ack(self):
        self.team_fixture()
        result,data=self.invoke('steer','--team','demo','--message','Proceed with fixture','--ack-timeout-ms','100')
        self.assertEqual(result.returncode,0,data)
        evidence=data['evidence']
        request=json.loads(self.runtime_calls()[0][4])
        self.assertEqual(request['from_worker'],'supervisor')
        self.assertEqual(request['to_worker'],'leader-fixed')
        self.assertIn(evidence['message_id'],request['body'])
        self.assertIn('Proceed with fixture',request['body'])
        self.assertEqual(evidence['capability'],'experimental-one-way-file-ack')
        self.assertEqual(self.calls('send-keys'),[])
        self.env['PCAOM_TEST_SCENARIO']='steer-bad-ack'
        self.assert_failure(self.invoke('steer','--team','demo','--message','next','--ack-timeout-ms','100'),'steer')

    def test_mailbox_failure_uses_verified_named_buffer_and_marks_degraded(self):
        self.team_fixture()
        for scenario in ['api-error','dispatch-false','schema-error']:
            self.env['PCAOM_TEST_SCENARIO']=scenario
            self.log.write_text('')
            result,data=self.invoke('steer','--team','demo','--message','fixture','--ack-timeout-ms','100')
            self.assertEqual(result.returncode,0,data)
            self.assertEqual(data['evidence']['transport'],'degraded-tmux-fallback')
            self.assertEqual(len(self.calls('show-buffer')),1)
            self.assertEqual(len(self.calls('delete-buffer')),1)
            self.assertEqual(self.calls('paste-buffer')[0]['args'][2],'%2')
            self.assertIn('degraded_reason',json.loads((self.run_dir/'run.json').read_text()))

    def test_resume_requires_matching_team_window_and_leader_pane(self):
        self.team_fixture()
        result,data=self.invoke('resume','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(self.runtime_calls(),[['team','resume',INTERNAL]])
        self.log.write_text('')
        self.env['PCAOM_TEST_SCENARIO']='pane-pid-changed'
        self.assert_failure(self.invoke('resume','--team','demo'),'resume')
        self.assertEqual(self.runtime_calls(),[])

    def test_finalize_rejects_pending_in_progress_or_failed_tasks(self):
        self.team_fixture()
        self.final_fixture()
        for status in ['pending','blocked','in_progress','failed','unknown']:
            (self.team_dir/'tasks/task-1.json').write_text(json.dumps(dict(self.task,status=status)))
            self.assert_failure(self.invoke('finalize','--team','demo'),'finalize')
        self.assertEqual(self.runtime_calls(),[])

    def test_finalize_shuts_down_only_the_exact_terminal_team(self):
        self.team_fixture()
        self.final_fixture()
        result,data=self.invoke('finalize','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(self.runtime_calls(),[['team','shutdown',INTERNAL]])
        self.assertEqual(json.loads((self.run_dir/'run.json').read_text())['state'],'finalized')
        self.assertEqual((self.run_dir/'final-handoff.md').read_text(),'Synthetic final handoff')
        self.assertEqual(self.calls('kill-window'),[])

    def test_finalize_accepts_exact_shutdown_line_after_runtime_diagnostics(self):
        self.team_fixture()
        self.final_fixture()
        self.env['PCAOM_TEST_SCENARIO']='shutdown-log-prefix'
        result,data=self.invoke('finalize','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(data['evidence']['state'],'finalized')
        self.assertIn('Team shutdown complete: '+INTERNAL,data['evidence']['output'])

    def test_finalize_failed_shutdown_preserves_evidence_and_refuses_retry(self):
        self.team_fixture()
        self.final_fixture()
        self.env['PCAOM_TEST_SCENARIO']='shutdown-error'
        self.assert_failure(self.invoke('finalize','--team','demo'),'finalize','COMMAND_FAILED')
        manifest=json.loads((self.run_dir/'run.json').read_text())
        self.assertEqual(manifest['state'],'shutdown_uncertain')
        self.assertIn('shutdown_diagnostic',manifest)
        proof=(self.run_dir/'final-evidence.json').read_bytes()
        self.env['PCAOM_TEST_SCENARIO']='accepted'
        self.log.write_text('')
        self.assert_failure(self.invoke('finalize','--team','demo'),'finalize')
        self.assertEqual(self.runtime_calls(),[])
        self.assertEqual(proof,(self.run_dir/'final-evidence.json').read_bytes())

    def test_frozen_identity_rejects_replacement_and_symlink(self):
        self.team_fixture()
        self.assertEqual(self.invoke('resume','--team','demo')[0].returncode,0)
        self.log.write_text('')
        self.config['created_at']='2026-09-28T00:00:00Z'
        self.write_team()
        self.assert_failure(self.invoke('abort','--team','demo'),'abort','IDENTITY_INVALID')
        self.config['created_at']='2026-09-27T00:00:00Z'
        self.write_team()
        regular=self.team_dir/'config-real.json'
        (self.team_dir/'config.json').rename(regular)
        (self.team_dir/'config.json').symlink_to(regular)
        self.assert_failure(self.invoke('status','--team','demo'),'status')
        self.assertEqual(self.runtime_calls(),[])

    def test_steer_timeout_is_explicit_degradation_without_success(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='ack-timeout'
        self.assert_failure(self.invoke('steer','--team','demo','--message','fixture','--ack-timeout-ms','1'),'steer')
        self.assertEqual(len(self.calls('paste-buffer')),1)
        self.assertEqual(len(self.calls('delete-buffer')),1)
        self.assertIn('timeout',json.loads((self.run_dir/'run.json').read_text())['degraded_reason'])

    def test_await_preserves_event_and_rejects_malformed_arguments(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='event'
        result,data=self.invoke('await','--team','demo','--timeout-ms','100')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(data['evidence']['event']['event_id'],'e3')
        self.assertEqual(data['evidence']['cursor'],'e3')
        self.log.write_text('')
        for args in [('await','--team','demo','--timeout-ms','60001'),('await','--team','demo'),('steer','--team','demo','--message','x','--message','y'),('steer','--team','demo','--message-id','x'),('abort','--team','demo','--force','yes')]:
            self.assert_failure(self.invoke(*args),'arguments')
        self.assertEqual(self.calls(),[])

    def test_await_rejects_wrong_api_envelope(self):
        self.team_fixture()
        self.env['PCAOM_TEST_SCENARIO']='bad-envelope'
        self.assert_failure(self.invoke('await','--team','demo','--timeout-ms','100'),'await')
        self.assertEqual(self.calls('send-keys'),[])

    def test_finalize_requires_exact_evidence_and_success_prefix(self):
        self.team_fixture()
        self.assert_failure(self.invoke('finalize','--team','demo'),'finalize','ENOENT')
        self.final_fixture()
        proof=json.loads((self.run_dir/'leader-final.json').read_text())
        proof['verification'][0]['exit_code']=1
        (self.run_dir/'leader-final.json').write_text(json.dumps(proof))
        self.assert_failure(self.invoke('finalize','--team','demo'),'finalize')
        self.assertEqual(self.runtime_calls(),[])
        self.final_fixture()
        self.env['PCAOM_TEST_SCENARIO']='bad-prefix'
        self.assert_failure(self.invoke('finalize','--team','demo'),'finalize')
        self.assertEqual(json.loads((self.run_dir/'run.json').read_text())['state'],'shutdown_uncertain')

    def test_abort_uses_exact_team_identity_and_preserves_supervisor_window(self):
        self.team_fixture()
        result,data=self.invoke('abort','--team','demo')
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(self.runtime_calls(),[['team','shutdown',INTERNAL,'--force','--confirm-issues']])
        self.assertEqual(json.loads((self.run_dir/'run.json').read_text())['state'],'aborted')
        self.assertEqual(self.calls('kill-window'),[])

    def test_lifecycle_rejects_journal_redirect_symlink_and_uncertain_state(self):
        self.team_fixture()
        journal=self.team_dir/'.membership-task-transaction.json'
        journal.write_text('{}')
        for cmd in ['status','resume','finalize','abort']:
            self.assert_failure(self.invoke(cmd,'--team','demo'),cmd,'IDENTITY_INVALID')
        journal.unlink()
        self.env['OMX_STATE_ROOT']='/unowned'
        self.assert_failure(self.invoke('abort','--team','demo'),'abort')
        del self.env['OMX_STATE_ROOT']
        run=json.loads((self.run_dir/'run.json').read_text())
        run['state']='go_submitting'
        (self.run_dir/'run.json').write_text(json.dumps(run))
        self.assertEqual(self.invoke('status','--team','demo')[0].returncode,0)
        for cmd in ['resume','finalize','abort']:
            self.assert_failure(self.invoke(cmd,'--team','demo'),cmd)
        self.assertEqual(self.runtime_calls(),[])

    def lifecycle_arguments(self, command):
        return [command,'--team','demo'] + (['--message','fixture'] if command == 'steer' else ['--timeout-ms','1'] if command == 'await' else [])

    def test_missing_run_and_team_sessions_never_spawn(self):
        self.team_fixture()
        file=self.run_dir/'run.json'
        manifest=json.loads(file.read_text())
        del manifest['session']
        file.write_text(json.dumps(manifest))
        del self.config['tmux_session_id']
        self.write_team()
        for command in ['status','await','steer','resume','finalize','abort']:
            with self.subTest(command=command):
                self.assert_failure(self.invoke(*self.lifecycle_arguments(command)),command,'IDENTITY_INVALID')
                self.assertEqual(self.calls(),[])

    def test_malformed_run_identities_never_spawn(self):
        self.team_fixture()
        file=self.run_dir/'run.json'
        original=json.loads(file.read_text())
        variants=[('session',None),('session',''),('session','demo'),('session',1),('window_id',None),('window_id','@x'),('supervisor_window_id','@2'),('leader_pane_id',None),('leader_pane_id','%x'),('supervisor_pane_id','%2'),('pane_ids',[]),('pane_ids',['%2','%2']),('pane_ids',['%bogus']),('team','__proto__'),('team',None),('project_root','relative'),('context_path','relative'),('context_path',str(self.project/'elsewhere.md')),('context_digest',None),('context_digest','bad'),('profile',None),('profile','default'),('handoff_id',None),('handoff_id',''),('go_id',None),('state',None),('state','__proto__'),('server',None),('server',{'socket_path':'relative','pid':'123','start_time':'1700000000'}),('server',{'socket_path':'/tmp/fake-tmux.sock','pid':0,'start_time':'1700000000'}),('server',{'socket_path':'/tmp/fake-tmux.sock','pid':'123','start_time':None})]
        for key,value in variants:
            file.write_text(json.dumps(dict(original,**{key:value})))
            for command in ['status','await','steer','resume','finalize','abort']:
                with self.subTest(field=key,value=value,command=command):
                    self.assert_failure(self.invoke(*self.lifecycle_arguments(command)),command,'IDENTITY_INVALID')
                    self.assertEqual(self.calls(),[])

    def test_incomplete_team_identities_never_spawn(self):
        self.team_fixture()
        original=json.loads(json.dumps(self.config))
        variants=[('tmux_session_id',None),('tmux_session_id',''),('tmux_session_id','demo'),('tmux_session_id',7),('tmux_session',None),('tmux_session_created',None),('leader_pane_id',None),('leader_pane_pid',None),('leader_pane_pid',0),('tmux_pane_owner_id',None),('tmux_pane_owner_id',''),('leader_cwd',None),('name','__proto__'),('created_at',None),('created_at','not-a-date'),('workers',None),('workers',[]),('workers',[dict(original['workers'][0],pid=None)]),('workers',[dict(original['workers'][0],pane_id=None)]),('hud_pane_id','%4')]
        for key,value in variants:
            self.config=dict(original,**{key:value})
            self.write_team()
            for command in ['status','await','steer','resume','finalize','abort']:
                with self.subTest(field=key,value=value,command=command):
                    self.assert_failure(self.invoke(*self.lifecycle_arguments(command)),command,'IDENTITY_INVALID')
                    self.assertEqual(self.calls(),[])

    def test_commands_cannot_use_prototype_names(self):
        for command in ['__proto__','constructor','toString']:
            self.assert_failure(self.invoke(command,'--team','demo'),'arguments')
        self.assertEqual(self.calls(),[])

    def test_preflight_requires_environment(self):
        for key in ['TMUX', 'TMUX_PANE', 'DEEPSEEK_API_KEY', 'CODEX_HOME']:
            old = self.env.pop(key)
            with self.subTest(key=key):
                self.assert_failure(self.start(),'preflight')
                self.assertEqual(self.calls('new-window'), [])
            self.env[key] = old

    def test_preflight_rejects_versions(self):
        for scenario in ['tmux-version', 'codex-version', 'omx-version']:
            self.env['PCAOM_TEST_SCENARIO'] = scenario
            self.assert_failure(self.start(),'preflight')
            self.assertEqual(self.calls('new-window'), [])

    def test_preflight_requires_clean_git_workspace(self):
        tracked = self.project / 'tracked.txt'
        tracked.write_text('baseline')
        subprocess.run(['git', '-C', str(self.project), 'add', 'tracked.txt'], check=True)
        subprocess.run(
            ['git', '-C', str(self.project), '-c', 'user.name=PCAOM Test',
             '-c', 'user.email=pcaom-test@example.invalid', 'commit', '-qm', 'tracked fixture'],
            check=True,
        )
        for path, content in [(tracked, 'changed'), (self.project / 'untracked.txt', 'new')]:
            with self.subTest(path=path.name):
                path.write_text(content)
                data = self.assert_failure(self.start(), 'preflight')
                self.assertIn('clean Git workspace', data['error'])
                self.assertEqual(self.calls('new-window'), [])
                subprocess.run(['git', '-C', str(self.project), 'clean', '-qf'], check=True)
                subprocess.run(['git', '-C', str(self.project), 'restore', 'tracked.txt'], check=True)

    def test_omx_exact_version_with_diagnostics(self):
        for version in ['oh-my-codex 0.21.6\nNode.js v22.22.2', 'oh-my-codex v0.21.6\nNode.js v22.22.2']:
            self.env['PCAOM_TEST_VERSION'] = version
            self.profile.chmod(0)
            result, data = self.start()
            self.assert_failure((result,data),'preflight')
            self.assertIn('readable', data['error'])
        for version in ['oh-my-codex v0.21.7', 'oh-my-codex v0.21.6-beta', 'oh-my-codex vv0.21.6', 'junk\noh-my-codex v0.21.6', 'oh-my-codex v0.21.6\noh-my-codex v0.22.0']:
            self.env['PCAOM_TEST_VERSION'] = version
            data=self.assert_failure(self.start(),'preflight')
            self.assertIn('version',data['error'],data)

    def test_start_ignores_teams_outside_exclusive_root(self):
        state = self.project/'.omx/state/team/demo'
        state.mkdir(parents=True)
        self.assertEqual(self.start()[0].returncode,0)
        self.assertEqual(len(self.calls('new-window')),1)
        self.assertEqual([c for c in self.calls() if c['program'] == 'omx' and c['args'] != ['--version']], [])

    def test_dead_or_fatal_leader_never_receives_handoff(self):
        for scenario in ['dead', 'fatal']:
            with self.subTest(scenario=scenario):
                self.env['PCAOM_TEST_SCENARIO'] = scenario
                self.assert_failure(self.start(),'readiness')
                self.assertEqual(self.calls('set-buffer'), [])
                self.assertEqual(self.start_stage(), 'readiness')
                if (self.project/'.omx').exists(): shutil.rmtree(self.project/'.omx')
                (self.root/'created').unlink(missing_ok=True)

    def test_update_modal_blocks_handoff_and_persists_redacted_capture(self):
        self.env['PCAOM_TEST_SCENARIO'] = 'update-modal'
        result, data = self.start()
        self.assert_failure((result, data), 'readiness', 'LEADER_TUI_BLOCKED')
        self.assertEqual(self.calls('set-buffer'), [])
        self.assertEqual(self.calls('send-keys'), [])
        self.assertEqual([call['args'] for call in self.calls('kill-window')],
                         [['kill-window', '-t', '@2']])
        manifest = json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
        self.assertEqual(manifest['leader_diagnostic_path'],
                         '.omx/pcaom-supervisor/demo/leader-pane-diagnostic.txt')
        evidence = self.project / manifest['leader_diagnostic_path']
        self.assertEqual(evidence.stat().st_mode & 0o777, 0o600)
        self.assertIn('Update available', evidence.read_text())
        self.assertIn('[REDACTED]', evidence.read_text())
        self.assertNotIn(self.env['DEEPSEEK_API_KEY'], evidence.read_text())

    def test_handoff_waits_for_interactive_composer(self):
        self.env['PCAOM_TEST_SCENARIO'] = 'composer-delayed'
        result, data = self.start()
        self.assertEqual(result.returncode, 0, data)
        calls = self.calls()
        first_buffer = next(index for index, call in enumerate(calls)
                            if call['args'][0] == 'set-buffer')
        captures_before_handoff = [call for call in calls[:first_buffer]
                                   if call['args'][0] == 'capture-pane']
        self.assertGreaterEqual(len(captures_before_handoff), 3)

    def test_ack_receives_independent_timeout_budget(self):
        self.env['PCAOM_TEST_SCENARIO'] = 'ack-after-readiness-budget'
        result, data = self.start()
        self.assertEqual(result.returncode, 0, data)
        self.assertGreaterEqual(len(self.calls('capture-pane')), 5)

    def start_stage(self):
        return json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())['failure_stage']

    def test_preflight_rejects_missing_files_and_unapproved_spec(self):
        for path in [self.profile, self.catalog, self.skill, self.spec]:
            original = path.read_text()
            path.unlink()
            self.assert_failure(self.start(),'preflight','ENOENT')
            path.write_text(original)
        for text in [SPEC.replace('PCAOM_APPROVED: yes', 'PCAOM_APPROVED: no'), SPEC.replace('DeepSeek authorized','no'), SPEC.replace('python3 -m unittest','')]:
            self.spec.write_text(text)
            self.assert_failure(self.start(),'preflight')
        self.assertEqual(self.calls('new-window'), [])

    def test_spec_symlink_outside_and_non_git_rejected(self):
        self.spec.unlink()
        outside = self.root/'outside.md'
        outside.write_text(SPEC)
        self.spec.symlink_to(outside)
        self.assert_failure(self.start(),'preflight')
        self.spec.unlink()
        self.spec.write_text(SPEC)
        if (self.project/'.git').exists(): shutil.rmtree(self.project/'.git')
        self.assert_failure(self.start(),'preflight','COMMAND_FAILED')
        self.assertEqual(self.calls('new-window'), [])

    def test_comment_only_verification_is_not_executable(self):
        self.spec.write_text(SPEC.replace('python3 -m unittest', '# run tests later'))
        self.assert_failure(self.start(),'preflight')
        self.assertEqual(self.calls('new-window'), [])

    def test_unreadable_profile_and_existing_window_fail_preflight(self):
        self.profile.chmod(0)
        self.assert_failure(self.start(),'preflight')
        self.profile.chmod(0o600)
        (self.root/'created').touch()
        self.assert_failure(self.start(),'preflight')
        self.assertEqual(self.calls('new-window'), [])

    def test_manifest_symlink_directory_is_rejected_for_inspect(self):
        self.assertEqual(self.start()[0].returncode, 0)
        directory = self.project/'.omx/pcaom-supervisor/demo'
        moved = directory.with_name('moved')
        directory.rename(moved)
        directory.symlink_to(moved, target_is_directory=True)
        self.assert_failure(self.invoke('inspect','--team','demo','--pane','leader'),'inspect')

    def test_start_manifest_context_profile_and_ordered_handoff(self):
        result, data = self.start()
        self.assertEqual(result.returncode, 0, data)
        create, = self.calls('new-window')
        self.assertIn('ds41-team-demo', create['args'])
        self.assertFalse(any(arg.startswith('PCAOM_CODEX_TRUST_OVERRIDE=') for arg in create['args']))
        self.assertEqual(create['args'][-1], 'codex --profile pcaom-ds41')
        self.assertEqual(create['selected_env'], {'OMX_TEAM_WORKER_CLI':'codex','OMX_TEAM_WORKER_LAUNCH_ARGS':'--profile pcaom-ds41 --model deepseek-flash -c model_reasoning_effort="high"'})
        before = self.calls()[:self.calls().index(create)]
        for call in before:
            self.assertIn((call['program'], call['args'][0]), [('git','rev-parse'), ('git','status'), ('codex','--version'), ('omx','--version'), ('tmux','-V'), ('tmux','display-message'), ('tmux','list-panes'), ('tmux','show-environment'), ('tmux','show-options'), ('tmux','set-option'), ('tmux','-C')])
        for call in self.calls('list-panes'):
            self.assertEqual(call['args'][1:4],['-s','-t','$1'])
            self.assertNotIn('-a',call['args'])
        calls = [c['args'] for c in self.calls()]
        set_args, go_args = [a for a in calls if a[0] == 'set-buffer']
        self.assertEqual(set_args[:2], ['set-buffer','-b'])
        self.assertEqual(set_args[3], '--')
        self.assertIn('END TURN', set_args[-1])
        self.assertIn('Do not start Ultragoal, Team, workers, or implementation', set_args[-1])
        self.assertIn('GO JSON:', go_args[-1])
        self.assertIn('omx team 2:executor', go_args[-1])
        self.assertIn('export OMX_TEAM_WORKER_LAUNCH_ARGS=', go_args[-1])
        self.assertIn('approved OMX Team DAG', go_args[-1])
        self.assertIn('use that hint verbatim even when it is role-agnostic', go_args[-1])
        self.assertIn('one approved lane to each Worker', go_args[-1])
        self.assertIn('must not spawn Codex native subagents', go_args[-1])
        self.assertNotEqual(set_args[2],go_args[2])
        self.assertNotIn('PCAOM_READY', set_args[-1])
        sequence = [set_args, ['show-buffer','-b',set_args[2]], ['send-keys','-t','%2','C-u'], ['paste-buffer','-t','%2','-b',set_args[2],'-p','-d'], ['send-keys','-t','%2','Enter']]
        indexes = [calls.index(a) for a in sequence]
        self.assertEqual(indexes, sorted(indexes))
        self.assertEqual([c['args'] for c in self.calls('delete-buffer')],[['delete-buffer','-b',set_args[2]],['delete-buffer','-b',go_args[2]]])
        self.assertFalse((self.root/'buffer').exists())
        manifest_path = self.project/'.omx/pcaom-supervisor/demo/run.json'
        manifest = json.loads(manifest_path.read_text())
        for key, value in {'schema_version':1,'team':'demo','session':'$1','window_id':'@2','leader_pane_id':'%2','supervisor_pane_id':'%1','profile':'pcaom-ds41','state':'go_submitted'}.items():
            self.assertEqual(manifest[key],value)
        context = Path(manifest['context_path'])
        self.assertEqual(manifest['context_digest'], hashlib.sha256(context.read_bytes()).hexdigest())
        for text in [str(self.spec), hashlib.sha256(self.spec.read_bytes()).hexdigest(), 'Constraints','Touchpoints','Unknowns','Verification','DeepSeek authorized']:
            self.assertIn(text,context.read_text())
        for path in [manifest_path,context]:
            self.assertEqual(path.stat().st_mode & 0o777,0o600)
            self.assertNotIn(self.env['DEEPSEEK_API_KEY'],path.read_text())
        self.assert_failure(self.start(),'preflight')
        self.assertEqual(len(self.calls('new-window')),1)

    def test_restoration_attach_failure_removes_imported_environment(self):
        self.env['PCAOM_TEST_SCENARIO']='restore-fails'
        result,data=self.start()
        self.assertNotEqual(result.returncode,0,data)
        self.assertEqual(data.get('stage'),'launch',data)
        self.assertEqual(data.get('code'),'ENVIRONMENT_RESTORE_FAILED',data)
        restored=json.loads((self.root/'session-env.json').read_text())
        self.assertEqual(restored,{},data)
        self.assertIn(['set-option','-u','-t','$1','update-environment'],[c['args'] for c in self.calls('set-option')])

    def test_ack_then_go_transport_only_and_workers_allowed_after_go(self):
        self.env['PCAOM_TEST_SCENARIO']='workers-after-go'
        result,data=self.start()
        self.assertEqual(result.returncode,0,data)
        enter=self.calls('send-keys')
        self.assertEqual([c['manifest_state'] for c in enter],['awaiting_ack','awaiting_ack','go_submitting','go_submitting'])
        manifest=json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
        self.assertEqual(manifest['state'],'go_submitted')
        self.assertEqual(manifest['pane_ids'],['%2'])
        self.assertFalse(manifest['team_started_verified'])
        ack=json.loads((self.project/'.omx/pcaom-supervisor/demo/leader-accepted.json').read_text())
        self.assertEqual(ack['phase'],'accepted-awaiting-go')
        self.assertEqual(ack['context_digest'],manifest['context_digest'])

    def test_early_workers_prevent_go(self):
        self.env['PCAOM_TEST_SCENARIO']='early-workers'
        result,data=self.start()
        self.assertNotEqual(result.returncode,0,data)
        self.assertEqual(data.get('stage'),'acceptance',data)
        self.assertEqual(data.get('code'),'BRIDGE_ERROR',data)
        self.assertFalse((self.root/'go').exists())
        self.assertEqual(self.calls('kill-window'),[])

    def test_go_delivery_failure_never_kills_or_replays(self):
        for scenario in ['go-paste','go-enter']:
            self.env['PCAOM_TEST_SCENARIO']=scenario
            result,data=self.start()
            self.assertNotEqual(result.returncode,0,data)
            self.assertEqual(data.get('stage'),'go',data)
            self.assertEqual(data.get('code'),'COMMAND_FAILED',data)
            self.assertEqual(self.calls('kill-window'),[])
            self.assertEqual(len(self.calls('set-buffer')),2)
            manifest=json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
            self.assertEqual(manifest['state'],'go_submitting')
            self.assertEqual(manifest['delivery'],'uncertain')
            if (self.project/'.omx').exists(): shutil.rmtree(self.project/'.omx')
            for file in ['calls.jsonl','created','entered','go','attaches','session-env.json']:
                (self.root/file).unlink(missing_ok=True)

    def test_launch_environment_and_server_generation(self):
        result, data = self.start()
        self.assertEqual(result.returncode, 0, data)
        leader = json.loads((self.root/'leader-env.json').read_text())
        for key in ['DEEPSEEK_API_KEY','CODEX_HOME','PATH']:
            self.assertEqual(leader[key],self.env[key])
        manifest = json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
        self.assertEqual(manifest['server'], {'socket_path':'/tmp/fake-tmux.sock','pid':'123','start_time':'1700000000'})
        self.env['PCAOM_TEST_SCENARIO']='restarted'
        count=len(self.calls('capture-pane'))
        result,data=self.invoke('inspect','--team','demo','--pane','leader')
        self.assert_failure((result,data),'inspect')
        self.assertIn('generation',data['error'])
        self.assertEqual(len(self.calls('capture-pane')),count)

    def test_import_must_be_verified_before_window_creation(self):
        self.env['PCAOM_TEST_SCENARIO']='import-fails'
        result,data=self.start()
        self.assert_failure((result,data),'launch')
        self.assertEqual(self.calls('new-window'),[])

    def test_failed_allowlist_never_attaches_with_unrestricted_environment(self):
        self.env['PCAOM_TEST_SCENARIO']='option-fails'
        result,data=self.start()
        self.assert_failure((result,data),'launch','COMMAND_FAILED')
        self.assertEqual(self.calls('-C'),[])
        self.assertEqual(self.calls('new-window'),[])

    def test_prompt_echo_cannot_acknowledge(self):
        self.env['PCAOM_TEST_SCENARIO']='echo'
        result,data=self.start()
        self.assert_failure((result,data),'acceptance','STARTUP_TIMEOUT')
        self.assertEqual(len(self.calls('set-buffer')),1,data)
        self.assertFalse((self.project/'.omx/pcaom-supervisor/demo/leader-accepted.json').exists())

    def test_wrong_ack_rejected(self):
        self.env['PCAOM_TEST_SCENARIO']='bad-ack'
        result,data=self.start()
        self.assert_failure((result,data),'acceptance')
        self.assertEqual(len(self.calls('set-buffer')),1,data)

    def test_symlink_ack_rejected(self):
        self.env['PCAOM_TEST_SCENARIO']='symlink-ack'
        result,data=self.start()
        self.assert_failure((result,data),'acceptance')
        self.assertIn('symlinks',data['error'])

    def test_stale_ack_never_sends_go(self):
        self.env['PCAOM_TEST_SCENARIO']='stale-ack'
        data=self.assert_failure(self.start(),'acceptance')
        self.assertEqual(len(self.calls('set-buffer')),1,data)
        self.assertFalse((self.root/'go').exists(),data)

    def test_previous_session_environment_and_local_option_restored(self):
        self.env['PCAOM_TEST_SCENARIO']='previous-env'
        result,data=self.start()
        self.assertEqual(result.returncode,0,data)
        self.assertEqual(json.loads((self.root/'session-env.json').read_text()), {'DEEPSEEK_API_KEY':'previous-secret-sentinel','CODEX_HOME':'/previous/home','PATH':'/usr/bin:/bin'})
        self.assertEqual(self.calls('set-option')[-1]['args'],['set-option','-t','$1','update-environment[2]','CUSTOM_VAR'])

    def test_named_buffer_cleanup_on_failure(self):
        for scenario in ['buffer','paste','submit','identity-after-buffer']:
            with self.subTest(scenario=scenario):
                self.env['PCAOM_TEST_SCENARIO']=scenario
                result,data=self.start()
                self.assert_failure((result,data),'handoff','COMMAND_FAILED' if scenario in ['paste','submit'] else 'BRIDGE_ERROR')
                self.assertEqual(len(self.calls('delete-buffer')),1)
                self.assertFalse((self.root/'buffer').exists())
                if (self.project/'.omx').exists(): shutil.rmtree(self.project/'.omx')
                for filename in ['created','entered','calls.jsonl']:
                    (self.root/filename).unlink(missing_ok=True)

    def test_delayed_version_reports_preflight_timeout(self):
        self.env['PCAOM_TEST_SCENARIO']='delayed-version'
        result,data=self.start()
        self.assert_failure((result,data),'preflight','COMMAND_TIMEOUT')
        self.assertEqual(data['command_evidence']['timeout_ms'],100,data)
        self.assertEqual(data['command_evidence']['code'],'ETIMEDOUT',data)
        self.assertIn('ETIMEDOUT',data['error'])
        self.assertEqual(self.calls('new-window'),[])

    def test_restarted_server_never_captured_or_killed_on_start_failure(self):
        self.env['PCAOM_TEST_SCENARIO']='restart-start'
        result,data=self.start()
        self.assert_failure((result,data),'launch','ENVIRONMENT_RESTORE_FAILED')
        self.assertIn('generation',data['error'])
        self.assertEqual(self.calls('capture-pane'),[])
        self.assertEqual(self.calls('kill-window'),[])

    def test_cleanup_failure_is_reported(self):
        self.env['PCAOM_TEST_SCENARIO']='cleanup'
        result,data=self.start()
        self.assert_failure((result,data),'go')
        self.assertIn('Named buffer cleanup failed',data['error'])
        self.assertEqual(self.calls('kill-window'),[],data)
        self.assertEqual(json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())['state'],'go_submitted',data)

    def test_cleanup_failure_preserves_primary_failure(self):
        self.env['PCAOM_TEST_SCENARIO']='buffer-cleanup'
        result,data=self.start()
        self.assert_failure((result,data),'handoff')
        self.assertIn('read-back mismatch',data['error'])
        self.assertIn('Named buffer cleanup failed',data['error'])

    def test_profile_rejects_endpoint_sections_duplicates_and_provider(self):
        original=self.profile.read_text()
        forced_login=original.replace('[model_providers.deepseek]','forced_login_method = "api"\n\n[model_providers.deepseek]')
        for altered in [original.replace('https://api.deepseek.com/','https://unauthorized.example/'), original+'\nmodel = "deepseek-flash"\n', original.replace('[model_providers.deepseek]','[model_providers.other]'), original.replace('model_provider = "deepseek"','model_provider = "other"'), original+'\n[model_providers.other]\nname = "Other"\n', forced_login, original.replace('approval_policy = "never"','approval_policy = "on-request"'), original.replace('sandbox_mode = "danger-full-access"','sandbox_mode = "workspace-write"')]:
            self.profile.write_text(altered)
            result,data=self.start()
            self.assert_failure((result,data),'preflight')
            self.assertEqual(self.calls('new-window'),[])

    def test_profile_accepts_preseeded_codex_tui_state(self):
        profile = self.profile.read_text()
        if '[tui]' not in profile:
            profile += '\n[tui]\nscreen_reader_detection_done = true\n'
        self.profile.write_text(profile)
        result, data = self.start()
        self.assertEqual(result.returncode, 0, data)

    def test_timeout_rolls_back_only_proven_window(self):
        self.env['PCAOM_TEST_SCENARIO']='timeout'
        self.assert_failure(self.start(),'readiness','STARTUP_TIMEOUT')
        self.assertEqual([c['args'] for c in self.calls('kill-window')],[['kill-window','-t','@2']])
        manifest=json.loads((self.project/'.omx/pcaom-supervisor/demo/run.json').read_text())
        self.assertEqual(manifest['state'],'failed')

    def test_changed_identity_does_not_kill(self):
        self.env['PCAOM_TEST_SCENARIO']='changed'
        self.assert_failure(self.start(),'readiness')
        self.assertEqual(self.calls('kill-window'),[])

    def test_bad_buffer_never_submits(self):
        self.env['PCAOM_TEST_SCENARIO']='buffer'
        self.assert_failure(self.start(),'handoff')
        self.assertEqual(self.calls('paste-buffer'),[])
        self.assertEqual(self.calls('send-keys'),[])

    def test_failed_acceptance_rolls_back(self):
        self.env['PCAOM_TEST_SCENARIO']='acceptance'
        self.assert_failure(self.start(),'acceptance','STARTUP_TIMEOUT')
        self.assertEqual([c['args'] for c in self.calls('kill-window')],[['kill-window','-t','@2']])

    def test_inspect_requires_manifest_and_fresh_identity(self):
        self.assertEqual(self.start()[0].returncode,0)
        for pane in ['leader','%2']:
            result,data=self.invoke('inspect','--team','demo','--pane',pane,'--lines','40')
            self.assertEqual(result.returncode,0,data)
            self.assertIn('[REDACTED]',result.stdout)
        for args in [('demo','%1'),('demo','current'),('unknown','leader')]:
            self.assert_failure(self.invoke('inspect','--team',args[0],'--pane',args[1]),'arguments' if args[1]=='current' else 'inspect','ENOENT' if args[0]=='unknown' else 'BRIDGE_ERROR')
        self.env['PCAOM_TEST_SCENARIO']='changed'
        self.assert_failure(self.invoke('inspect','--team','demo','--pane','leader'),'inspect')

    def test_malformed_arguments_are_one_json_error(self):
        for args in [[],['unknown'],['start'],['inspect','--team','x'],['start','--spec','x','--workers','0'],['start','--spec','x','--workers','2','--workers','3'],['inspect','--team','../x','--pane','leader'],['inspect','--team','x','--pane','leader','--unknown','x']]:
            self.assert_failure(self.invoke(*args),'arguments')


if __name__ == '__main__':
    unittest.main()
