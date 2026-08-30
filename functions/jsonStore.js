const fs = require("fs");
const path = require("path");

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
      if (!fs.existsSync(filePath)) {
        if (!cache) cache = cloneDefault(defaultValue);
        return cache;
      }

      const stat = fs.statSync(filePath);
      if (!force && cache && stat.mtimeMs === lastMtime) return cache;

      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      cache = parsed && typeof parsed === "object" ? parsed : cloneDefault(defaultValue);
      lastMtime = stat.mtimeMs;
      return cache;
    } catch (error) {
      console.error(`Falha ao ler JSON ${path.basename(filePath)}:`, error.message);
      if (!cache) cache = cloneDefault(defaultValue);
      return cache;
    }
  }

  function write(data) {
    ensureParent();
    const tempPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    const json = JSON.stringify(data, null, 2);

    try {
      fs.writeFileSync(tempPath, json);
      fs.renameSync(tempPath, filePath);
      cache = data;
      lastMtime = fs.statSync(filePath).mtimeMs;
      nextCheckAt = Date.now() + checkIntervalMs;
      return true;
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
