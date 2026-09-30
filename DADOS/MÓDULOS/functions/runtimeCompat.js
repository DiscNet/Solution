const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function isTermux() {
  const prefix = String(process.env.PREFIX || "");
  return Boolean(
    process.platform === "android" ||
    process.env.TERMUX_VERSION ||
    /com\.termux/i.test(prefix) ||
    /com\.termux/i.test(String(process.execPath || ""))
  );
}

function isAndroidExternalStorage(value) {
  let resolved = path.resolve(String(value || "."));
  try { resolved = fs.realpathSync(resolved); } catch (_) {}
  return /^\/(?:sdcard(?:\/|$)|storage(?:\/|$)|mnt\/media_rw(?:\/|$))/.test(resolved);
}

function writableTempDir(namespace = "solution") {
  const candidates = [
    isTermux() && process.env.PREFIX
      ? path.join(process.env.PREFIX, "tmp")
      : "",
    process.env.TMPDIR,
    os.tmpdir(),
    isTermux() && process.env.HOME ? path.join(process.env.HOME, ".cache") : "",
    path.join(process.cwd(), "temp"),
  ].filter(Boolean);

  for (const base of candidates) {
    if (isTermux() && isAndroidExternalStorage(base)) continue;
    try {
      const dir = path.join(base, namespace);
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.write_${process.pid}_${Date.now()}`);
      fs.writeFileSync(probe, "ok");
      fs.unlinkSync(probe);
      return dir;
    } catch (_) {}
  }

  const error = new Error("Não há uma pasta temporária gravável no armazenamento interno do Termux.");
  error.code = "ERR_TEMP_UNAVAILABLE";
  throw error;
}

function executableCandidates(name) {
  const upper = String(name || "").toUpperCase();
  const envOverride = process.env[`${upper}_PATH`];
  const prefix = String(process.env.PREFIX || "");
  const execDir = process.execPath ? path.dirname(process.execPath) : "";
  const pathDirs = String(process.env.PATH || "")
    .split(path.delimiter)
    .map(item => item.trim())
    .filter(Boolean);

  const candidates = [
    envOverride,
    prefix ? path.join(prefix, "bin", name) : "",
    execDir ? path.join(execDir, name) : "",
    ...pathDirs.map(dir => path.join(dir, name)),
  ].filter(Boolean);

  return [...new Set(candidates)];
}

function resolveExecutable(name) {
  for (const candidate of executableCandidates(name)) {
    try {
      fs.accessSync(candidate, fs.constants.X_OK);
      return candidate;
    } catch (_) {}
  }

  return name;
}

function npmCliPath() {
  const prefix = String(process.env.PREFIX || "");
  const candidates = [
    process.env.npm_execpath,
    prefix ? path.join(prefix, "lib/node_modules/npm/bin/npm-cli.js") : "",
    path.resolve(path.dirname(process.execPath), "../lib/node_modules/npm/bin/npm-cli.js"),
    path.resolve(path.dirname(process.execPath), "node_modules/npm/bin/npm-cli.js"),
    ...executableCandidates("npm"),
  ].filter(Boolean);
  for (const candidate of candidates) {
    try {
      const real = fs.realpathSync(candidate);
      if (!fs.statSync(real).isFile()) continue;
      if (path.basename(real) === "npm-cli.js") return real;
      if (path.basename(candidate) === "npm" && /^#!.*\bnode\b/.test(fs.readFileSync(real, "utf8").split("\n")[0])) return real;
    } catch (_) {}
  }
  return null;
}

function commandSpec(name, args = [], { useTnode = false } = {}) {
  let file = name === "node" ? process.execPath : resolveExecutable(name);
  let argv = [...args];
  if (name === "npm") {
    const cli = npmCliPath();
    if (cli) { file = process.execPath; argv.unshift(cli); }
  }
  let tnode = false;
  if (useTnode && isTermux() && process.env.BOT_UPDATE_TNODE !== "0") {
    const wrapper = resolveExecutable("tnode");
    try {
      fs.accessSync(wrapper, fs.constants.X_OK);
      argv.unshift(file);
      file = wrapper;
      tnode = true;
    } catch (_) {}
  }
  return { file, args: argv, tnode };
}

function codedExecError(error, name) {
  if (!error) return error;

  if (error.code === "EACCES") {
    const wrapped = new Error(`Sem permissão para executar ${name}: ${error.message}`);
    wrapped.code = "ERR_EXEC_PERMISSION";
    wrapped.binary = name;
    wrapped.cause = error;
    return wrapped;
  }

  if (error.code === "ENOENT") {
    const wrapped = new Error(`Ferramenta não encontrada: ${name}. ${error.message}`);
    wrapped.code = "ERR_EXEC_MISSING";
    wrapped.binary = name;
    wrapped.cause = error;
    return wrapped;
  }

  return error;
}

async function execFileCompat(name, args = [], options = {}) {
  const { useTnode, ...execOptions } = options;
  const command = commandSpec(name, args, { useTnode });

  try {
    return await execFileAsync(command.file, command.args, execOptions);
  } catch (error) {
    throw codedExecError(error, name);
  }
}

function execFileCompatSync(name, args = [], options = {}) {
  const { execFileSync } = require("child_process");
  const { useTnode, ...execOptions } = options;
  const command = commandSpec(name, args, { useTnode });

  try {
    return execFileSync(command.file, command.args, execOptions);
  } catch (error) {
    throw codedExecError(error, name);
  }
}

function applyRuntimeEnvironment() {
  if (!isTermux()) return runtimeInfo();

  const prefix = String(process.env.PREFIX || "");
  if (prefix) {
    const bin = path.join(prefix, "bin");
    const currentPath = String(process.env.PATH || "");
    const parts = currentPath.split(path.delimiter).filter(Boolean);
    process.env.PATH = [bin, ...parts.filter(item => item !== bin)].join(path.delimiter);

    const tmp = path.join(prefix, "tmp");
    try {
      fs.mkdirSync(tmp, { recursive: true });
      process.env.TMPDIR = tmp;
      process.env.TMP = tmp;
      process.env.TEMP = tmp;
    } catch (_) {}
  }

  const shell = resolveExecutable("sh");
  try { fs.accessSync(shell, fs.constants.X_OK); process.env.npm_config_script_shell ||= shell; } catch (_) {}

  return runtimeInfo();
}

function runtimeInfo() {
  return {
    termux: isTermux(),
    prefix: process.env.PREFIX || "",
    tmpdir: writableTempDir(),
    ffmpeg: resolveExecutable("ffmpeg"),
    ffprobe: resolveExecutable("ffprobe"),
    node: process.execPath,
  };
}

module.exports = {
  isTermux,
  isAndroidExternalStorage,
  writableTempDir,
  executableCandidates,
  resolveExecutable,
  commandSpec,
  npmCliPath,
  execFileCompat,
  execFileCompatSync,
  applyRuntimeEnvironment,
  runtimeInfo,
};
