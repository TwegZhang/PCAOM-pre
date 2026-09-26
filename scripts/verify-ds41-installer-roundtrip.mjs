import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let source = fileURLToPath(new URL('../templates/codex-omx-ds41-supervised-team/', import.meta.url));
let python = 'python3.12';
let temporaryParent;
const prefix = 'pcaom-ds41-roundtrip-';
let temporary;
let identity;
let phase = 'arguments';
let check = 'options';
let failure;
let cleanupFailure;

function diagnostic(error) {
  if (error.safeDiagnostic) return { phase, check, ...error.safeDiagnostic };
  let cause = 'validation_failed';
  if (error instanceof SyntaxError) cause = 'invalid_json';
  else if (typeof error.code === 'string' && error.code !== 'ERR_ASSERTION') cause = 'filesystem';
  return { phase, check, cause };
}

function execute(executable, args, env = process.env, pythonValidation = false) {
  try {
    return execFileSync(executable, args, { encoding: 'utf8', env,
      stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
  } catch (error) {
    let detail;
    if (error.code === 'ENOENT') {
      detail = { cause: 'subprocess_not_found', code: 'ENOENT' };
      if (Number.isInteger(error.errno)) detail.errno = error.errno;
    } else if (pythonValidation && [20, 21, 22].includes(error.status)) {
      check = { 20: 'toml', 21: 'model', 22: 'catalog-path' }[error.status];
      detail = { cause: 'validation_failed' };
    } else {
      detail = { cause: 'subprocess_exit' };
      if (Number.isInteger(error.status)) detail.status = error.status;
      const signal = os.constants.signals[error.signal];
      if (Number.isInteger(signal)) detail.signal = signal;
    }
    const safe = new Error('Subprocess failed');
    safe.safeDiagnostic = detail;
    throw safe;
  }
}

function snapshot(root) {
  const entries = {};
  function visit(directory, relative = '') {
    for (const name of fs.readdirSync(directory).sort()) {
      const key = path.join(relative, name);
      const absolute = path.join(directory, name);
      const stat = fs.lstatSync(absolute);
      assert.ok(stat.isFile() || stat.isDirectory(), 'Unexpected filesystem entry');
      entries[key] = stat.isDirectory() ? null : createHash('sha256').update(fs.readFileSync(absolute)).digest('hex');
      if (stat.isDirectory()) visit(absolute, key);
    }
  }
  visit(root);
  return entries;
}

function files(tree) {
  return Object.fromEntries(Object.entries(tree).filter(([, digest]) => digest !== null));
}

try {
  const options = new Set();
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 2) {
    const option = args[index];
    const value = args[index + 1];
    assert.ok(['--bundle', '--python'].includes(option) && !options.has(option));
    assert.ok(typeof value === 'string' && value.length > 0 && !/[\x00-\x1f\x7f]/.test(value));
    options.add(option);
    if (option === '--bundle') {
      assert.ok(path.isAbsolute(value));
      source = value;
    } else {
      assert.ok(path.isAbsolute(value) || /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value));
      python = value;
    }
  }
  phase = 'setup';
  check = 'temporary-root';
  temporaryParent = fs.realpathSync(os.tmpdir());
  temporary = fs.mkdtempSync(path.join(temporaryParent, prefix));
  identity = fs.lstatSync(temporary);
  const bundle = path.join(temporary, 'bundle copy');
  const project = path.join(temporary, 'project root');
  const codexHome = path.join(temporary, 'codex home');
  check = 'bundle-copy';
  const sourceBefore = snapshot(source);
  fs.cpSync(source, bundle, { recursive: true });
  assert.deepEqual(snapshot(bundle), sourceBefore);
  for (const root of [project, codexHome]) {
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'unrelated-sentinel.txt'), 'preserve me\n');
  }
  const before = [snapshot(project), snapshot(codexHome)];
  const roots = { project, codex_home: codexHome };
  check = 'manifest';
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'install-manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 4);
  const expected = manifest.files.map(entry => path.join(roots[entry.scope], entry.destination));
  const receipts = [path.join(project, '.pcaom/installations/codex-omx-ds41-supervised-team.json'),
    path.join(codexHome, 'pcaom-installations/codex-omx-ds41-supervised-team.json')];
  function run(command, dryRun = false) {
    check = 'installer';
    const stdout = execute(process.execPath, [path.join(bundle, 'install.mjs'), command,
      '--project', project, '--codex-home', codexHome, ...(dryRun ? ['--dry-run'] : [])]);
    check = 'installer-result';
    assert.equal(stdout.trim().split('\n').length, 1);
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.operations.length, 4);
    assert.deepEqual(result.operations.map(op => op.destination).sort(), [...expected].sort());
  }
  phase = 'dry-run';
  run('install', true);
  check = 'unchanged';
  assert.deepEqual([snapshot(project), snapshot(codexHome)], before);
  assert.deepEqual(snapshot(bundle), sourceBefore);
  phase = 'install';
  run('install');
  check = 'installed-files';
  const installed = [snapshot(project), snapshot(codexHome)];
  const actual = Object.entries(roots).flatMap(([, root]) => Object.keys(files(snapshot(root))).map(name => path.join(root, name)));
  assert.deepEqual(actual.sort(), [...expected, ...receipts,
    path.join(project, 'unrelated-sentinel.txt'), path.join(codexHome, 'unrelated-sentinel.txt')].sort());
  for (const receipt of receipts) JSON.parse(fs.readFileSync(receipt, 'utf8'));
  check = 'catalog-json';
  const catalog = JSON.parse(fs.readFileSync(path.join(codexHome, 'model-catalogs/pcaom-deepseek-models.json'), 'utf8'));
  assert.deepEqual(snapshot(bundle), sourceBefore);
  phase = 'installed-profile';
  check = 'model';
  assert.deepEqual(catalog.models.map(model => model.slug), ['deepseek-flash']);
  const pythonEnvironment = { ...process.env };
  for (const name of ['PYTHONOPTIMIZE', 'PYTHONPATH', 'PYTHONHOME']) delete pythonEnvironment[name];
  check = 'python';
  execute(python, ['-I', '-c', `import pathlib, sys, tomllib
p = pathlib.Path(sys.argv[1])
try:
    data = tomllib.loads((p / "pcaom-ds41.config.toml").read_text())
except (OSError, ValueError):
    raise SystemExit(20)
if data.get("model") != "deepseek-flash":
    raise SystemExit(21)
if data.get("model_catalog_json") != str(p / "model-catalogs/pcaom-deepseek-models.json"):
    raise SystemExit(22)
`, codexHome], pythonEnvironment, true);
  phase = 'reinstall';
  run('install');
  check = 'identical';
  assert.deepEqual([snapshot(project), snapshot(codexHome)], installed);
  phase = 'uninstall';
  run('uninstall');
  check = 'exact-removal';
  assert.deepEqual([files(snapshot(project)), files(snapshot(codexHome))], before.map(files));
  assert.deepEqual(snapshot(bundle), sourceBefore);
  assert.deepEqual(snapshot(source), sourceBefore);
} catch (error) {
  failure = diagnostic(error);
} finally {
  if (temporary) {
    try {
      assert.equal(path.dirname(temporary), temporaryParent);
      assert.match(path.basename(temporary), /^pcaom-ds41-roundtrip-[A-Za-z0-9]{6}$/);
      const current = fs.lstatSync(temporary);
      assert.ok(current.isDirectory() && !current.isSymbolicLink());
      assert.equal(current.dev, identity.dev);
      assert.equal(current.ino, identity.ino);
      fs.rmSync(temporary, { recursive: true });
      assert.equal(fs.existsSync(temporary), false);
    } catch {
      cleanupFailure = { phase: 'cleanup', check: 'exact-temporary-root', cause: 'cleanup_failed' };
    }
  }
}

if (failure || cleanupFailure) {
  process.stderr.write(`${JSON.stringify({ ok: false, ...(failure ? { failure } : {}),
    ...(cleanupFailure ? { cleanup_failure: cleanupFailure } : {}) })}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, installer_invocations: 4, managed_files: 4,
    receipts: 2, sentinels_preserved: 2, dry_run_unchanged: true, reinstall_identical: true,
    installed_json_toml: true, bundle_unchanged: true, exact_uninstall: true, temporary_removed: true })}\n`);
}
