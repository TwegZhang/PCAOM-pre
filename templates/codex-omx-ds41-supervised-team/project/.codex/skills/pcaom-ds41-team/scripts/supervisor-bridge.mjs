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
let stage = 'arguments';
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function run(program, args, options = {}) {
  const {privateOutput = false, ...spawnOptions} = options;
  const timeout = deadline ? Math.max(1, Math.min(1000, deadline - Date.now())) : 1000;
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
  const allowed = {start: ['spec', 'workers', 'team', 'startup-timeout-ms'], inspect: ['team', 'pane', 'lines']}[command];
  requireThat(allowed, 'Unknown command; supported: start, inspect');
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
  } else {
    requireThat(options.team && /^(leader|%[0-9]+)$/.test(options.pane ?? ''), 'inspect requires exact --team and --pane');
    integer('lines', 100, 1000);
  }
  if (options.team) requireThat(safeTeam(options.team), 'Unsafe team name');
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
function panes() {
  return run('tmux', ['list-panes', '-a', '-F', '#{session_id}\t#{window_id}\t#{pane_id}\t#{window_name}\t#{pane_dead}\t#{pane_current_command}\t#{socket_path}\t#{pid}\t#{start_time}']).trim().split('\n').map(line => {
    const [session, window_id, pane_id, name, dead, command, socket_path, pid, start_time, extra] = line.split('\t');
    requireThat(/^\$[0-9]+$/.test(session) && /^@[0-9]+$/.test(window_id) && /^%[0-9]+$/.test(pane_id) && name && /^(0|1)$/.test(dead) && command && path.isAbsolute(socket_path ?? '') && /^[1-9][0-9]*$/.test(pid) && /^[1-9][0-9]*$/.test(start_time) && extra === undefined, 'Malformed tmux identity');
    return {session, window_id, pane_id, name, dead, command, server:{socket_path,pid,start_time}};
  });
}
function assertExactIdentity(manifest) {
  const current = panes();
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
  const current = panes();
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
    try {
      assertSupervisor(manifest);
      // The initial setter may have failed or timed out; establish the exact
      // allowlist again before any restoration attach can import environment.
      run('tmux',['set-option','-t',manifest.session,'update-environment',names.join(' ')]);
      const restoredEnv = {...process.env};
      for (const name of names) {
        delete restoredEnv[name];
        if (previous.get(name)?.value !== undefined) restoredEnv[name] = previous.get(name).value;
      }
      run('tmux',['-C','attach-session','-t',manifest.session],{input:'detach-client\n',env:restoredEnv});
      for (const name of names) {
        if (!previous.has(name)) run('tmux',['set-environment','-u','-t',manifest.session,name]);
        else if (previous.get(name).removed) run('tmux',['set-environment','-r','-t',manifest.session,name]);
      }
      run('tmux',['set-option','-u','-t',manifest.session,'update-environment']);
      for (const entry of entries) run('tmux',['set-option','-t',manifest.session,`update-environment[${entry[1]}]`,entry[2]]);
      const restored = readEnvironment();
      requireThat(names.every(name => JSON.stringify(restored.get(name)) === JSON.stringify(previous.get(name))), 'Session environment restoration not verified');
    } catch (error) {
      if (primary) primary.message += `; environment restoration failed: ${redact(error.message)}`;
      else primary = new Error(`Environment restoration failed: ${redact(error.message)}`);
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
  let buffer;
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
    buffer = `pcaom-${team}-${id}`;
    const acknowledgmentPath = path.join(directory,'leader-accepted.json');
    requireThat(pathAbsent(acknowledgmentPath), 'Acknowledgment path already exists');
    const acknowledgment = {schema_version:1,team,handoff_id:id,leader_pane_id:manifest.leader_pane_id};
    const handoff = `Read the approved context at ${contextPath} (SHA256 ${manifest.context_digest}). Before fan-out or work, atomically create the following acknowledgment as an exclusive regular file (write a temporary file and link it without replacement), then remove the temporary file. Do not overwrite an existing acknowledgment.\nAcknowledgment path: ${JSON.stringify(acknowledgmentPath)}\nAcknowledgment JSON: ${JSON.stringify(acknowledgment)}\nThen own Ultragoal and explicitly start OMX Team ${team} with ${options.workers} workers. Preserve scope, constraints and verification commands. Do not delegate competing orchestration.`;
    run('tmux',['set-buffer','-b',buffer,'--',handoff]);
    requireThat(run('tmux',['show-buffer','-b',buffer]) === handoff, 'Named buffer read-back mismatch');
    assertExactIdentity(manifest);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'C-u']);
    run('tmux',['paste-buffer','-t',manifest.leader_pane_id,'-b',buffer,'-p','-d']);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'Enter']);
    stage = 'acceptance';
    waitForAcknowledgment(manifest,acknowledgmentPath,acknowledgment);
    manifest.state = 'accepted'; manifest.handoff_id = id;
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',true);
    return manifest;
  } catch (error) {
    primary = error;
    error.stage = stage;
    deadline = undefined;
    manifest.state = 'failed'; manifest.failure_stage = stage; manifest.diagnostic = redact(error.message).slice(-2000);
    if (published) {
      const recorded = JSON.parse(readRegular(manifestPath));
      requireThat(recorded.window_id === manifest.window_id && recorded.leader_pane_id === manifest.leader_pane_id && recorded.session === manifest.session, 'Manifest changed; rollback refused');
      try { assertExactIdentity(recorded); run('tmux',['kill-window','-t',recorded.window_id]); manifest.cleanup = 'killed-owned-window'; }
      catch (cleanupError) { manifest.cleanup = `refused: ${redact(cleanupError.message)}`; }
    }
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',published);
    throw error;
  } finally {
    deadline = undefined;
    if (buffer) {
      try {
        assertSupervisor(manifest);
        try { run('tmux',['delete-buffer','-b',buffer]); }
        catch (error) { if (!/no buffer|unknown buffer|buffer not found/i.test(error.message)) throw error; }
      } catch (error) {
        const diagnostic = `Named buffer cleanup failed: ${redact(error.message)}`;
        if (primary) primary.message += '; '+diagnostic;
        else throw new Error(diagnostic);
      }
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
try {
  const {command,options} = parseArgs();
  const root = rootDirectory();
  emit(true,command,command === 'start' ? start(root,options) : inspect(root,options));
} catch (error) { emit(false,undefined,{error:redact(error.message),code:error.code ?? 'BRIDGE_ERROR',stage:error.stage ?? stage}); }
