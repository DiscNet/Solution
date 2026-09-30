const fs = require("fs");
const path = require("path");
const { randomBytes } = require("crypto");

function cloneDefault(value) {
  return JSON.parse(JSON.stringify(typeof value === "function" ? value() : value));
}

function createJsonStore(filePath, defaultValue = {}, options = {}) {
  const checkIntervalMs = Number(options.checkIntervalMs || 1000);
  let cache = null;
  let lastMtime = -1;
  let nextCheckAt = 0;

  function ensureParent() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
  }

  function read(force = false) {
    const now = Date.now();
    if (!force && cache && now < nextCheckAt) return cache;
    nextCheckAt = now + checkIntervalMs;

    try {
      let stat;
      try { stat = fs.statSync(filePath); }
      catch (error) {
        if (error.code !== "ENOENT") throw error;
        if (!cache) cache = cloneDefault(defaultValue);
        return cache;
      }

      if (!force && cache && stat.mtimeMs === lastMtime) return cache;

      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      cache = parsed && typeof parsed === "object" ? parsed : cloneDefault(defaultValue);
      lastMtime = stat.mtimeMs;
      return cache;
    } catch (error) {
      if (["EACCES", "EPERM"].includes(error.code)) {
        const denied = new Error(`Sem permissão para ler ${filePath}. Verifique o acesso à pasta de dados.`);
        denied.code = "ERR_DATA_PERMISSION";
        denied.cause = error;
        throw denied;
      }
      console.error(`Falha ao ler JSON ${path.basename(filePath)}:`, error.message);
      if (!cache) cache = cloneDefault(defaultValue);
      return cache;
    }
  }

  function write(data) {
    const tempPath = `${filePath}.${process.pid}.${randomBytes(8).toString("hex")}.tmp`;

    try {
      ensureParent();
      const json = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, json, { flag: "wx", mode: 0o600 });
      fs.renameSync(tempPath, filePath);
      cache = data;
      lastMtime = fs.statSync(filePath).mtimeMs;
      nextCheckAt = Date.now() + checkIntervalMs;
      return true;
    } catch (error) {
      // Discard caller mutations that could not be persisted.
      cache = null;
      invalidate();
      throw error;
    } finally {
      try {
        if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      } catch (_) {}
    }
  }

  function invalidate() {
    nextCheckAt = 0;
    lastMtime = -1;
  }

  return { read, write, invalidate, filePath };
}

module.exports = { createJsonStore };
