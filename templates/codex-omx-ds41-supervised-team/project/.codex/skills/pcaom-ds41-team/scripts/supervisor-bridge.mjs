#!/usr/bin/env node
// Experimental one-shot bridge; fake CLI tests are not runtime capability evidence.
// Pane identity/liveness precedes handoff; the Leader writes a scoped file ACK.
// No unrelated active-Team discovery is asserted. Pinned OMX status invokes
// activity recording/monitoring, and read-config may migrate state; neither is
// a read-only preflight. Only filesystem collision evidence is consulted here.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const secret = process.env.DEEPSEEK_API_KEY;
const secrets = new Set(secret ? [secret] : []);
const redact = value => [...secrets].reduce((text,key) => text.split(key).join('[REDACTED]'),String(value));
const digest = value => createHash('sha256').update(value).digest('hex');
const safeTeam = value => /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
let deadline;
let commandTimeout = 5000;
let stage = 'arguments';
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function run(program, args, options = {}) {
  const {privateOutput = false, ...spawnOptions} = options;
  const timeout = deadline ? Math.max(1, Math.min(commandTimeout, deadline - Date.now())) : commandTimeout;
  // Resolve against the trusted caller PATH even while a restoration client
  // intentionally omits PATH or imports the previous session's different PATH.
  const executable = (process.env.PATH ?? '').split(path.delimiter).map(dir => path.join(dir,program)).find(candidate => {
    try { fs.accessSync(candidate,fs.constants.X_OK); return fs.statSync(candidate).isFile(); } catch { return false; }
  }) ?? program;
  const result = spawnSync(executable, args, { encoding: 'utf8', timeout, maxBuffer: 65536, ...spawnOptions });
  const stdout = redact(result.stdout ?? '');
  const stderr = redact(result.stderr ?? '');
  if (result.status !== 0 || result.error) {
    const error = new Error(`${program} failed: ${redact(result.error?.message ?? '')} ${privateOutput ? '[private output omitted]' : stderr.slice(-2000)+' '+stdout.slice(-2000)}`);
    error.code = result.error?.code === 'ETIMEDOUT' ? 'COMMAND_TIMEOUT' : 'COMMAND_FAILED';
    error.command_evidence = {program,code:result.error?.code ?? null,signal:result.signal ?? null,timeout_ms:timeout,status:result.status,spawn_error:redact(result.error?.message ?? '')};
    throw error;
  }
  return privateOutput ? result.stdout ?? '' : stdout;
}
function emit(ok, command, evidence) {
  const output = redact(JSON.stringify(ok ? {ok, command, evidence} : {ok, ...evidence}));
  (ok ? process.stdout : process.stderr).write(output + '\n');
  if (!ok) process.exitCode = 1;
}
function parseArgs() {
  const [command, ...args] = process.argv.slice(2);
  const allowed = {start: ['spec', 'workers', 'team', 'startup-timeout-ms','command-timeout-ms'], inspect: ['team', 'pane', 'lines','command-timeout-ms'], status:['team'], await:['team','timeout-ms','after-event-id'], steer:['team','message','ack-timeout-ms'], resume:['team'], finalize:['team'], abort:['team']}[command];
  requireThat(allowed, 'Unknown bridge command');
  const options = {};
  for (let i = 0; i < args.length; i += 2) {
    const key = args[i].slice(2), value = args[i + 1];
    requireThat(args[i].startsWith('--') && allowed.includes(key) && !(key in options) && value && !value.startsWith('--'), 'Malformed, unknown, or repeated argument');
    requireThat(!secret || !value.includes(secret), 'Arguments must not contain credentials');
    options[key] = value;
  }
  const integer = (key, fallback, max) => {
    const value = options[key] ?? String(fallback);
    requireThat(/^[1-9][0-9]*$/.test(value) && Number(value) <= max, `Invalid ${key}`);
    options[key] = Number(value);
  };
  if (command === 'start') {
    requireThat(options.spec && options.workers, 'start requires --spec and --workers');
    integer('workers', 1, 32); integer('startup-timeout-ms', 30000, 60000);
  } else if (command === 'inspect') {
    requireThat(options.team && /^(leader|%[0-9]+)$/.test(options.pane ?? ''), 'inspect requires exact --team and --pane');
    integer('lines', 100, 1000);
  } else {
    requireThat(options.team, 'Exact --team required');
    if (command === 'await') {
      requireThat(options['timeout-ms'], '--timeout-ms required');
      integer('timeout-ms',30000,60000);
      if (options['after-event-id']) requireThat(/^[A-Za-z0-9_-]{1,200}$/.test(options['after-event-id']), 'Invalid event cursor');
    }
    if (command === 'steer') {
      requireThat(options.message?.trim() && options.message.length <= 16000, 'Bounded --message required');
      integer('ack-timeout-ms',5000,30000);
    }
  }
  if (options.team) requireThat(safeTeam(options.team), 'Unsafe team name');
  integer('command-timeout-ms',5000,60000);
  commandTimeout = options['command-timeout-ms'];
  return {command, options};
}
function inside(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative === '' || (!relative.startsWith('..' + path.sep) && relative !== '..' && !path.isAbsolute(relative));
}
function readRegular(file) {
  const stat = fs.lstatSync(file);
  requireThat(stat.isFile() && !stat.isSymbolicLink() && (stat.mode & 0o444), 'Expected readable regular non-symlink file');
  return fs.readFileSync(file, 'utf8');
}
function rootDirectory() {
  const root = fs.realpathSync(run('git', ['rev-parse', '--show-toplevel']).trim());
  requireThat(inside(root, fs.realpathSync(process.cwd())), 'Working directory outside project');
  return root;
}
function panes(session) {
  return run('tmux', ['list-panes', ...(session ? ['-s','-t',session] : ['-a']), '-F', '#{session_id}\t#{window_id}\t#{pane_id}\t#{window_name}\t#{pane_dead}\t#{pane_current_command}\t#{socket_path}\t#{pid}\t#{start_time}']).trim().split('\n').map(line => {
    const [session, window_id, pane_id, name, dead, command, socket_path, pid, start_time, extra] = line.split('\t');
    requireThat(/^\$[0-9]+$/.test(session) && /^@[0-9]+$/.test(window_id) && /^%[0-9]+$/.test(pane_id) && name && /^(0|1)$/.test(dead) && command && path.isAbsolute(socket_path ?? '') && /^[1-9][0-9]*$/.test(pid) && /^[1-9][0-9]*$/.test(start_time) && extra === undefined, 'Malformed tmux identity');
    return {session, window_id, pane_id, name, dead, command, server:{socket_path,pid,start_time}};
  });
}
function assertExactIdentity(manifest) {
  const current = panes(manifest.session);
  requireThat(manifest.server && current.every(p => JSON.stringify(p.server) === JSON.stringify(manifest.server)), 'Tmux server generation changed');
  const owned = current.filter(p => p.session === manifest.session && p.window_id === manifest.window_id);
  requireThat(manifest.window_id !== manifest.supervisor_window_id && owned.some(p => p.pane_id === manifest.leader_pane_id), 'Run identity changed');
  requireThat(current.some(p => p.session === manifest.session && p.window_id === manifest.supervisor_window_id && p.pane_id === manifest.supervisor_pane_id), 'Supervisor identity changed');
  requireThat(JSON.stringify(owned.map(p => p.pane_id).sort()) === JSON.stringify([...manifest.pane_ids].sort()), 'Run pane set changed');
  return owned;
}
function secureDirectory(root, target) {
  requireThat(inside(root, target), 'Directory outside project');
  let current = root;
  for (const part of path.relative(root, target).split(path.sep)) {
    current = path.join(current, part);
    if (!fs.existsSync(current)) fs.mkdirSync(current, {mode: 0o700});
    requireThat(fs.lstatSync(current).isDirectory() && !fs.lstatSync(current).isSymbolicLink(), 'Unsafe state directory');
  }
}
function atomicWrite(file, text, replace = false) {
  const temporary = `${file}.${randomUUID()}.tmp`;
  fs.writeFileSync(temporary, text, {flag: 'wx', mode: 0o600});
  try {
    if (replace) fs.renameSync(temporary, file);
    else fs.linkSync(temporary, file); // Exclusive publication: unmanaged files never overwritten.
  } finally { if (fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}
function validateProfile(home) {
  const text = readRegular(path.join(home,'pcaom-ds41.config.toml'));
  requireThat(!text.includes(secret), 'Profile contains credential');
  const expected = {
    '': {model:'deepseek-flash', model_provider:'deepseek', model_reasoning_effort:'high', forced_login_method:'api', web_search:'disabled', model_catalog_json:path.join(home,'model-catalogs/pcaom-deepseek-models.json')},
    'model_providers.deepseek': {name:'DeepSeek', base_url:'https://api.deepseek.com/', wire_api:'responses', env_key:'DEEPSEEK_API_KEY', env_key_instructions:'Set DEEPSEEK_API_KEY in the trusted launcher environment.'},
  };
  let section = '';
  const seen = new Set();
  let providerSeen = false;
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[')) {
      requireThat(trimmed === '[model_providers.deepseek]' && !providerSeen, 'Unknown or duplicate profile section');
      section = 'model_providers.deepseek'; providerSeen = true; continue;
    }
    const entry = /^([a-z_]+)\s*=\s*("(?:[^"\\]|\\.)*")$/.exec(trimmed);
    requireThat(entry, 'Unsupported profile syntax');
    const [,key,encoded] = entry;
    const identity = section+'.'+key;
    requireThat(!seen.has(identity) && Object.hasOwn(expected[section],key), 'Duplicate or misplaced profile key');
    requireThat(JSON.parse(encoded) === expected[section][key], `Invalid profile ${key}`);
    seen.add(identity);
  }
  requireThat(seen.size === 11 && providerSeen, 'Incomplete profile');
  const catalogPath = expected[''].model_catalog_json;
  requireThat(path.isAbsolute(catalogPath), 'Catalog path must be absolute');
  const catalog = JSON.parse(readRegular(catalogPath));
  requireThat(Array.isArray(catalog.models) && catalog.models.length === 1 && catalog.models[0].slug === 'deepseek-flash', 'Invalid deepseek-flash catalog');
}
function preflight(root, options) {
  for (const key of ['TMUX', 'TMUX_PANE', 'CODEX_HOME', 'DEEPSEEK_API_KEY']) requireThat(process.env[key]?.trim(), `Missing ${key}`);
  requireThat(/^%[0-9]+$/.test(process.env.TMUX_PANE), 'Invalid supervisor pane');
  for (const [program, args, expected] of [['codex',['--version'],'codex-cli 0.156.1'], ['omx',['--version'],'oh-my-codex 0.21.6'], ['tmux',['-V'],'tmux 3.7b']]) {
    const output = run(program,args).trim();
    const lines = output.split(/\r?\n/);
    const matches = program === 'omx'
      ? /^oh-my-codex v?0\.21\.6$/.test(lines[0]) && !lines.slice(1).some(line => line.includes('oh-my-codex'))
      : output === expected;
    requireThat(matches, `Exact ${program} version required: ${expected}`);
  }
  validateProfile(process.env.CODEX_HOME);
  readRegular(path.join(root, '.codex/skills/pcaom-ds41-team/SKILL.md'));
  const specPath = path.resolve(options.spec);
  const spec = readRegular(specPath);
  requireThat(inside(root, fs.realpathSync(specPath)), 'Spec outside project');
  requireThat(/^<!-- PCAOM_APPROVED: yes -->$/m.test(spec), 'Spec approval marker required');
  requireThat(/^<!-- PCAOM_CONTEXT_TRANSFER: DeepSeek authorized -->$/m.test(spec), 'Explicit context-transfer authorization required');
  const verification = spec.match(/^## Verification\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m)?.[1];
  const commands = verification?.match(/^```(?:sh|bash)\r?\n([\s\S]*?)^```\s*$/m)?.[1];
  requireThat(commands?.split(/\r?\n/).some(line => line.trim() && !line.trim().startsWith('#')), 'Executable verification command required');
  requireThat(!spec.includes(secret), 'Spec contains credential');
  return {specPath, spec};
}
function assertNoTeamCollision(root, team) {
  // Pinned state-root.js resolves these overrides before <cwd>/.omx/state.
  // Alternate roots require separately proven scope; never infer it here.
  for (const key of ['OMX_TEAM_STATE_ROOT','OMX_ROOT','OMX_STATE_ROOT','OMX_TEAM_WORKER','OMX_TEAM_INTERNAL_WORKER']) {
    requireThat(!process.env[key]?.trim(), `Ambiguous Team context: ${key}`);
  }
  const target = path.join(root,'.omx/state/team',team);
  let current = root;
  for (const part of ['.omx','state','team',team]) {
    current = path.join(current,part);
    let stat;
    try { stat = fs.lstatSync(current); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
    requireThat(stat.isDirectory() && !stat.isSymbolicLink(), 'Ambiguous Team state path');
    requireThat(current !== target, 'Exact Team state collision');
  }
}
function capture(pane, lines = 100) { return run('tmux', ['capture-pane','-p','-t',pane,'-S',`-${lines}`]); }
function assertSupervisor(manifest) {
  const current = panes(manifest.session);
  requireThat(current.every(p => JSON.stringify(p.server) === JSON.stringify(manifest.server)), 'Tmux server generation changed');
  requireThat(current.some(p => p.session === manifest.session && p.window_id === manifest.supervisor_window_id && p.pane_id === manifest.supervisor_pane_id), 'Supervisor identity changed');
}
function withLaunchEnvironment(manifest, create) {
  // tmux clients do not pass their process env to new-window. A short-lived
  // control client imports only this allowlist; no secret enters argv/files.
  const names = ['DEEPSEEK_API_KEY','CODEX_HOME','PATH'];
  function readEnvironment() {
    const values = new Map();
    const snapshot = run('tmux',['show-environment','-t',manifest.session],{privateOutput:true});
    for (const line of snapshot.split('\n').filter(Boolean)) {
      const entry = /^(-?)([A-Za-z_][A-Za-z0-9_]*)(?:=(.*))?$/.exec(line);
      requireThat(entry, 'Unsupported session environment snapshot');
      if (names.includes(entry[2])) {
        requireThat(!values.has(entry[2]), 'Ambiguous session environment snapshot');
        values.set(entry[2],entry[1] === '-' ? {removed:true} : {value:entry[3] ?? ''});
      }
    }
    return values;
  }
  const previous = readEnvironment();
  const oldSecret = previous.get('DEEPSEEK_API_KEY')?.value;
  if (oldSecret) secrets.add(oldSecret);
  const option = run('tmux',['show-options','-t',manifest.session,'update-environment']);
  const entries = option.split('\n').filter(Boolean).map(line => {
    const match = /^update-environment\[([0-9]+)\] ([A-Za-z_][A-Za-z0-9_*]*)$/.exec(line);
    requireThat(match, 'Unsupported update-environment option');
    return match;
  });
  let primary;
  let result;
  try {
    assertSupervisor(manifest);
    run('tmux',['set-option','-t',manifest.session,'update-environment',names.join(' ')]);
    run('tmux',['-C','attach-session','-t',manifest.session],{input:'detach-client\n',env:process.env});
    assertSupervisor(manifest);
    const imported = readEnvironment();
    requireThat(names.every(name => imported.get(name)?.value === process.env[name]), 'Launch environment import not verified');
    result = create();
  } catch (error) { primary = error; }
  finally {
    const diagnostics = [];
    const attempt = (step,action) => {
      try { assertSupervisor(manifest); action(); return true; }
      catch (error) { diagnostics.push({step,error:redact(error.message)}); return false; }
    };
    const restoredEnv = {...process.env};
    for (const name of names) {
      delete restoredEnv[name];
      if (previous.get(name)?.value !== undefined) restoredEnv[name] = previous.get(name).value;
    }
    let restored = false;
    for (let number = 1; number <= 2 && !restored; number++) {
      restored = attempt(`secure-restore-${number}`,() => {
        run('tmux',['set-option','-t',manifest.session,'update-environment',names.join(' ')]);
        run('tmux',['-C','attach-session','-t',manifest.session],{input:'detach-client\n',env:restoredEnv});
        for (const name of names) {
          if (!previous.has(name)) run('tmux',['set-environment','-u','-t',manifest.session,name]);
          else if (previous.get(name).removed) run('tmux',['set-environment','-r','-t',manifest.session,name]);
        }
        const actual = readEnvironment();
        requireThat(names.every(name => JSON.stringify(actual.get(name)) === JSON.stringify(previous.get(name))), 'Session environment restoration not verified');
      });
    }
    // Independent fallback: failure to restore a previous value must never
    // leave the newly imported secret or launcher paths in this session.
    if (!restored) {
      for (const name of names) attempt(`unset-imported-${name}`,() => run('tmux',['set-environment','-u','-t',manifest.session,name]));
      attempt('verify-imported-values-absent',() => {
        const actual = readEnvironment();
        requireThat(names.every(name => !actual.has(name)), 'Imported environment cleanup not verified');
      });
    }
    const optionReset = attempt('restore-option-inheritance',() => run('tmux',['set-option','-u','-t',manifest.session,'update-environment']));
    for (const entry of entries) attempt(`restore-option-${entry[1]}`,() => run('tmux',['set-option','-t',manifest.session,`update-environment[${entry[1]}]`,entry[2]]));
    const optionVerified = attempt('verify-option-restoration',() => requireThat(run('tmux',['show-options','-t',manifest.session,'update-environment']) === option, 'update-environment restoration not verified'));
    if (diagnostics.length) manifest.environment_cleanup_diagnostics = diagnostics;
    if (!restored || !optionReset || !optionVerified) {
      const message = `Degraded environment restoration: ${diagnostics.map(item => item.step+': '+item.error).join('; ')}`;
      if (primary) primary.message += '; '+message;
      else { primary = new Error(message); primary.code = 'ENVIRONMENT_RESTORE_FAILED'; }
      primary.cleanup_diagnostics = diagnostics;
    }
  }
  if (primary) throw primary;
  return result;
}
function waitForLeader(manifest) {
  while (Date.now() < deadline) {
    const leader = assertExactIdentity(manifest).find(p => p.pane_id === manifest.leader_pane_id);
    requireThat(leader.dead === '0', 'Leader pane exited');
    const output = capture(manifest.leader_pane_id);
    requireThat(!/^(?:fatal\b|error:|error loading|failed to (?:start|load)|.*process exited with code [1-9])/im.test(output), 'Fatal Leader startup output');
    if (path.basename(leader.command) === 'codex') return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(50, Math.max(0, deadline-Date.now())));
  }
  throw new Error('Startup timeout or handoff acceptance unverified');
}
function pathAbsent(file) {
  try { fs.lstatSync(file); return false; }
  catch (error) { if (error.code === 'ENOENT') return true; throw error; }
}
function waitForAcknowledgment(manifest,file,expected) {
  while (Date.now() < deadline) {
    assertExactIdentity(manifest);
    if (!pathAbsent(file)) {
      requireThat(fs.realpathSync(file) === file, 'Acknowledgment must not traverse symlinks');
      const actual = JSON.parse(readRegular(file));
      requireThat(Object.keys(actual).sort().join(',') === Object.keys(expected).sort().join(',') && Object.entries(expected).every(([key,value]) => actual[key] === value), 'Acknowledgment fields do not match handoff');
      assertExactIdentity(manifest);
      return;
    }
    capture(manifest.leader_pane_id); // Bounded diagnostics, never acceptance evidence.
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,Math.min(50,Math.max(0,deadline-Date.now())));
  }
  throw new Error('Acknowledgment timeout');
}
function start(root, options) {
  stage = 'preflight';
  const {specPath, spec} = preflight(root, options);
  const specDigest = digest(spec);
  const stem = path.basename(specPath,path.extname(specPath)).toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40) || 'feature';
  const team = options.team ?? `${stem}-${specDigest.slice(0,8)}`;
  assertNoTeamCollision(root,team);
  const live = panes();
  const supervisor = live.filter(p => p.pane_id === process.env.TMUX_PANE);
  requireThat(supervisor.length === 1, 'Supervisor pane not uniquely live');
  const windowName = `ds41-team-${team}`;
  requireThat(!live.some(p => p.name === windowName), 'Existing window collision');
  const directory = path.join(root,'.omx/pcaom-supervisor',team);
  const contextPath = path.join(root,'.omx/context',`${team}.md`);
  requireThat(!fs.existsSync(directory) && !fs.existsSync(contextPath), 'Existing run/context collision');
  secureDirectory(root,path.dirname(directory));
  fs.mkdirSync(directory,{mode:0o700});
  secureDirectory(root,path.dirname(contextPath));
  const context = `# Approved execution context\nSpec: ${specPath}\nSHA256: ${specDigest}\nWorkspace: ${root}\nWorkers: ${options.workers}\n\n${spec}`;
  atomicWrite(contextPath,context);
  const manifestPath = path.join(directory,'run.json');
  const manifest = {schema_version:1,team,project_root:root,server:supervisor[0].server,session:supervisor[0].session,supervisor_window_id:supervisor[0].window_id,supervisor_pane_id:supervisor[0].pane_id,profile:'pcaom-ds41',spec_path:specPath,spec_digest:specDigest,context_path:contextPath,context_digest:digest(context),state:'starting'};
  let published = false;
  const buffers = [];
  let primary;
  try {
    stage = 'launch';
    withLaunchEnvironment(manifest, () => {
      const result = run('tmux',['new-window','-d','-t',manifest.session,'-n',windowName,'-c',root,'-e','OMX_TEAM_WORKER_CLI=codex','-e','OMX_TEAM_WORKER_LAUNCH_ARGS=--profile pcaom-ds41','-P','-F','#{session_id}\t#{window_id}\t#{pane_id}','codex --profile pcaom-ds41'], {env:{...process.env,OMX_TEAM_WORKER_CLI:'codex',OMX_TEAM_WORKER_LAUNCH_ARGS:'--profile pcaom-ds41'}}).trim().split('\t');
      requireThat(result.length === 3 && result[0] === manifest.session && /^@[0-9]+$/.test(result[1]) && /^%[0-9]+$/.test(result[2]) && !live.some(p => p.window_id === result[1] || p.pane_id === result[2]), 'Invalid newly created identity');
      manifest.window_id = result[1]; manifest.leader_pane_id = result[2]; manifest.pane_ids = [result[2]];
      atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n'); published = true;
    });
    deadline = Date.now()+options['startup-timeout-ms'];
    stage = 'readiness';
    waitForLeader(manifest);
    const id = randomUUID();
    stage = 'handoff';
    const buffer = `pcaom-${team}-${id}`;
    buffers.push(buffer);
    const acknowledgmentPath = path.join(directory,'leader-accepted.json');
    requireThat(pathAbsent(acknowledgmentPath), 'Acknowledgment path already exists');
    const acknowledgment = {schema_version:1,phase:'accepted-awaiting-go',team,handoff_id:id,leader_pane_id:manifest.leader_pane_id,context_digest:manifest.context_digest};
    const handoff = `Validate the exact approved context at ${contextPath}, its SHA256 ${manifest.context_digest}, and workspace ${root}. Do not start Ultragoal, Team, workers, or implementation until a separate matching GO. After validation, atomically create the exact acknowledgment as an exclusive regular non-symlink file (write a temporary file and link it without replacement), remove the temporary file, and END TURN. Do not overwrite an existing acknowledgment.\nAcknowledgment path: ${JSON.stringify(acknowledgmentPath)}\nAcknowledgment JSON: ${JSON.stringify(acknowledgment)}\nWait for a separate GO bound to this handoff, team and context digest. Acknowledgment does not authorize execution.`;
    manifest.state = 'awaiting_ack'; manifest.handoff_id = id;
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    run('tmux',['set-buffer','-b',buffer,'--',handoff]);
    requireThat(run('tmux',['show-buffer','-b',buffer]) === handoff, 'Named buffer read-back mismatch');
    assertExactIdentity(manifest);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'C-u']);
    run('tmux',['paste-buffer','-t',manifest.leader_pane_id,'-b',buffer,'-p','-d']);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'Enter']);
    stage = 'acceptance';
    waitForAcknowledgment(manifest,acknowledgmentPath,acknowledgment);
    manifest.state = 'accepted';
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    stage = 'go';
    manifest.go_id = randomUUID();
    manifest.team_started_verified = false;
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    const goBuffer = `pcaom-${team}-go-${manifest.go_id}`;
    buffers.push(goBuffer);
    const go = {schema_version:1,phase:'go',go_id:manifest.go_id,handoff_id:id,team,context_digest:manifest.context_digest,workers:options.workers};
    const instruction = `GO JSON: ${JSON.stringify(go)}\nMatch this GO against your accepted handoff and context digest. You are the sole execution-plane fan-out owner. Exactly once for this go_id, create or resume Ultragoal and explicitly start OMX Team with the approved workers. Preserve approved constraints and verification commands. Do not replay this GO or create competing orchestration.`;
    run('tmux',['set-buffer','-b',goBuffer,'--',instruction]);
    requireThat(run('tmux',['show-buffer','-b',goBuffer]) === instruction, 'GO named buffer read-back mismatch');
    assertExactIdentity(manifest);
    // From this persisted boundary delivery may be uncertain: never kill or
    // retry automatically, even if the first input command reports failure.
    manifest.state = 'go_submitting';
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'C-u']);
    run('tmux',['paste-buffer','-t',manifest.leader_pane_id,'-b',goBuffer,'-p','-d']);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'Enter']);
    manifest.state = 'go_submitted'; manifest.delivery = 'transport-submitted';
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    return manifest;
  } catch (error) {
    primary = error;
    if (deadline && (Date.now() >= deadline || error.code === 'COMMAND_TIMEOUT')) error.code = 'STARTUP_TIMEOUT';
    error.stage = stage;
    deadline = undefined;
    const goMayBeDelivered = ['go_submitting','go_submitted'].includes(manifest.state);
    if (goMayBeDelivered) manifest.delivery = 'uncertain';
    else manifest.state = 'failed';
    manifest.failure_stage = stage; manifest.diagnostic = redact(error.message).slice(-2000);
    if (published && !goMayBeDelivered) {
      const recorded = JSON.parse(readRegular(manifestPath));
      requireThat(recorded.window_id === manifest.window_id && recorded.leader_pane_id === manifest.leader_pane_id && recorded.session === manifest.session, 'Manifest changed; rollback refused');
      try { assertExactIdentity(recorded); run('tmux',['kill-window','-t',recorded.window_id]); manifest.cleanup = 'killed-owned-window'; }
      catch (cleanupError) { manifest.cleanup = `refused: ${redact(cleanupError.message)}`; }
    }
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',published);
    throw error;
  } finally {
    deadline = undefined;
    const cleanupErrors = [];
    for (const buffer of buffers) {
      try {
        assertSupervisor(manifest);
        try { run('tmux',['delete-buffer','-b',buffer]); }
        catch (error) { if (!/no buffer|unknown buffer|buffer not found/i.test(error.message)) throw error; }
      } catch (error) {
        const diagnostic = `Named buffer cleanup failed: ${redact(error.message)}`;
        cleanupErrors.push(diagnostic);
      }
    }
    if (cleanupErrors.length) {
      manifest.buffer_cleanup_diagnostics = cleanupErrors;
      try { atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',published); }
      catch (error) { cleanupErrors.push(`Cleanup diagnostic persistence failed: ${redact(error.message)}`); }
      if (primary) primary.message += '; '+cleanupErrors.join('; ');
      else throw new Error(cleanupErrors.join('; '));
    }
  }
}
function inspect(root, options) {
  stage = 'inspect';
  const file = path.join(root,'.omx/pcaom-supervisor',options.team,'run.json');
  requireThat(fs.realpathSync(file) === file, 'Manifest path must not traverse symlinks');
  const manifest = JSON.parse(readRegular(file));
  requireThat(manifest.schema_version === 1 && manifest.team === options.team && manifest.project_root === root && Array.isArray(manifest.pane_ids), 'Invalid run manifest');
  const pane = options.pane === 'leader' ? manifest.leader_pane_id : options.pane;
  requireThat(manifest.pane_ids.includes(pane), 'Pane not owned by manifest');
  requireThat(assertExactIdentity(manifest).some(p => p.pane_id === pane), 'Pane not live');
  return {team:manifest.team,pane,output:capture(pane,options.lines)};
}

// Pinned 0.21.6 contracts.js. Raw records remain unchanged in passive output.
const wakeable = new Set(['worker_state_changed','worker_idle','task_completed','task_failed','worker_stopped','message_received','leader_notification_deferred','all_workers_idle','team_leader_nudge','worker_integration_failed','worker_integration_attempt_requested','worker_merge_conflict','worker_cherry_pick_conflict','worker_rebase_conflict','worker_cross_rebase_conflict','worker_stale_diff','worker_stale_heartbeat','worker_stale_stdout']);
function exactPath(file) {
  requireThat(fs.realpathSync(file) === file, 'Path must be canonical and must not traverse symlinks');
  return file;
}
function readBounded(file) {
  exactPath(file);
  requireThat(fs.lstatSync(file).size <= 1048576, 'State file exceeds bounded read limit');
  return readRegular(file);
}
function readJson(file) {
  const value = JSON.parse(readBounded(file));
  requireThat(value && typeof value === 'object' && !Array.isArray(value), 'Expected JSON object');
  return value;
}
function loadRun(root,team) {
  const directory = path.join(root,'.omx/pcaom-supervisor',team);
  const file = path.join(directory,'run.json');
  const manifest = readJson(file);
  requireThat(manifest.schema_version === 1 && manifest.team === team && manifest.project_root === root && Array.isArray(manifest.pane_ids), 'Invalid exact run manifest');
  requireThat(manifest.context_path === path.join(root,'.omx/context',`${team}.md`) && digest(readBounded(manifest.context_path)) === manifest.context_digest, 'Context identity changed');
  const stateRoot = path.join(root,'.omx/state');
  for (const key of ['OMX_TEAM_STATE_ROOT','OMX_ROOT','OMX_STATE_ROOT']) {
    if (!process.env[key]?.trim()) continue;
    const resolved = key === 'OMX_TEAM_STATE_ROOT' ? path.resolve(root,process.env[key]) : path.resolve(root,process.env[key],'.omx/state');
    requireThat(manifest.team_identity?.state_root === stateRoot && resolved === stateRoot, `Redirected or unproven state root: ${key}`);
  }
  requireThat(!process.env.OMX_TEAM_WORKER && !process.env.OMX_TEAM_INTERNAL_WORKER, 'Worker context is not supervisor authority');
  return {root,directory,file,manifest,stateRoot,teamDirectory:path.join(stateRoot,'team',team)};
}
function teamSnapshot(context) {
  const {root,manifest,stateRoot,teamDirectory} = context;
  exactPath(teamDirectory);
  requireThat(pathAbsent(path.join(teamDirectory,'.membership-task-transaction.json')), 'Membership transaction journal requires runtime recovery; passive bridge refuses');
  const config = readJson(path.join(teamDirectory,'config.json'));
  const teamManifest = readJson(path.join(teamDirectory,'manifest.v2.json'));
  const keys = ['name','created_at','leader_cwd','team_state_root','tmux_session','tmux_session_id','tmux_session_created','leader_pane_id','leader_pane_pid','tmux_pane_owner_id','hud_pane_id','hud_pane_pid','worker_count','workspace_mode','worktree_mode'];
  requireThat(teamManifest.schema_version === 2 && teamManifest.leader?.worker_id === 'leader-fixed', 'Unsupported Team manifest');
  for (const key of keys) requireThat(JSON.stringify(config[key]) === JSON.stringify(teamManifest[key]), `Paired Team identity mismatch: ${key}`);
  requireThat(config.name === manifest.team && /^[a-z0-9][a-z0-9-]{0,29}$/.test(config.name) && config.leader_cwd === root && config.team_state_root === stateRoot && config.leader_pane_id === manifest.leader_pane_id && config.tmux_session_id === manifest.session && typeof config.created_at === 'string' && config.created_at && typeof config.tmux_session === 'string' && config.tmux_session && typeof config.tmux_pane_owner_id === 'string' && config.tmux_pane_owner_id, 'Unproven Team identity');
  requireThat(Array.isArray(config.workers) && config.workers.length > 0 && config.workers.length <= 32 && config.worker_count === config.workers.length, 'Unsupported worker configuration');
  const workerKeys = ['name','index','role','pid','pane_id','working_dir','worktree_repo_root','worktree_path','worktree_branch','worktree_detached','worktree_created','team_state_root'];
  const select = (value,fields) => Object.fromEntries(fields.map(key => [key,value[key] ?? null]));
  const workers = config.workers.map(worker => select(worker,workerKeys));
  requireThat(JSON.stringify(workers) === JSON.stringify(teamManifest.workers?.map(worker => select(worker,workerKeys))), 'Worker identities disagree');
  requireThat(new Set(workers.map(worker => worker.name)).size === workers.length, 'Duplicate workers');
  for (const worker of workers) {
    requireThat(safeTeam(worker.name) && /^%[0-9]+$/.test(worker.pane_id) && Number.isSafeInteger(worker.pid) && worker.pid > 0 && typeof worker.worktree_path === 'string' && path.isAbsolute(worker.worktree_path), 'Incomplete worker identity');
    exactPath(worker.worktree_path);
    if (worker.working_dir) exactPath(worker.working_dir);
    if (worker.team_state_root) requireThat(worker.team_state_root === stateRoot, 'Worker state root mismatch');
  }
  const identity = {...select(config,keys),state_root:stateRoot,team_directory:teamDirectory,workers,leader:teamManifest.leader};
  if (context.frozen ?? manifest.team_identity) requireThat(JSON.stringify(identity) === JSON.stringify(context.frozen ?? manifest.team_identity), 'Frozen Team identity changed');
  const paneIds = [manifest.leader_pane_id,...workers.map(worker => worker.pane_id),...(config.hud_pane_id ? [config.hud_pane_id] : [])];
  requireThat(new Set(paneIds).size === paneIds.length, 'Duplicate owned panes');
  assertExactIdentity({...manifest,pane_ids:paneIds});
  for (const [pane,pid] of [[config.leader_pane_id,config.leader_pane_pid],...workers.map(worker => [worker.pane_id,worker.pid]),...(config.hud_pane_id ? [[config.hud_pane_id,config.hud_pane_pid]] : [])]) {
    requireThat(Number.isSafeInteger(pid) && pid > 0, 'Missing frozen pane PID');
    const actual = run('tmux',['display-message','-p','-t',pane,'#{session_id}\t#{window_id}\t#{pane_id}\t#{pane_pid}\t#{@omx_team_pane_owner_id}\t#{session_created}\t#{session_name}:#{window_index}']).trim().split('\t');
    requireThat(JSON.stringify(actual) === JSON.stringify([manifest.session,manifest.window_id,pane,String(pid),config.tmux_pane_owner_id,String(config.tmux_session_created),config.tmux_session]), 'Live Team pane ownership changed');
  }
  context.frozen = identity;
  context.liveManifest = {...manifest,pane_ids:paneIds};
  return {identity,config,manifest:teamManifest};
}
function records(context) {
  const directory = exactPath(path.join(context.teamDirectory,'tasks'));
  const names = fs.readdirSync(directory).filter(name => /^task-.*\.json$/.test(name)).sort();
  requireThat(names.length > 0 && names.length <= 1000, 'Empty or oversized task set');
  const tasks = names.map(name => {
    requireThat(/^task-[0-9]{1,20}\.json$/.test(name), 'Malformed task path');
    const task = readJson(path.join(directory,name));
    requireThat(name === `task-${task.id}.json`, 'Task identity mismatch');
    return task;
  });
  const optional = file => pathAbsent(file) ? null : readJson(file);
  const workers = context.frozen.workers.map(worker => ({name:worker.name,...Object.fromEntries(['identity','status','heartbeat'].map(name => [name,optional(path.join(context.teamDirectory,'workers',worker.name,`${name}.json`))]))}));
  const eventFile = path.join(context.teamDirectory,'events/events.ndjson');
  const events = pathAbsent(eventFile) ? [] : readBounded(eventFile).split('\n').filter(Boolean).map(line => JSON.parse(line));
  requireThat(events.every(event => event.team === context.manifest.team && typeof event.event_id === 'string'), 'Event identity mismatch');
  return {phase:optional(path.join(context.teamDirectory,'phase.json')),tasks,workers,latest_wakeable_event:events.filter(event => wakeable.has(event.type)).at(-1) ?? null};
}
function saveRun(context) {
  // Refuse a concurrent/replaced run manifest before publishing our evidence.
  requireThat(JSON.stringify(readJson(context.file)) === JSON.stringify(context.original), 'Run manifest changed concurrently');
  atomicWrite(context.file,JSON.stringify(context.manifest,null,2)+'\n',true);
  context.original = structuredClone(context.manifest);
}
function freezeEvidence(file,text) {
  if (pathAbsent(file)) atomicWrite(file,text);
  else requireThat(readBounded(file) === text, 'Previously frozen final evidence differs');
}
function api(operation,input) {
  const envelope = JSON.parse(run('omx',['team','api',operation,'--input',JSON.stringify(input),'--json']));
  requireThat(envelope.schema_version === '1.0' && envelope.command === `omx team api ${operation}` && typeof envelope.timestamp === 'string' && Number.isFinite(Date.parse(envelope.timestamp)) && envelope.ok === true && envelope.operation === operation && envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data), 'Unsupported or unsuccessful OMX API envelope');
  return envelope.data;
}
function steer(context,options) {
  const messageId = `${context.manifest.team}-${process.pid}-${randomUUID()}`;
  const ackPath = path.join(context.directory,`steer-${messageId}.json`);
  requireThat(pathAbsent(ackPath), 'Steering ACK collision');
  const expected = {team:context.manifest.team,message_id:messageId,leader_pane_id:context.manifest.leader_pane_id,context_digest:context.manifest.context_digest};
  const body = `Steering message: ${messageId}\nInstruction JSON: ${JSON.stringify(options.message)}\nApply this instruction once per message_id; on duplicate delivery only acknowledge, do not execute twice. Atomically create the exact ACK as an exclusive regular non-symlink file after accepting the instruction.\nAcknowledgment path: ${JSON.stringify(ackPath)}\nAcknowledgment JSON: ${JSON.stringify(expected)}`;
  const evidence = {message_id:messageId,capability:'experimental-one-way-file-ack',transport:'omx-one-way',ack_path:ackPath};
  const waitAck = () => {
    const end = Date.now()+options['ack-timeout-ms'];
    do {
      teamSnapshot(context);
      if (!pathAbsent(ackPath)) {
        requireThat(JSON.stringify(Object.entries(readJson(ackPath)).sort()) === JSON.stringify(Object.entries(expected).sort()), 'Steering ACK fields mismatch');
        return true;
      }
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,Math.min(50,Math.max(0,end-Date.now())));
    } while (Date.now() < end);
    return false;
  };
  let reason;
  try {
    const data = api('send-message',{team_name:context.manifest.team,from_worker:'supervisor',to_worker:'leader-fixed',body});
    requireThat(data.dispatch?.ok === true && typeof data.message?.message_id === 'string', 'OMX dispatch not confirmed');
  } catch (error) { reason = redact(error.message).slice(-1000); }
  if (!reason && !waitAck()) reason = 'File ACK timeout; first delivery may have occurred';
  if (reason) {
    evidence.transport = 'degraded-tmux-fallback';
    context.manifest.degraded_reason = reason;
    context.manifest.mailbox_supervision = evidence.capability;
    context.manifest.last_steering = evidence;
    saveRun(context);
    // Do not overwrite or ignore a mismatched ACK after uncertain API delivery.
    if (!pathAbsent(ackPath)) requireThat(JSON.stringify(Object.entries(readJson(ackPath)).sort()) === JSON.stringify(Object.entries(expected).sort()), 'Steering ACK fields mismatch');
    const buffer = `pcaom-${messageId}`;
    try {
      teamSnapshot(context);
      run('tmux',['set-buffer','-b',buffer,'--',body]);
      requireThat(run('tmux',['show-buffer','-b',buffer]) === body, 'Named buffer read-back mismatch');
      teamSnapshot(context);
      run('tmux',['send-keys','-t',context.manifest.leader_pane_id,'C-u']);
      run('tmux',['paste-buffer','-t',context.manifest.leader_pane_id,'-b',buffer,'-p','-d']);
      run('tmux',['send-keys','-t',context.manifest.leader_pane_id,'Enter']);
      capture(context.manifest.leader_pane_id);
      requireThat(waitAck(), 'Steering ACK timeout after degraded fallback');
    } finally {
      assertSupervisor(context.manifest);
      try { run('tmux',['delete-buffer','-b',buffer]); }
      catch (error) { if (!/no buffer|unknown buffer|buffer not found/i.test(error.message)) throw error; }
    }
  }
  context.manifest.mailbox_supervision = evidence.capability;
  context.manifest.last_steering = {...evidence,acknowledged:true};
  saveRun(context);
  return context.manifest.last_steering;
}
function lifecycle(root,command,options) {
  stage = command;
  const context = loadRun(root,options.team);
  const {manifest} = context;
  context.original = structuredClone(manifest);
  if (command !== 'status') requireThat(['go_submitted','resumed'].includes(manifest.state), 'Run state does not authorize lifecycle operation');
  if (command === 'status' && pathAbsent(context.teamDirectory)) {
    requireThat(['go_submitting','go_submitted'].includes(manifest.state), 'Team state absent');
    assertExactIdentity(manifest);
    return {mode:'passive',status:'awaiting-team',run:manifest,team_identity:null,phase:null,tasks:[],workers:[],latest_wakeable_event:null,gaps:['Team startup not verified']};
  }
  const snapshot = teamSnapshot(context);
  const state = records(context);
  teamSnapshot(context);
  if (command === 'status') return {mode:'passive',run:manifest,team_identity:{...snapshot.identity,config:snapshot.config,manifest:snapshot.manifest},...state,gaps:['Passive file snapshot is not atomic and does not prove runtime health or successful verification']};
  if (command === 'await') {
    commandTimeout = options['timeout-ms']+5000;
    const data = api('await-event',{team_name:manifest.team,after_event_id:options['after-event-id'] ?? state.latest_wakeable_event?.event_id ?? '',timeout_ms:options['timeout-ms'],poll_ms:100,wakeable_only:true});
    requireThat(['timeout','event'].includes(data.status) && typeof data.cursor === 'string' && (data.status === 'timeout' ? data.event === null : data.event?.team === manifest.team && data.event.event_id === data.cursor && wakeable.has(data.event.type)), 'Invalid event wait result');
    teamSnapshot(context);
    return data;
  }
  manifest.team_identity = context.frozen;
  manifest.team_started_verified = true;
  saveRun(context);
  if (command === 'steer') return steer(context,options);
  if (command === 'resume') {
    teamSnapshot(context);
    const output = run('omx',['team','resume',manifest.team]);
    requireThat(output.split(/\r?\n/)[0] === `Team started: ${manifest.team}`, 'Unverified resume result');
    teamSnapshot(context);
    manifest.state = 'resumed';
    manifest.resume_evidence = {output,at:new Date().toISOString(),worker_resurrection_verified:false};
    saveRun(context);
    return manifest.resume_evidence;
  }
  if (command === 'finalize') {
    requireThat(state.tasks.every(task => task.status === 'completed'), 'Every task must be completed');
    const proof = readJson(path.join(context.directory,'leader-final.json'));
    requireThat(proof.team === manifest.team && proof.context_digest === manifest.context_digest && Array.isArray(proof.verification) && proof.verification.length > 0 && proof.verification.every(item => typeof item.command === 'string' && item.command.trim() && item.result === 'pass' && item.exit_code === 0), 'Aggregate verification evidence incomplete');
    requireThat(typeof proof.handoff_path === 'string' && path.isAbsolute(proof.handoff_path) && inside(root,proof.handoff_path), 'Final handoff outside project');
    const handoff = readBounded(proof.handoff_path);
    requireThat(digest(handoff) === proof.handoff_digest, 'Final handoff digest mismatch');
    freezeEvidence(path.join(context.directory,'final-handoff.md'),handoff);
    freezeEvidence(path.join(context.directory,'final-evidence.json'),JSON.stringify(proof,null,2)+'\n');
    teamSnapshot(context);
    requireThat(records(context).tasks.every(task => task.status === 'completed'), 'Tasks changed before shutdown');
  }
  teamSnapshot(context);
  try {
    const output = run('omx',['team','shutdown',manifest.team,...(command === 'abort' ? ['--force','--confirm-issues'] : [])]);
    requireThat(output.split(/\r?\n/)[0] === `Team shutdown complete: ${manifest.team}`, 'Unverified shutdown result');
    assertSupervisor(manifest);
    manifest.state = command === 'abort' ? 'aborted' : 'finalized';
    manifest.shutdown_evidence = {output,at:new Date().toISOString(),forced:command === 'abort',official_review:'pending'};
    saveRun(context);
    return {state:manifest.state,...manifest.shutdown_evidence};
  } catch (error) {
    manifest.shutdown_diagnostic = redact(error.message).slice(-2000);
    saveRun(context);
    throw error;
  }
}
try {
  const {command,options} = parseArgs();
  stage = command === 'start' ? 'preflight' : command;
  const root = rootDirectory();
  emit(true,command,command === 'start' ? start(root,options) : command === 'inspect' ? inspect(root,options) : lifecycle(root,command,options));
} catch (error) { emit(false,undefined,{error:redact(error.message),code:error.code ?? 'BRIDGE_ERROR',stage:error.stage ?? stage,...(error.command_evidence ? {command_evidence:error.command_evidence}:{}),...(error.cleanup_diagnostics ? {cleanup_diagnostics:error.cleanup_diagnostics}:{})}); }
