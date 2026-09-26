import { lstatSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { createHash, randomUUID } from "node:crypto";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const OWNER = "pcaom:codex-omx-ds41-supervised-team";
const MARKER = "__PCAOM_MODEL_CATALOG_PATH__";

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
  const catalog = resolve(options.codexHome, "model-catalogs/pcaom-deepseek-models.json");
  // The marker is inside a TOML basic string; JSON string escaping also covers path characters here.
  return Buffer.from(text.replace(MARKER, () => JSON.stringify(catalog).slice(1, -1)));
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
    const bytes = renderSource(sourcePath, options);
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
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function atomicWrite(destination, bytes) {
  mkdirSync(dirname(destination), { recursive: true });
  const temporary = `${destination}.pcaom-${randomUUID()}.tmp`;
  try {
    writeFileSync(temporary, bytes, { mode: 0o600, flag: "wx" });
    renameSync(temporary, destination);
  } finally {
    try {
      unlinkSync(temporary);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
}

const written = [];
try {
  const options = parseArgs(process.argv.slice(2));
  const bundleRoot = realpathSync(dirname(fileURLToPath(import.meta.url)));
  const manifest = readManifest(bundleRoot);
  const operations = prepareOperations(bundleRoot, manifest, options);
  requireValid(options.command === "install", "Uninstall is not yet supported");
  if (!options.dryRun) {
    for (const operation of operations) {
      atomicWrite(operation.destination, operation.bytes);
      written.push(operation.destination);
      const actual = readFileSync(operation.destination);
      requireValid(actual.equals(operation.bytes) && sha256(actual) === operation.digest, "Installed content verification failed");
    }
  }
  process.stdout.write(`${JSON.stringify({ ok: true, command: options.command, dryRun: options.dryRun,
    operations: operations.map(({ bytes, ...operation }) => operation) })}\n`);
} catch (error) {
  // OS and JSON parser messages can contain user content; emit only fixed diagnostics or codes.
  const reason = error.code || (error instanceof SyntaxError ? "Invalid manifest JSON" : error.message);
  process.stderr.write(`${JSON.stringify({ ok: false, error: written.length ? "partial-install" : "validation-or-install-failed",
    reason, written })}\n`);
  process.exitCode = 1;
}
