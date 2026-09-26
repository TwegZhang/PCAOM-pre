#!/usr/bin/env node
// Experimental one-shot bridge; fake CLI tests are not runtime capability evidence.
// Pane identity/liveness precedes handoff; the prompt requests the nonce reply.
// No unrelated active-Team discovery is asserted. Pinned OMX status invokes
// activity recording/monitoring, and read-config may migrate state; neither is
// a read-only preflight. Only filesystem collision evidence is consulted here.
import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const secret = process.env.DEEPSEEK_API_KEY;
const redact = value => secret ? String(value).split(secret).join('[REDACTED]') : String(value);
const digest = value => createHash('sha256').update(value).digest('hex');
const safeTeam = value => /^[a-z0-9][a-z0-9-]{0,63}$/.test(value);
let deadline;
function requireThat(condition, message) { if (!condition) throw new Error(message); }
function run(program, args, options = {}) {
  const timeout = deadline ? Math.max(1, Math.min(1000, deadline - Date.now())) : 1000;
  const result = spawnSync(program, args, { encoding: 'utf8', timeout, maxBuffer: 65536, ...options });
  const stdout = redact(result.stdout ?? '');
  const stderr = redact(result.stderr ?? '');
  requireThat(result.status === 0, `${program} failed: ${stderr.slice(-2000)} ${stdout.slice(-2000)}`);
  return stdout;
}
function emit(ok, command, evidence) {
  const output = redact(JSON.stringify(ok ? {ok, command, evidence} : {ok, error: evidence}));
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
  return run('tmux', ['list-panes', '-a', '-F', '#{session_id}\t#{window_id}\t#{pane_id}\t#{window_name}\t#{pane_dead}\t#{pane_current_command}']).trim().split('\n').map(line => {
    const [session, window_id, pane_id, name, dead, command, extra] = line.split('\t');
    requireThat(/^\$[0-9]+$/.test(session) && /^@[0-9]+$/.test(window_id) && /^%[0-9]+$/.test(pane_id) && name && /^(0|1)$/.test(dead) && command && extra === undefined, 'Malformed tmux identity');
    return {session, window_id, pane_id, name, dead, command};
  });
}
function assertExactIdentity(manifest) {
  const current = panes();
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
  const profile = readRegular(path.join(process.env.CODEX_HOME, 'pcaom-ds41.config.toml'));
  for (const [key,value] of Object.entries({model:'deepseek-flash',model_provider:'deepseek',wire_api:'responses',env_key:'DEEPSEEK_API_KEY'})) {
    const matches = [...profile.matchAll(new RegExp(`^${key}\\s*=\\s*"([^"\\n]*)"\\s*$`, 'gm'))];
    requireThat(matches.length === 1 && matches[0][1] === value, `Invalid profile ${key}`);
  }
  requireThat(!profile.includes(secret) && !/^\s*(api_key|experimental_bearer_token)\s*=/m.test(profile), 'Profile must reference credentials by env_key only');
  const catalogs = [...profile.matchAll(/^model_catalog_json\s*=\s*("(?:[^"\\]|\\.)*")\s*$/gm)];
  requireThat(catalogs.length === 1, 'Missing resolved catalog');
  const catalogPath = JSON.parse(catalogs[0][1]);
  requireThat(path.isAbsolute(catalogPath), 'Catalog path must be absolute');
  const catalog = JSON.parse(readRegular(catalogPath));
  requireThat(Array.isArray(catalog.models) && catalog.models.some(model => model.slug === 'deepseek-flash'), 'Missing deepseek-flash catalog entry');
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
function waitForLeader(manifest, expected) {
  while (Date.now() < deadline) {
    const leader = assertExactIdentity(manifest).find(p => p.pane_id === manifest.leader_pane_id);
    requireThat(leader.dead === '0', 'Leader pane exited');
    const output = capture(manifest.leader_pane_id);
    requireThat(!/^(?:fatal\b|error:|error loading|failed to (?:start|load)|.*process exited with code [1-9])/im.test(output), 'Fatal Leader startup output');
    if (path.basename(leader.command) === 'codex' && (expected === undefined || output.split(/\r?\n/).includes(expected))) return;
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, Math.min(50, Math.max(0, deadline-Date.now())));
  }
  throw new Error('Startup timeout or handoff acceptance unverified');
}
function start(root, options) {
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
  const manifest = {schema_version:1,team,project_root:root,session:supervisor[0].session,supervisor_window_id:supervisor[0].window_id,supervisor_pane_id:supervisor[0].pane_id,profile:'pcaom-ds41',spec_path:specPath,spec_digest:specDigest,context_path:contextPath,context_digest:digest(context),state:'starting'};
  let published = false;
  try {
    const result = run('tmux',['new-window','-d','-t',manifest.session,'-n',windowName,'-c',root,'-e','OMX_TEAM_WORKER_CLI=codex','-e','OMX_TEAM_WORKER_LAUNCH_ARGS=--profile pcaom-ds41','-P','-F','#{session_id}\t#{window_id}\t#{pane_id}','codex --profile pcaom-ds41'], {env:{...process.env,OMX_TEAM_WORKER_CLI:'codex',OMX_TEAM_WORKER_LAUNCH_ARGS:'--profile pcaom-ds41'}}).trim().split('\t');
    requireThat(result.length === 3 && result[0] === manifest.session && /^@[0-9]+$/.test(result[1]) && /^%[0-9]+$/.test(result[2]) && !live.some(p => p.window_id === result[1] || p.pane_id === result[2]), 'Invalid newly created identity');
    manifest.window_id = result[1]; manifest.leader_pane_id = result[2]; manifest.pane_ids = [result[2]];
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n'); published = true;
    deadline = Date.now()+options['startup-timeout-ms'];
    waitForLeader(manifest);
    const id = randomUUID();
    const buffer = `pcaom-${team}-${id}`;
    const handoff = `Read the approved context at ${contextPath} (SHA256 ${manifest.context_digest}). Own Ultragoal and explicitly start OMX Team ${team} with ${options.workers} workers. Preserve scope, constraints and verification commands. Do not delegate competing orchestration. After accepting this instruction, print this exact line: PCAOM_ACCEPTED:${id}`;
    run('tmux',['set-buffer','-b',buffer,'--',handoff]);
    requireThat(run('tmux',['show-buffer','-b',buffer]) === handoff, 'Named buffer read-back mismatch');
    assertExactIdentity(manifest);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'C-u']);
    run('tmux',['paste-buffer','-t',manifest.leader_pane_id,'-b',buffer,'-p','-d']);
    run('tmux',['send-keys','-t',manifest.leader_pane_id,'Enter']);
    waitForLeader(manifest,`PCAOM_ACCEPTED:${id}`);
    return manifest;
  } catch (error) {
    deadline = undefined;
    manifest.state = 'failed'; manifest.diagnostic = redact(error.message).slice(-2000);
    if (published) {
      const recorded = JSON.parse(readRegular(manifestPath));
      requireThat(recorded.window_id === manifest.window_id && recorded.leader_pane_id === manifest.leader_pane_id && recorded.session === manifest.session, 'Manifest changed; rollback refused');
      try { assertExactIdentity(recorded); run('tmux',['kill-window','-t',recorded.window_id]); manifest.cleanup = 'killed-owned-window'; }
      catch (cleanupError) { manifest.cleanup = `refused: ${redact(cleanupError.message)}`; }
    }
    atomicWrite(manifestPath,JSON.stringify(manifest,null,2)+'\n',published);
    throw error;
  } finally { deadline = undefined; }
}
function inspect(root, options) {
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
} catch (error) { emit(false,undefined,redact(error.message)); }
