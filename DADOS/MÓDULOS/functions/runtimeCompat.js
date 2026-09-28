const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFile } = require("child_process");
const { promisify } = require("util");

const execFileAsync = promisify(execFile);

function isTermux() {
  const prefix = String(process.env.PREFIX || "");
  return Boolean(
    process.env.TERMUX_VERSION ||
    /com\.termux/i.test(prefix) ||
    /com\.termux/i.test(String(process.execPath || ""))
  );
}

function writableTempDir(namespace = "solution") {
  const candidates = [
    process.env.TMPDIR,
    isTermux() && process.env.PREFIX
      ? path.join(process.env.PREFIX, "tmp")
      : "",
    os.tmpdir(),
    path.join(process.cwd(), "temp"),
  ].filter(Boolean);

  for (const base of candidates) {
    try {
      const dir = path.join(base, namespace);
      fs.mkdirSync(dir, { recursive: true });
      const probe = path.join(dir, `.write_${process.pid}_${Date.now()}`);
      fs.writeFileSync(probe, "ok");
      fs.unlinkSync(probe);
      return dir;
    } catch (_) {}
  }

  const fallback = path.join(process.cwd(), "temp", namespace);
  fs.mkdirSync(fallback, { recursive: true });
  return fallback;
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

function codedExecError(error, name) {
  if (!error) return error;

  if (error.code === "EACCES") {
    const wrapped = new Error("ERR_EXEC_PERMISSION");
    wrapped.code = "ERR_EXEC_PERMISSION";
    wrapped.binary = name;
    wrapped.cause = error;
    return wrapped;
  }

  if (error.code === "ENOENT") {
    const wrapped = new Error("ERR_EXEC_MISSING");
    wrapped.code = "ERR_EXEC_MISSING";
    wrapped.binary = name;
    wrapped.cause = error;
    return wrapped;
  }

  return error;
}

async function execFileCompat(name, args = [], options = {}) {
  const binary = resolveExecutable(name);

  try {
    return await execFileAsync(binary, args, options);
  } catch (error) {
    throw codedExecError(error, name);
  }
}

function execFileCompatSync(name, args = [], options = {}) {
  const { execFileSync } = require("child_process");
  const binary = resolveExecutable(name);

  try {
    return execFileSync(binary, args, options);
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
  writableTempDir,
  executableCandidates,
  resolveExecutable,
  execFileCompat,
  execFileCompatSync,
  applyRuntimeEnvironment,
  runtimeInfo,
};
