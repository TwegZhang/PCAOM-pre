import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, rmdirSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "pcaom:codex-omx-ds41-supervised-team";
const MARKER = "__PCAOM_MODEL_CATALOG_PATH__";
const PROJECT_MARKER = "__PCAOM_PROJECT_PATH__";

function requireValid(condition, message) {
  if (!condition) throw new Error(message);
}

function canonicalRoot(value) {
  requireValid(typeof value === "string" && isAbsolute(value), "Roots must be absolute paths");
  const root = realpathSync(value);
  requireValid(statSync(root).isDirectory(), "Roots must be existing directories");
  return root;
}

function parseArgs(argv) {
  const [command, ...args] = argv;
  requireValid(command === "install" || command === "uninstall", "Unsupported command");
  const options = { command, dryRun: false, projectRoot: undefined, codexHome: undefined };
  const seen = new Set();
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    requireValid(["--dry-run", "--project", "--codex-home"].includes(flag), "Unknown argument");
    requireValid(!seen.has(flag), "Repeated argument");
    seen.add(flag);
    if (flag === "--dry-run") options.dryRun = true;
    else {
      const value = args[++index];
      requireValid(typeof value === "string" && !value.startsWith("--"), "Missing argument value");
      options[flag === "--project" ? "projectRoot" : "codexHome"] = value;
    }
  }
  options.projectRoot = canonicalRoot(options.projectRoot);
  options.codexHome = canonicalRoot(options.codexHome);
  return options;
}

function withinRoot(root, target) {
  const suffix = relative(root, target);
  return suffix !== "" && suffix !== ".." && !suffix.startsWith(`..${sep}`) && !isAbsolute(suffix);
}

function scopedPath(root, name) {
  requireValid(typeof name === "string" && name.length > 0 && !isAbsolute(name), "Invalid manifest path");
  const target = resolve(root, name);
  requireValid(withinRoot(root, target), "Manifest path escapes its root");
  return target;
}

function readManifest(bundleRoot) {
  const manifest = JSON.parse(readFileSync(resolve(bundleRoot, "install-manifest.json"), "utf8"));
  requireValid(manifest?.schema_version === 0, "Unsupported manifest schema");
  requireValid(manifest.owner === OWNER, "Unsupported manifest owner");
  requireValid(Array.isArray(manifest.files) && manifest.files.length > 0, "Invalid manifest files");
  for (const file of manifest.files) {
    requireValid(file !== null && typeof file === "object" && !Array.isArray(file), "Invalid file record");
    requireValid(typeof file.source === "string" && typeof file.destination === "string", "Invalid file paths");
    requireValid(file.scope === "project" || file.scope === "codex_home", "Unsupported scope");
  }
  return manifest;
}

function destinationRoot(scope, options) {
  if (scope === "project") return options.projectRoot;
  if (scope === "codex_home") return options.codexHome;
  throw new Error("Unsupported scope");
}

function validateDestination(root, destination) {
  let current = root;
  for (const part of relative(root, destination).split(sep)) {
    current = resolve(current, part);
    let stats;
    try {
      stats = lstatSync(current);
    } catch (error) {
      if (error.code === "ENOENT") break;
      throw error;
    }
    requireValid(!stats.isSymbolicLink(), "Destination contains a symlink");
    requireValid(current === destination ? stats.isFile() : stats.isDirectory(), "Invalid destination type");
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function renderSource(sourcePath, options) {
  const bytes = readFileSync(sourcePath);
  if (!sourcePath.endsWith("pcaom-ds41.config.toml")) return bytes;
  const text = bytes.toString("utf8");
  requireValid(text.split(MARKER).length === 2, "Profile must contain exactly one catalog marker");
  requireValid(text.split(PROJECT_MARKER).length === 2, "Profile must contain exactly one project marker");
  const catalog = resolve(options.codexHome, "model-catalogs/pcaom-deepseek-models.json");
  // TOML basic strings also require escaping DEL, which JSON leaves literal.
  const escapedCatalog = JSON.stringify(catalog).slice(1, -1).replaceAll("\u007f", "\\u007f");
  const escapedProject = JSON.stringify(options.projectRoot).slice(1, -1).replaceAll("\u007f", "\\u007f");
  return Buffer.from(text.replace(MARKER, () => escapedCatalog).replace(PROJECT_MARKER, () => escapedProject));
}

function prepareOperations(bundleRoot, manifest, options) {
  const sources = new Set();
  const destinations = new Set();
  const operations = manifest.files.map((file) => {
    const sourcePath = realpathSync(scopedPath(bundleRoot, file.source));
    requireValid(withinRoot(bundleRoot, sourcePath) && statSync(sourcePath).isFile(), "Source must be a file within the bundle");
    const root = destinationRoot(file.scope, options);
    const destination = scopedPath(root, file.destination);
    validateDestination(root, destination);
    requireValid(!sources.has(sourcePath), "Duplicate source");
    requireValid(!destinations.has(destination), "Duplicate destination");
    sources.add(sourcePath);
    destinations.add(destination);
    const bytes = options.command === "install" ? renderSource(sourcePath, options) : Buffer.alloc(0);
    return { scope: file.scope, source: file.source, destination, digest: sha256(bytes), bytes };
  });
  for (const destination of destinations) {
    requireValid(!sources.has(destination), "Destination overlaps a source");
    for (const other of destinations) {
      requireValid(destination === other || !withinRoot(destination, other), "Overlapping destinations");
    }
  }
  return operations.sort((a, b) => {
    const left = `${a.scope}\0${a.destination}`;
    const right = `${b.scope}\0${b.destination}`;
    if (left < right) return -1;
    if (left > right) return 1;
    return 0;
  });
}

function atomicWrite(destination, bytes, mutation) {
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.pcaom-${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, bytes, { mode: 0o600, flag: "wx" });
    if (mutation) {
      const stats = lstatSync(temporary);
      mutation.resultIdentity = `${stats.dev}:${stats.ino}`;
    }
    renameSync(temporary, destination);
  } finally {
    try {
      unlinkSync(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

const NAME = "codex-omx-ds41-supervised-team";
const written = [];
const rollbackProblems = [];
const rollbackConflicts = [];

function existingBytes(root, destination) {
  validateDestination(root, destination);
  try { return readFileSync(destination); }
  catch (error) { if (error.code === "ENOENT") return null; throw error; }
}

function sameBytes(left, right) {
  return left === null ? right === null : right !== null && left.equals(right);
}

function bundleDigest(files) {
  return sha256(JSON.stringify(files));
}

function loadReceipt(receipts, options, files) {
  const [left, right] = receipts.map((op) => {
    op.before = existingBytes(op.root, op.destination);
    return op.before;
  });
  if (left === null && right === null) {
    requireValid(options.command === "install", "Missing ownership receipts");
    return null;
  }
  requireValid(left !== null && right !== null && left.equals(right), "Ownership receipts differ or are missing");
  const receipt = JSON.parse(left);
  requireValid(receipt?.schema_version === 0 && receipt.owner === OWNER &&
    receipt.project_root === options.projectRoot && receipt.codex_home === options.codexHome,
  "Receipt identity mismatch");
  requireValid(Array.isArray(receipt.files) && receipt.files.length === files.length, "Receipt file set mismatch");
  for (let index = 0; index < files.length; index += 1) {
    const record = receipt.files[index];
    requireValid(record && Object.keys(record).sort().join() === "destination,scope,sha256" &&
      record.scope === files[index].scope && record.destination === files[index].destination &&
      typeof record.sha256 === "string" && /^[a-f0-9]{64}$/.test(record.sha256), "Invalid receipt file record");
  }
  requireValid(receipt.bundle_digest === bundleDigest(receipt.files), "Receipt bundle digest mismatch");
  return receipt;
}

// Freeze file bytes and ancestor identities, then recheck them at each mutation.
// This detects replacement between validation and use without granting ownership
// to a lone receipt, a matching filename, or a changed directory.
function transaction(actions, verify) {
  const identities = new Map();
  const snapshots = new Map();
  const createdDirectories = new Map();
  const identity = (path) => {
    try {
      const stats = lstatSync(path);
      requireValid(!stats.isSymbolicLink(), "Operation path contains a symlink");
      return `${stats.dev}:${stats.ino}`;
    } catch (error) { if (error.code === "ENOENT") return null; throw error; }
  };
  for (const action of actions) {
    snapshots.set(action.destination, action.before);
    let path = action.destination;
    while (true) {
      identities.set(path, action.identities.get(path));
      if (path === action.root) break;
      path = dirname(path);
    }
  }
  const revalidate = () => {
    for (const [path, expected] of identities) requireValid(identity(path) === expected, `Identity changed: ${path}`);
    for (const action of actions) requireValid(sameBytes(existingBytes(action.root, action.destination),
      snapshots.get(action.destination)), `Content changed: ${action.destination}`);
  };
  const touched = [];
  const ensureParents = (action) => {
    const paths = [];
    for (let path = dirname(action.destination); path !== action.root; path = dirname(path)) paths.unshift(path);
    requireValid(identity(action.root) === identities.get(action.root), `Identity changed: ${action.root}`);
    for (const path of paths) {
      const expected = identities.get(path);
      requireValid(identity(path) === expected, `Identity changed: ${path}`);
      if (expected !== null) continue;
      // Create one level at a time so ownership is captured for every directory
      // before any later artifact write or fault can change the ancestor chain.
      mkdirSync(path);
      identities.set(path, identity(path));
      createdDirectories.set(path, { root: action.root, identities: new Map(identities) });
    }
  };
  try {
    revalidate();
    for (const action of actions) {
      revalidate();
      if (action.action === "receipt") verify();
      const before = snapshots.get(action.destination);
      if (action.action !== "delete" && sameBytes(before, action.bytes)) continue;
      const mutation = { ...action, before, resultIdentity: null };
      touched.push(mutation);
      if (action.action === "delete") unlinkSync(action.destination);
      else {
        ensureParents(action);
        atomicWrite(action.destination, action.bytes, mutation);
      }
      written.push(action.destination);
      snapshots.set(action.destination, action.action === "delete" ? null : action.bytes);
      identities.set(action.destination, mutation.resultIdentity);
      for (let path = dirname(action.destination); path !== action.root; path = dirname(path)) {
        if (identities.get(path) === null) identities.set(path, identity(path));
      }
      requireValid(sameBytes(existingBytes(action.root, action.destination), snapshots.get(action.destination)),
        `Write verification failed: ${action.destination}`);
    }
    verify();
    if (actions.every((action) => action.action === "delete")) {
      revalidate();
      for (const action of actions) {
        try { removeEmptyParents(action.root, action.destination, identities); }
        finally {
          for (let path = dirname(action.destination); path !== action.root; path = dirname(path)) {
            try { if (identity(path) === null) identities.set(path, null); }
            catch { /* Preserve the original cleanup conflict diagnostic. */ }
          }
        }
      }
    }
  } catch (error) {
    if (error.cleanupConflict) {
      rollbackProblems.push(error.cleanupConflict);
      rollbackConflicts.push(error.cleanupConflict);
    }
    for (const action of touched.reverse()) {
      try {
        validateDestination(action.root, action.destination);
        for (let path = dirname(action.destination); ; path = dirname(path)) {
          const expected = identities.get(path);
          requireValid(expected === null || identity(path) === expected, `Rollback identity changed: ${path}`);
          if (path === action.root) break;
        }
        const current = existingBytes(action.root, action.destination);
        if (sameBytes(current, action.before)) continue;
        const transactionBytes = action.action === "delete" ? null : action.bytes;
        if (!sameBytes(current, transactionBytes) ||
          (current !== null && identity(action.destination) !== action.resultIdentity)) {
          rollbackConflicts.push(action.destination);
          throw new Error("Concurrent change prevents rollback");
        }
        if (action.before === null) {
          if (existingBytes(action.root, action.destination) !== null) unlinkSync(action.destination);
        } else atomicWrite(action.destination, action.before);
      } catch {
        // A filesystem operation can throw after completing its mutation.
        // Judge rollback by the verified final state, not the restore exception.
      }
      try {
        requireValid(sameBytes(existingBytes(action.root, action.destination), action.before), "Rollback verification failed");
      } catch { rollbackProblems.push(action.destination); }
    }
    for (const [path, record] of [...createdDirectories].sort(([a], [b]) => b.length - a.length)) {
      try { removeOwnedDirectory(record.root, path, record.identities); } catch {
        rollbackProblems.push(path);
        rollbackConflicts.push(path);
      }
    }
    throw error;
  }
}

function freezeIdentities(action) {
  action.identities = new Map();
  for (let path = action.destination; ; path = dirname(path)) {
    try {
      const stats = lstatSync(path);
      requireValid(!stats.isSymbolicLink(), "Operation path contains a symlink");
      action.identities.set(path, `${stats.dev}:${stats.ino}`);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
      action.identities.set(path, null);
    }
    if (path === action.root) break;
  }
}

function emit(stream, data) {
  const key = process.env.DEEPSEEK_API_KEY;
  stream.write(`${JSON.stringify(data, (_name, value) =>
    key && typeof value === "string" ? value.split(key).join("[REDACTED]") : value)}\n`);
}

function removeOwnedDirectory(root, path, identities) {
  requireValid(withinRoot(root, path), `Cleanup path escapes root: ${path}`);
  const chain = [root];
  let current = root;
  for (const part of relative(root, path).split(sep)) {
    current = resolve(current, part);
    chain.push(current);
  }
  for (const component of chain) {
    let stats;
    try { stats = lstatSync(component); }
    catch (error) {
      if (error.code === "ENOENT" && component !== root) return false;
      throw error;
    }
    if (stats.isSymbolicLink() || !stats.isDirectory() ||
      `${stats.dev}:${stats.ino}` !== identities.get(component)) {
      throw Object.assign(new Error(`Cleanup identity changed: ${path}`), { cleanupConflict: path });
    }
  }
  try {
    rmdirSync(path);
  } catch (error) {
    if (["ENOENT", "ENOTEMPTY", "EEXIST"].includes(error.code)) return false;
    throw error;
  }
  return true;
}

function removeEmptyParents(root, destination, identities) {
  const skillRoot = resolve(root, ".codex/skills/pcaom-ds41-team");
  if (!withinRoot(skillRoot, destination)) return;
  // Only this bundle's unique Skill subtree is eligible for cleanup. Shared
  // Skill, catalog, and receipt parents belong to the host, even when empty.
  for (let path = dirname(destination); path !== dirname(skillRoot); path = dirname(path)) {
    if (!removeOwnedDirectory(root, path, identities)) break;
  }
}

try {
  const options = parseArgs(process.argv.slice(2));
  const bundleRoot = realpathSync(dirname(fileURLToPath(import.meta.url)));
  const manifest = readManifest(bundleRoot);
  const operations = prepareOperations(bundleRoot, manifest, options);
  const files = operations.map((op) => ({ scope: op.scope,
    destination: relative(destinationRoot(op.scope, options), op.destination), sha256: op.digest }));
  const receipts = [
    { root: options.projectRoot, destination: resolve(options.projectRoot, `.pcaom/installations/${NAME}.json`) },
    { root: options.codexHome, destination: resolve(options.codexHome, `pcaom-installations/${NAME}.json`) },
  ];
  const old = loadReceipt(receipts, options, files);
  for (const [index, operation] of operations.entries()) {
    const bytes = existingBytes(destinationRoot(operation.scope, options), operation.destination);
    const validExisting = old
      ? (options.command === "uninstall" && operation.scope === "project") ||
        (bytes !== null && (sha256(bytes) === old.files[index].sha256 ||
          (options.command === "install" && operation.scope === "project" && sameBytes(bytes, operation.bytes))))
      : operation.scope === "project" ? bytes === null || sameBytes(bytes, operation.bytes) : bytes === null;
    requireValid(validExisting,
      `Unmanaged or modified destination: ${operation.destination}`);
    operation.before = bytes;
    if (options.command === "uninstall" && bytes !== null) operation.digest = sha256(bytes);
  }
  const receiptBytes = Buffer.from(`${JSON.stringify({ schema_version: 0, owner: OWNER,
    project_root: options.projectRoot, codex_home: options.codexHome,
    bundle_digest: bundleDigest(files), files }, null, 2)}\n`);
  const actions = [];
  if (options.command === "install" && old && old.bundle_digest !== bundleDigest(files)) {
    for (const [index, operation] of operations.entries()) {
      if (operation.scope === "project") continue;
      const root = destinationRoot(operation.scope, options);
      const prefix = operation.scope === "project" ? ".pcaom/backups" : "pcaom-backups";
      const destination = scopedPath(root, `${prefix}/${NAME}/${old.bundle_digest}/${files[index].destination}`);
      const bytes = operation.before;
      const backup = existingBytes(root, destination);
      requireValid(backup === null || backup.equals(bytes), `Conflicting backup: ${destination}`);
      actions.push({ action: "backup", root, destination, bytes, before: backup });
    }
  }
  const mutableOperations = options.command === "install"
    ? operations
    : operations.filter((operation) => operation.scope !== "project");
  actions.push(...mutableOperations.map((op) => ({ action: options.command === "install" ? "write" : "delete",
    root: destinationRoot(op.scope, options), destination: op.destination, bytes: op.bytes, before: op.before })));
  actions.push(...receipts.map((op) => ({ ...op, action: options.command === "install" ? "receipt" : "delete", bytes: receiptBytes })));
  const paths = actions.map((op) => op.destination);
  requireValid(new Set(paths).size === paths.length && paths.every((path) => paths.every((other) =>
    path === other || !withinRoot(path, other))), "Overlapping operation paths");
  const verify = () => {
    if (options.command !== "install") return;
    for (const operation of operations) {
      const actual = readFileSync(operation.destination);
      requireValid(actual.equals(operation.bytes) && sha256(actual) === operation.digest, "Installed content verification failed");
      if (operation.destination.endsWith(".json")) JSON.parse(actual);
      if (operation.destination.endsWith("pcaom-ds41.config.toml")) {
        const text = actual.toString("utf8");
        const catalog = JSON.stringify(resolve(options.codexHome, "model-catalogs/pcaom-deepseek-models.json")).replaceAll("\u007f", "\\u007f");
        requireValid(!text.includes(MARKER) && text.includes(`model_catalog_json = ${catalog}`), "Invalid rendered catalog path");
      }
    }
  };
  if (!options.dryRun) {
    actions.forEach(freezeIdentities);
    transaction(actions, verify);
  }
  emit(process.stdout, { ok: true, command: options.command, dryRun: options.dryRun,
    operations: operations.map(({ bytes, before, ...operation }) => operation),
    actions: actions.map(({ action, destination }) => ({ action, destination })) });
} catch (error) {
  // OS and JSON parser messages can contain user content; emit only fixed diagnostics or codes.
  const reason = error.code || (error instanceof SyntaxError ? "Invalid JSON" : error.message);
  emit(process.stderr, { ok: false, error: rollbackProblems.length ? "rollback-failed" : "validation-or-operation-failed",
    reason, written, rollbackProblems, rollbackConflicts });
  process.exitCode = 1;
}
