import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const source = fileURLToPath(new URL('../templates/codex-omx-ds41-supervised-team/', import.meta.url));
let temporaryParent;
const prefix = 'pcaom-ds41-roundtrip-';
let temporary;
let identity;
let phase = 'setup';
let failure;

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
  temporaryParent = fs.realpathSync(os.tmpdir());
  temporary = fs.mkdtempSync(path.join(temporaryParent, prefix));
  identity = fs.lstatSync(temporary);
  const bundle = path.join(temporary, 'bundle copy');
  const project = path.join(temporary, 'project root');
  const codexHome = path.join(temporary, 'codex home');
  const sourceBefore = snapshot(source);
  fs.cpSync(source, bundle, { recursive: true });
  assert.deepEqual(snapshot(bundle), sourceBefore);
  for (const root of [project, codexHome]) {
    fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'unrelated-sentinel.txt'), 'preserve me\n');
  }
  const before = [snapshot(project), snapshot(codexHome)];
  const roots = { project, codex_home: codexHome };
  const manifest = JSON.parse(fs.readFileSync(path.join(bundle, 'install-manifest.json'), 'utf8'));
  assert.equal(manifest.files.length, 4);
  const expected = manifest.files.map(entry => path.join(roots[entry.scope], entry.destination));
  const receipts = [path.join(project, '.pcaom/installations/codex-omx-ds41-supervised-team.json'),
    path.join(codexHome, 'pcaom-installations/codex-omx-ds41-supervised-team.json')];
  function run(command, dryRun = false) {
    const stdout = execFileSync(process.execPath, [path.join(bundle, 'install.mjs'), command,
      '--project', project, '--codex-home', codexHome, ...(dryRun ? ['--dry-run'] : [])],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
    assert.equal(stdout.trim().split('\n').length, 1);
    const result = JSON.parse(stdout);
    assert.equal(result.ok, true);
    assert.equal(result.operations.length, 4);
    assert.deepEqual(result.operations.map(op => op.destination).sort(), [...expected].sort());
  }
  phase = 'dry-run';
  run('install', true);
  assert.deepEqual([snapshot(project), snapshot(codexHome)], before);
  assert.deepEqual(snapshot(bundle), sourceBefore);
  phase = 'install';
  run('install');
  const installed = [snapshot(project), snapshot(codexHome)];
  const actual = Object.entries(roots).flatMap(([, root]) => Object.keys(files(snapshot(root))).map(name => path.join(root, name)));
  assert.deepEqual(actual.sort(), [...expected, ...receipts,
    path.join(project, 'unrelated-sentinel.txt'), path.join(codexHome, 'unrelated-sentinel.txt')].sort());
  for (const receipt of receipts) JSON.parse(fs.readFileSync(receipt, 'utf8'));
  JSON.parse(fs.readFileSync(path.join(codexHome, 'model-catalogs/pcaom-deepseek-models.json'), 'utf8'));
  assert.deepEqual(snapshot(bundle), sourceBefore);
  phase = 'installed-profile';
  execFileSync('python3.12', ['-c',
    'import pathlib,sys,tomllib; p=pathlib.Path(sys.argv[1]); d=tomllib.loads((p/"pcaom-ds41.config.toml").read_text()); assert d["model"]=="deepseek-flash"; assert d["model_catalog_json"]==str(p/"model-catalogs/pcaom-deepseek-models.json")',
    codexHome], { stdio: ['ignore', 'pipe', 'pipe'], timeout: 30000 });
  phase = 'reinstall';
  run('install');
  assert.deepEqual([snapshot(project), snapshot(codexHome)], installed);
  phase = 'uninstall';
  run('uninstall');
  assert.deepEqual([files(snapshot(project)), files(snapshot(codexHome))], before.map(files));
  assert.deepEqual(snapshot(bundle), sourceBefore);
  assert.deepEqual(snapshot(source), sourceBefore);
} catch {
  failure = { ok: false, phase, error: 'Verification failed; no subprocess output or environment values emitted.' };
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
      failure = { ok: false, phase: 'cleanup', error: 'Exact temporary-directory cleanup failed or identity changed.' };
    }
  }
}

if (failure) {
  process.stderr.write(`${JSON.stringify(failure)}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`${JSON.stringify({ ok: true, installer_invocations: 4, managed_files: 4,
    receipts: 2, sentinels_preserved: 2, dry_run_unchanged: true, reinstall_identical: true,
    installed_json_toml: true, bundle_unchanged: true, exact_uninstall: true, temporary_removed: true })}\n`);
}
