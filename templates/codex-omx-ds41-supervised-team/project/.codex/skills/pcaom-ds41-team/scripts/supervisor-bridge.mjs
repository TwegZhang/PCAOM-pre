#!/usr/bin/env node
// Experimental one-shot bridge; fake CLI tests are not runtime capability evidence.
// Pane identity/liveness precedes handoff; the Leader writes a scoped file ACK.
// Never resolve shared-root aliases. The Leader binds the actual internal name
// inside a run-exclusive root. Pinned OMX status invokes monitoring and
// read-config may migrate state; passive reads use neither surface.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { isDeepStrictEqual } from 'node:util';

const secret = process.env.DEEPSEEK_API_KEY;
const secrets = new Set(secret ? [secret] : []);
const redact = value => [...secrets].reduce((text,key) => text.split(key).join('[REDACTED]'),String(value));
const digest = value => createHash('sha256').update(value).digest('hex');
const safeTeam = value => /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
let deadline;
let commandTimeout = 5000;
let stage = 'arguments';
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function requireIdentity(condition, message) {
  if (!condition) { const error = new Error(`Invalid bridge identity: ${message}`); error.code = 'IDENTITY_INVALID'; throw error; }
}
const matches = (value,pattern) => typeof value === 'string' && pattern.test(value);
const sessionId = value => matches(value,/^\$[0-9]+$/);
const windowId = value => matches(value,/^@[0-9]+$/);
const paneId = value => matches(value,/^%[0-9]+$/);
const positiveInteger = value => Number.isSafeInteger(value) && value > 0;
const positiveDecimal = value => matches(value,/^[1-9][0-9]*$/) && positiveInteger(Number(value));
const absolutePath = value => typeof value === 'string' && path.isAbsolute(value) && path.normalize(value) === value && !value.includes('\0');
const workerLaunchArgs = '--profile pcaom-ds41 --model deepseek-flash -c model_reasoning_effort="high"';
const hasExactOutputLine = (output, expected) => output.split(/\r?\n/).filter(line => line === expected).length === 1;
function run(program, args, options = {}) {
  const {privateOutput = false, timeout:requestedTimeout = commandTimeout, ...spawnOptions} = options;
  const timeout = deadline ? Math.max(1, Math.min(requestedTimeout, deadline - Date.now())) : requestedTimeout;
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
  const commands = {start: ['spec', 'workers', 'team', 'startup-timeout-ms','command-timeout-ms'], inspect: ['team', 'pane', 'lines','command-timeout-ms'], status:['team'], await:['team','timeout-ms','after-event-id'], steer:['team','message','ack-timeout-ms'], resume:['team'], finalize:['team'], abort:['team']};
  requireThat(Object.hasOwn(commands,command), 'Unknown bridge command');
  const allowed = commands[command];
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
function rootDirectory(localOnly = false) {
  if (localOnly) {
    // A malformed persisted identity must fail before even invoking Git.
    let root = fs.realpathSync(process.cwd());
    while (true) {
      if (!pathAbsent(path.join(root,'.git'))) return root;
      const parent = path.dirname(root);
      requireIdentity(parent !== root, 'Project root not found');
      root = parent;
    }
  }
  const root = fs.realpathSync(run('git', ['rev-parse', '--show-toplevel']).trim());
  requireThat(inside(root, fs.realpathSync(process.cwd())), 'Working directory outside project');
  return root;
}
function panes(session) {
  requireIdentity(sessionId(session), 'Exact tmux session ID required');
  return run('tmux', ['list-panes', '-s','-t',session, '-F', '#{session_id}\t#{window_id}\t#{pane_id}\t#{window_name}\t#{pane_dead}\t#{pane_current_command}\t#{socket_path}\t#{pid}\t#{start_time}']).trim().split('\n').map(line => {
    const [session, window_id, pane_id, name, dead, command, socket_path, pid, start_time, extra] = line.split('\t');
    requireThat(/^\$[0-9]+$/.test(session) && /^@[0-9]+$/.test(window_id) && /^%[0-9]+$/.test(pane_id) && name && /^(0|1)$/.test(dead) && command && path.isAbsolute(socket_path ?? '') && /^[1-9][0-9]*$/.test(pid) && /^[1-9][0-9]*$/.test(start_time) && extra === undefined, 'Malformed tmux identity');
    return {session, window_id, pane_id, name, dead, command, server:{socket_path,pid,start_time}};
  });
}
function assertExactIdentity(manifest, allowExtra = false) {
  const current = panes(manifest.session);
  requireThat(manifest.server && current.every(p => JSON.stringify(p.server) === JSON.stringify(manifest.server)), 'Tmux server generation changed');
  const owned = current.filter(p => p.session === manifest.session && p.window_id === manifest.window_id);
  requireThat(manifest.window_id !== manifest.supervisor_window_id && owned.some(p => p.pane_id === manifest.leader_pane_id), 'Run identity changed');
  requireThat(current.some(p => p.session === manifest.session && p.window_id === manifest.supervisor_window_id && p.pane_id === manifest.supervisor_pane_id), 'Supervisor identity changed');
  requireThat(allowExtra ? manifest.pane_ids.every(id => owned.some(p => p.pane_id === id)) : JSON.stringify(owned.map(p => p.pane_id).sort()) === JSON.stringify([...manifest.pane_ids].sort()), 'Run pane set changed');
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
function validateProfile(home, root) {
  const text = readRegular(path.join(home,'pcaom-ds41.config.toml'));
  requireThat(!text.includes(secret), 'Profile contains credential');
  const projectSection = `projects.${JSON.stringify(root)}`;
  const expected = {
    '': {model:'deepseek-flash', model_provider:'deepseek', model_reasoning_effort:'high', web_search:'disabled', approval_policy:'never', sandbox_mode:'danger-full-access', model_catalog_json:path.join(home,'model-catalogs/pcaom-deepseek-models.json')},
    'model_providers.deepseek': {name:'DeepSeek', base_url:'https://api.deepseek.com/', wire_api:'responses', env_key:'DEEPSEEK_API_KEY', env_key_instructions:'Set DEEPSEEK_API_KEY in the trusted launcher environment.'},
    'tui': {screen_reader_detection_done:true, hide_full_access_warning:true},
    [projectSection]: {trust_level:'trusted'},
  };
  let section = '';
  const seen = new Set();
  const sections = new Set();
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (trimmed.startsWith('[')) {
      requireThat(trimmed.endsWith(']'), 'Unknown or duplicate profile section');
      const header = trimmed.slice(1,-1);
      requireThat(header !== '' && Object.hasOwn(expected,header) && !sections.has(header), 'Unknown or duplicate profile section');
      section = header; sections.add(section); continue;
    }
    const entry = /^([a-z_]+)\s*=\s*("(?:[^"\\]|\\.)*"|true)$/.exec(trimmed);
    requireThat(entry, 'Unsupported profile syntax');
    const [,key,encoded] = entry;
    const identity = section+'.'+key;
    requireThat(!seen.has(identity) && Object.hasOwn(expected[section],key), 'Duplicate or misplaced profile key');
    requireThat((encoded === 'true' ? true : JSON.parse(encoded)) === expected[section][key], `Invalid profile ${key}`);
    seen.add(identity);
  }
  requireThat(seen.size === 15 && sections.size === 3, 'Incomplete profile');
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
  validateProfile(process.env.CODEX_HOME, root);
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
  requireThat(run('git',['status','--porcelain=v1','--untracked-files=all']).trim() === '', 'OMX Team requires a clean Git workspace');
  return {specPath, spec};
}
function assertNoTeamCollision() {
  // Pinned state-root.js resolves these overrides before <cwd>/.omx/state.
  // Alternate roots require separately proven scope; never infer it here.
  for (const key of ['OMX_TEAM_STATE_ROOT','OMX_ROOT','OMX_STATE_ROOT','OMX_TEAM_WORKER','OMX_TEAM_INTERNAL_WORKER']) {
    requireThat(!process.env[key]?.trim(), `Ambiguous Team context: ${key}`);
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
  assertNoTeamCollision();
  const supervisorSession = run('tmux',['display-message','-p','-t',process.env.TMUX_PANE,'#{session_id}']).trim();
  const live = panes(supervisorSession);
  const supervisor = live.filter(p => p.pane_id === process.env.TMUX_PANE);
  requireThat(supervisor.length === 1, 'Supervisor pane not uniquely live');
  const windowName = `ds41-team-${team}`;
  requireThat(!live.some(p => p.name === windowName), 'Existing window collision');
  const directory = path.join(root,'.omx/pcaom-supervisor',team);
  const contextPath = path.join(root,'.omx/context',`${team}.md`);
  requireThat(!fs.existsSync(directory) && !fs.existsSync(contextPath), 'Existing run/context collision');
  secureDirectory(root,path.dirname(directory));
  fs.mkdirSync(directory,{mode:0o700});
  const runId = randomUUID();
  const stateRoot = path.join(root,'.omx-pcaom-team-state',runId);
  secureDirectory(root,path.dirname(stateRoot));
  fs.mkdirSync(stateRoot,{mode:0o700});
  secureDirectory(root,path.dirname(contextPath));
  const context = `# Approved execution context\nSpec: ${specPath}\nSHA256: ${specDigest}\nWorkspace: ${root}\nWorkers: ${options.workers}\n\n${spec}`;
  atomicWrite(contextPath,context);
  const manifestPath = path.join(directory,'run.json');
  const manifest = {schema_version:1,team,run_id:runId,state_root:stateRoot,state_root_identity:directoryIdentity(stateRoot),project_root:root,server:supervisor[0].server,session:supervisor[0].session,supervisor_window_id:supervisor[0].window_id,supervisor_pane_id:supervisor[0].pane_id,profile:'pcaom-ds41',spec_path:specPath,spec_digest:specDigest,context_path:contextPath,context_digest:digest(context),state:'starting'};
  let published = false;
  const buffers = [];
  let primary;
  try {
    stage = 'launch';
    withLaunchEnvironment(manifest, () => {
      assertStateRoot(manifest);
      const result = run('tmux',['new-window','-d','-t',manifest.session,'-n',windowName,'-c',root,'-e',`OMX_TEAM_STATE_ROOT=${stateRoot}`,'-e','OMX_TEAM_WORKER_CLI=codex','-e',`OMX_TEAM_WORKER_LAUNCH_ARGS=${workerLaunchArgs}`,'-P','-F','#{session_id}\t#{window_id}\t#{pane_id}','codex --profile pcaom-ds41'], {env:{...process.env,OMX_TEAM_WORKER_CLI:'codex',OMX_TEAM_WORKER_LAUNCH_ARGS:workerLaunchArgs,OMX_TEAM_STATE_ROOT:stateRoot}}).trim().split('\t');
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
    manifest.binding_contract = bindingContract(manifest,directory);
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    const goBuffer = `pcaom-${team}-go-${manifest.go_id}`;
    buffers.push(goBuffer);
    const go = {schema_version:1,phase:'go',go_id:manifest.go_id,handoff_id:id,team,run_id:runId,state_root:stateRoot,context_digest:manifest.context_digest,workers:options.workers};
    const instruction = `GO JSON: ${JSON.stringify(go)}\nMatch this GO against your accepted handoff and context digest. You are the sole execution-plane fan-out owner. Exactly once for this go_id, create or resume Ultragoal and explicitly start OMX Team with the approved workers under the inherited exact OMX_TEAM_STATE_ROOT. Shell initialization can overwrite inherited worker arguments: in the same shell command that invokes Team, first run export OMX_TEAM_WORKER_CLI=codex and export OMX_TEAM_WORKER_LAUNCH_ARGS='--profile pcaom-ds41 --model deepseek-flash -c model_reasoning_effort="high"'. When the approved Spec requires preserved independent lanes, use the latest matching approved OMX Team DAG and its exact launch hint; use that hint verbatim even when it is role-agnostic, because an explicit single agent type overrides per-node DAG roles and can collapse lanes. Only without a lane-preserving approved hint use the fallback invocation shape omx team ${options.workers}:executor "<approved task summary>". Before publishing the binding, read every generated worker startup script and require both --profile pcaom-ds41 and --model deepseek-flash with no other profile or model. Give one approved lane to each Worker and verify the persisted task ownership before implementation; require DAG-backed decomposition when a lane-preserving Spec supplied it. If OMX cannot preserve the independent lanes, stop and report the mismatch instead of collapsing them. DS41 Workers are terminal execution lanes and must not spawn Codex native subagents or nested orchestration. Capture actual Team started: <internal-name>; the bridge run name is not that internal name. Read the sole exact Team config.json and manifest.v2.json under this state root, then atomically exclusively publish ${path.join(directory,'team-bound.json')} as specified by the binding contract in the installed Skill. Never overwrite a binding or create a second Team in this root. Preserve approved constraints and verification commands. Do not replay this GO or create competing orchestration.\nBinding contract JSON: ${JSON.stringify(manifest.binding_contract)}`;
    run('tmux',['set-buffer','-b',goBuffer,'--',instruction]);
    requireThat(run('tmux',['show-buffer','-b',goBuffer]) === instruction, 'GO named buffer read-back mismatch');
    assertExactIdentity(manifest);
    assertStateRoot(manifest);
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
  const context = loadRun(root,options.team);
  const {manifest} = context;
  const namespace = teamNamespace(context);
  if (namespace.length && !pathAbsent(path.join(context.directory,'team-bound.json'))) teamSnapshot(context);
  const authorized = context.frozen ? [manifest.leader_pane_id,...context.frozen.workers.map(worker => worker.pane_id)] : [manifest.leader_pane_id];
  const pane = options.pane === 'leader' ? manifest.leader_pane_id : options.pane;
  requireThat(authorized.includes(pane), 'Pane not owned by bound run');
  requireThat(assertExactIdentity({...manifest,pane_ids:authorized},namespace.length > 0).some(p => p.pane_id === pane), 'Pane not live');
  return {team:manifest.team,pane,output:capture(pane,options.lines)};
}

// Pinned 0.21.6 contracts.js. Raw records remain unchanged in passive output.
const wakeable = new Set(['worker_state_changed','worker_idle','task_completed','task_failed','worker_stopped','message_received','leader_notification_deferred','all_workers_idle','team_leader_nudge','worker_integration_failed','worker_integration_attempt_requested','worker_merge_conflict','worker_cherry_pick_conflict','worker_rebase_conflict','worker_cross_rebase_conflict','worker_stale_diff','worker_stale_heartbeat','worker_stale_stdout']);
const identityFields = ['name','display_name','requested_name','created_at','leader_cwd','team_state_root','tmux_session','tmux_session_id','tmux_session_created','leader_pane_id','leader_pane_pid','tmux_pane_owner_id','worker_count','workspace_mode','worktree_mode'];
const workerIdentityFields = ['name','index','role','pid','pane_id','working_dir','worktree_repo_root','worktree_path','worktree_branch','worktree_detached','worktree_created','team_state_root'];
const equal = isDeepStrictEqual;
function directoryIdentity(directory) {
  exactPath(directory);
  const stat = fs.lstatSync(directory);
  requireIdentity(stat.isDirectory() && !stat.isSymbolicLink(), 'Regular state directory required');
  return {dev:stat.dev,ino:stat.ino,uid:stat.uid};
}
function assertStateRoot(manifest) {
  requireIdentity(matches(manifest.run_id,/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/) && manifest.state_root === path.join(manifest.project_root,'.omx-pcaom-team-state',manifest.run_id), 'Run-exclusive canonical state root required');
  requireIdentity(equal(directoryIdentity(manifest.state_root),manifest.state_root_identity), 'State root replaced');
}
function bindingContract(manifest,directory) {
  return {schema_version:1,adapter:'pcaom-ds41-supervisor',adapter_version:1,omx_version:'0.21.6',run_id:manifest.run_id,bridge_run_name:manifest.team,handoff_id:manifest.handoff_id,go_id:manifest.go_id,context_digest:manifest.context_digest,spec_digest:manifest.spec_digest,project_root:manifest.project_root,run_directory:directory,state_root:manifest.state_root,state_root_identity:manifest.state_root_identity,context_path:manifest.context_path,spec_path:manifest.spec_path,server:manifest.server,session:manifest.session,window_id:manifest.window_id,leader_pane_id:manifest.leader_pane_id,supervisor_window_id:manifest.supervisor_window_id,supervisor_pane_id:manifest.supervisor_pane_id,identity_fields:identityFields,worker_identity_fields:workerIdentityFields};
}
function teamNamespace(context) {
  assertStateRoot(context.manifest);
  const root = path.join(context.stateRoot,'team');
  if (pathAbsent(root)) return [];
  directoryIdentity(root);
  const entries = fs.readdirSync(root);
  requireIdentity(entries.length <= 1, 'Isolated Team namespace contains extra candidates');
  for (const name of entries) {
    requireIdentity(matches(name,/^[a-z0-9][a-z0-9-]{0,29}$/), 'Malformed Team directory name');
    directoryIdentity(path.join(root,name));
    requireIdentity(pathAbsent(path.join(root,name,'.membership-task-transaction.json')), 'Membership transaction journal requires runtime recovery');
  }
  return entries;
}
function readBinding(context,internalName) {
  try {
  const file = path.join(context.directory,'team-bound.json');
  if (pathAbsent(file)) { const error = new Error('Team is unbound; same proven Leader must publish team-bound.json'); error.code = 'TEAM_UNBOUND'; throw error; }
  const text = readBounded(file);
  const binding = JSON.parse(text);
  const contract = bindingContract(context.manifest,context.directory);
  delete contract.identity_fields; delete contract.worker_identity_fields;
  requireIdentity(binding && Object.entries(contract).every(([key,value]) => equal(binding[key],value)), 'Binding replay or run context mismatch');
  requireIdentity(binding.internal_name === internalName && typeof binding.display_name === 'string' && typeof binding.requested_name === 'string' && matches(binding.config_sha256,/^[a-f0-9]{64}$/) && matches(binding.manifest_sha256,/^[a-f0-9]{64}$/) && typeof binding.bound_at === 'string' && Number.isFinite(Date.parse(binding.bound_at)), 'Malformed binding evidence');
  const bindingDigest = digest(text);
  requireIdentity(!context.manifest.binding_digest || context.manifest.binding_digest === bindingDigest, 'Accepted binding changed');
  requireIdentity(!context.bindingDigest || context.bindingDigest === bindingDigest, 'Binding changed during operation');
  context.bindingDigest = bindingDigest;
  context.binding = binding;
  context.internalName = internalName;
  context.teamDirectory = path.join(context.stateRoot,'team',internalName);
  return binding;
  } catch (error) { error.binding_unverified = true; throw error; }
}
function unboundStatus(context,name,reason) {
  requireIdentity(equal(teamNamespace(context),[name]), 'Unbound namespace changed');
  const directory = path.join(context.stateRoot,'team',name);
  return {mode:'passive',status:'team-unbound',run:context.manifest,team_identity:null,unbound_evidence:{config:readJson(path.join(directory,'config.json')),manifest:readJson(path.join(directory,'manifest.v2.json'))},phase:null,tasks:[],workers:[],latest_wakeable_event:null,gaps:[redact(reason),'Same proven Leader must publish exclusive binding or report blocker; no lifecycle authority']};
}
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
  requireIdentity(manifest.schema_version === 1 && matches(manifest.team,/^[a-z0-9][a-z0-9-]{0,63}$/) && manifest.team === team, 'Exact team name required');
  requireIdentity(absolutePath(root) && absolutePath(manifest.project_root) && manifest.project_root === root && inside(root,directory) && fs.realpathSync(directory) === directory, 'Canonical project/run paths required');
  requireIdentity(sessionId(manifest.session) && windowId(manifest.window_id) && windowId(manifest.supervisor_window_id) && manifest.window_id !== manifest.supervisor_window_id, 'Exact session/window IDs required');
  requireIdentity(paneId(manifest.leader_pane_id) && paneId(manifest.supervisor_pane_id) && manifest.leader_pane_id !== manifest.supervisor_pane_id && Array.isArray(manifest.pane_ids) && manifest.pane_ids.length > 0 && manifest.pane_ids.every(paneId) && new Set(manifest.pane_ids).size === manifest.pane_ids.length && manifest.pane_ids.includes(manifest.leader_pane_id) && !manifest.pane_ids.includes(manifest.supervisor_pane_id), 'Exact leader/supervisor/pane IDs required');
  requireIdentity(manifest.server && absolutePath(manifest.server.socket_path) && positiveDecimal(manifest.server.pid) && positiveDecimal(manifest.server.start_time), 'Complete tmux server generation required');
  requireIdentity(manifest.profile === 'pcaom-ds41' && matches(manifest.context_digest,/^[a-f0-9]{64}$/) && matches(manifest.spec_digest,/^[a-f0-9]{64}$/), 'Profile and digests required');
  requireIdentity(absolutePath(manifest.spec_path) && inside(root,manifest.spec_path) && absolutePath(manifest.context_path) && manifest.context_path === path.join(root,'.omx/context',`${team}.md`), 'Canonical project context/spec paths required');
  const states = ['starting','awaiting_ack','accepted','go_submitting','go_submitted','bound','resumed','shutdown_submitting','shutdown_uncertain','finalized','aborted','failed'];
  requireIdentity(typeof manifest.state === 'string' && states.includes(manifest.state), 'Known run state required');
  const uuid = /^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/;
  if (!['starting','failed'].includes(manifest.state)) requireIdentity(matches(manifest.handoff_id,uuid), 'Bound handoff ID required');
  if (['go_submitting','go_submitted','bound','resumed','shutdown_submitting','shutdown_uncertain','finalized','aborted'].includes(manifest.state)) requireIdentity(matches(manifest.go_id,uuid), 'Bound GO ID required');
  requireIdentity(digest(readBounded(manifest.context_path)) === manifest.context_digest, 'Context digest changed');
  assertStateRoot(manifest);
  const stateRoot = manifest.state_root;
  for (const key of ['OMX_TEAM_STATE_ROOT','OMX_ROOT','OMX_STATE_ROOT']) {
    if (!process.env[key]?.trim()) continue;
    const resolved = key === 'OMX_TEAM_STATE_ROOT' ? path.resolve(root,process.env[key]) : path.resolve(root,process.env[key],'.omx/state');
    requireThat(resolved === stateRoot, `Redirected or unproven state root: ${key}`);
  }
  requireThat(!process.env.OMX_TEAM_WORKER && !process.env.OMX_TEAM_INTERNAL_WORKER, 'Worker context is not supervisor authority');
  return {root,directory,file,manifest,stateRoot};
}
function teamSnapshot(context) {
  const entries = teamNamespace(context);
  requireIdentity(entries.length === 1, 'Expected exactly one bound Team');
  const binding = readBinding(context,entries[0]);
  const {root,manifest,stateRoot,teamDirectory,internalName} = context;
  exactPath(teamDirectory);
  requireThat(pathAbsent(path.join(teamDirectory,'.membership-task-transaction.json')), 'Membership transaction journal requires runtime recovery; passive bridge refuses');
  const config = readJson(path.join(teamDirectory,'config.json'));
  const teamManifest = readJson(path.join(teamDirectory,'manifest.v2.json'));
  for (const record of [config,teamManifest]) {
    requireIdentity(matches(record.name,/^[a-z0-9][a-z0-9-]{0,29}$/) && record.name === internalName && absolutePath(record.leader_cwd) && record.leader_cwd === root && absolutePath(record.team_state_root) && record.team_state_root === stateRoot, 'Exact Team name/cwd/root required');
    requireIdentity(sessionId(record.tmux_session_id) && record.tmux_session_id === manifest.session && matches(record.tmux_session,/^[^\s:]+:[0-9]+$/) && positiveDecimal(record.tmux_session_created), 'Complete Team session identity required');
    requireIdentity(paneId(record.leader_pane_id) && record.leader_pane_id === manifest.leader_pane_id && positiveInteger(record.leader_pane_pid) && matches(record.tmux_pane_owner_id,/^[A-Za-z0-9_.:-]{1,200}$/), 'Complete Leader pane/PID/owner required');
    requireIdentity(matches(record.created_at,/^\d{4}-\d{2}-\d{2}T/) && Number.isFinite(Date.parse(record.created_at)), 'Team creation timestamp required');
    requireIdentity(record.hud_pane_id === null && record.hud_pane_pid === null || paneId(record.hud_pane_id) && positiveInteger(record.hud_pane_pid), 'Complete HUD identity required');
    requireIdentity(Array.isArray(record.workers) && record.workers.length > 0 && record.workers.length <= 32 && record.worker_count === record.workers.length, 'Configured workers required');
    for (const worker of record.workers) requireIdentity(worker && matches(worker.name,/^[a-z0-9][a-z0-9-]{0,63}$/) && paneId(worker.pane_id) && positiveInteger(worker.pid) && positiveInteger(worker.index) && typeof worker.role === 'string' && worker.role.trim() && absolutePath(worker.worktree_path), 'Complete worker identity required');
  }
  const keys = identityFields;
  requireThat(teamManifest.schema_version === 2 && teamManifest.leader?.worker_id === 'leader-fixed', 'Unsupported Team manifest');
  for (const key of keys) requireThat(JSON.stringify(config[key]) === JSON.stringify(teamManifest[key]), `Paired Team identity mismatch: ${key}`);
  requireThat(config.name === internalName && /^[a-z0-9][a-z0-9-]{0,29}$/.test(config.name) && config.leader_cwd === root && config.team_state_root === stateRoot && config.leader_pane_id === manifest.leader_pane_id && config.tmux_session_id === manifest.session && typeof config.created_at === 'string' && config.created_at && typeof config.tmux_session === 'string' && config.tmux_session && typeof config.tmux_pane_owner_id === 'string' && config.tmux_pane_owner_id, 'Unproven Team identity');
  requireThat(Array.isArray(config.workers) && config.workers.length > 0 && config.workers.length <= 32 && config.worker_count === config.workers.length, 'Unsupported worker configuration');
  const workerKeys = workerIdentityFields;
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
  try {
    requireIdentity(equal(binding.identity,identity) && binding.created_at === config.created_at && binding.display_name === config.display_name && binding.requested_name === config.requested_name && binding.leader_pane_pid === config.leader_pane_pid && binding.owner_id === config.tmux_pane_owner_id && equal(binding.leader,teamManifest.leader), 'Bound immutable Team identity changed');
  } catch (error) { error.binding_unverified = true; throw error; }
  if (context.frozen ?? manifest.team_identity) requireThat(equal(identity,context.frozen ?? manifest.team_identity), 'Frozen Team identity changed');
  const paneIds = [manifest.leader_pane_id,...workers.map(worker => worker.pane_id)];
  requireThat(new Set(paneIds).size === paneIds.length, 'Duplicate owned panes');
  assertExactIdentity({...manifest,pane_ids:paneIds},true);
  for (const [pane,pid] of [[config.leader_pane_id,config.leader_pane_pid],...workers.map(worker => [worker.pane_id,worker.pid])]) {
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
  requireThat(events.every(event => event.team === context.internalName && typeof event.event_id === 'string'), 'Event identity mismatch');
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
function teamCommand(context,args,timeout = commandTimeout) {
  teamSnapshot(context);
  requireIdentity(equal(readJson(context.file),context.original), 'Run manifest changed before OMX call');
  try { return run('omx',args,{timeout,env:{...process.env,OMX_TEAM_STATE_ROOT:context.stateRoot}}); }
  finally {
    teamSnapshot(context);
    requireIdentity(equal(readJson(context.file),context.original), 'Run manifest changed after OMX call');
  }
}
function api(context,operation,input) {
  const envelope = JSON.parse(teamCommand(context,['team','api',operation,'--input',JSON.stringify(input),'--json']));
  requireThat(envelope.schema_version === '1.0' && envelope.command === `omx team api ${operation}` && typeof envelope.timestamp === 'string' && Number.isFinite(Date.parse(envelope.timestamp)) && envelope.ok === true && envelope.operation === operation && envelope.data && typeof envelope.data === 'object' && !Array.isArray(envelope.data), 'Unsupported or unsuccessful OMX API envelope');
  return envelope.data;
}
function steer(context,options) {
  const messageId = `${context.manifest.team}-${process.pid}-${randomUUID()}`;
  const ackPath = path.join(context.directory,`steer-${messageId}.json`);
  requireThat(pathAbsent(ackPath), 'Steering ACK collision');
  const expected = {team:context.internalName,message_id:messageId,leader_pane_id:context.manifest.leader_pane_id,context_digest:context.manifest.context_digest};
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
    const data = api(context,'send-message',{team_name:context.internalName,from_worker:'supervisor',to_worker:'leader-fixed',body});
    requireThat(data.dispatch?.ok === true && typeof data.message?.message_id === 'string', 'OMX dispatch not confirmed');
    requireThat((data.message.team === undefined || data.message.team === context.internalName) && (data.message.from_worker === undefined || data.message.from_worker === 'supervisor') && (data.message.to_worker === undefined || data.message.to_worker === 'leader-fixed'), 'OMX message identity mismatch');
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
  if (command !== 'status') requireThat(['go_submitted','bound','resumed'].includes(manifest.state), 'Run state does not authorize lifecycle operation');
  const namespace = teamNamespace(context);
  if (command === 'status' && !namespace.length) {
    if (['shutdown_submitting','shutdown_uncertain','finalized','aborted'].includes(manifest.state)) {
      assertSupervisor(manifest);
      return {mode:'passive',status:manifest.state,run:manifest,team_identity:manifest.team_identity ?? null,phase:null,tasks:[],workers:[],latest_wakeable_event:null,gaps:['Terminal/uncertain shutdown evidence requires independent review']};
    }
    requireThat(['go_submitting','go_submitted'].includes(manifest.state), 'Team state absent');
    assertExactIdentity(manifest);
    return {mode:'passive',status:'awaiting-team',run:manifest,team_identity:null,phase:null,tasks:[],workers:[],latest_wakeable_event:null,gaps:['Team startup not verified']};
  }
  if (namespace.length && pathAbsent(path.join(context.directory,'team-bound.json'))) {
    if (command !== 'status') { const error = new Error('Same proven Leader must publish team-bound.json'); error.code = 'TEAM_UNBOUND'; throw error; }
    return unboundStatus(context,namespace[0],'Binding absent');
  }
  let snapshot;
  try { snapshot = teamSnapshot(context); }
  catch (error) {
    if (command === 'status' && error.binding_unverified) return unboundStatus(context,namespace[0],error.message);
    throw error;
  }
  const state = records(context);
  teamSnapshot(context);
  if (command === 'status') return {mode:'passive',status:['shutdown_submitting','shutdown_uncertain'].includes(manifest.state) ? manifest.state : 'bound',run:manifest,binding_digest:context.bindingDigest,team_identity:{...snapshot.identity,config:snapshot.config,manifest:snapshot.manifest},...state,gaps:['Passive file snapshot is not atomic and does not prove runtime health or successful verification']};
  if (command === 'await') {
    commandTimeout = options['timeout-ms']+5000;
    const data = api(context,'await-event',{team_name:context.internalName,after_event_id:options['after-event-id'] ?? state.latest_wakeable_event?.event_id ?? '',timeout_ms:options['timeout-ms'],poll_ms:100,wakeable_only:true});
    requireThat(['timeout','event'].includes(data.status) && typeof data.cursor === 'string' && (data.status === 'timeout' ? data.event === null : data.event?.team === context.internalName && data.event.event_id === data.cursor && wakeable.has(data.event.type)), 'Invalid event wait result');
    teamSnapshot(context);
    return data;
  }
  manifest.team_identity = context.frozen;
  manifest.binding_digest = context.bindingDigest;
  manifest.binding_state = 'accepted';
  manifest.internal_name = context.internalName;
  manifest.state = 'bound';
  manifest.team_started_verified = true;
  saveRun(context);
  if (command === 'steer') return steer(context,options);
  if (command === 'resume') {
    teamSnapshot(context);
    const output = teamCommand(context,['team','resume',context.internalName]);
    requireThat(output.split(/\r?\n/)[0] === `Team started: ${context.internalName}`, 'Unverified resume result');
    teamSnapshot(context);
    manifest.state = 'resumed';
    manifest.resume_evidence = {output,at:new Date().toISOString(),worker_resurrection_verified:false};
    saveRun(context);
    return manifest.resume_evidence;
  }
  if (command === 'finalize') {
    requireThat(state.tasks.every(task => task.status === 'completed'), 'Every task must be completed');
    const proof = readJson(path.join(context.directory,'leader-final.json'));
    requireThat(proof.team === context.internalName && proof.context_digest === manifest.context_digest && Array.isArray(proof.verification) && proof.verification.length > 0 && proof.verification.every(item => typeof item.command === 'string' && item.command.trim() && item.result === 'pass' && item.exit_code === 0), 'Aggregate verification evidence incomplete');
    requireThat(typeof proof.handoff_path === 'string' && path.isAbsolute(proof.handoff_path) && inside(root,proof.handoff_path), 'Final handoff outside project');
    const handoff = readBounded(proof.handoff_path);
    requireThat(digest(handoff) === proof.handoff_digest, 'Final handoff digest mismatch');
    freezeEvidence(path.join(context.directory,'final-handoff.md'),handoff);
    freezeEvidence(path.join(context.directory,'final-evidence.json'),JSON.stringify(proof,null,2)+'\n');
    teamSnapshot(context);
    requireThat(records(context).tasks.every(task => task.status === 'completed'), 'Tasks changed before shutdown');
  }
  teamSnapshot(context);
  manifest.state = 'shutdown_submitting';
  saveRun(context);
  try {
    teamSnapshot(context);
    const output = run('omx',['team','shutdown',context.internalName,...(command === 'abort' ? ['--force','--confirm-issues'] : [])],{timeout:60000,env:{...process.env,OMX_TEAM_STATE_ROOT:context.stateRoot}});
    requireThat(hasExactOutputLine(output,`Team shutdown complete: ${context.internalName}`), 'Unverified shutdown result');
    requireIdentity(equal(readJson(context.file),context.original), 'Run changed during shutdown');
    assertStateRoot(manifest);
    readBinding(context,context.internalName);
    requireThat(teamNamespace(context).length === 0 && pathAbsent(context.teamDirectory), 'Shutdown did not remove exact Team directory');
    const remaining = panes(manifest.session);
    requireThat(!context.frozen.workers.some(worker => remaining.some(pane => pane.pane_id === worker.pane_id)), 'Shutdown left frozen Worker panes live');
    assertSupervisor(manifest);
    manifest.state = command === 'abort' ? 'aborted' : 'finalized';
    manifest.shutdown_evidence = {output,at:new Date().toISOString(),forced:command === 'abort',official_review:'pending'};
    saveRun(context);
    return {state:manifest.state,...manifest.shutdown_evidence};
  } catch (error) {
    manifest.state = 'shutdown_uncertain';
    manifest.shutdown_diagnostic = redact(error.message).slice(-2000);
    saveRun(context);
    throw error;
  }
}
try {
  const {command,options} = parseArgs();
  stage = command === 'start' ? 'preflight' : command;
  const root = rootDirectory(command !== 'start');
  let evidence;
  if (command === 'start') evidence = start(root,options);
  else if (command === 'inspect') evidence = inspect(root,options);
  else evidence = lifecycle(root,command,options);
  emit(true,command,evidence);
} catch (error) { emit(false,undefined,{error:redact(error.message),code:error.code ?? 'BRIDGE_ERROR',stage:error.stage ?? stage,...(error.command_evidence ? {command_evidence:error.command_evidence}:{}),...(error.cleanup_diagnostics ? {cleanup_diagnostics:error.cleanup_diagnostics}:{})}); }
