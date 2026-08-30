const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "config", "config.js");
const CHECK_INTERVAL_MS = Math.max(250, Number(process.env.CONFIG_CHECK_INTERVAL_MS || 1000));

let configCache = null;
let lastModified = -1;
let nextCheckAt = 0;

function carregarConfig(force = false) {
  const now = Date.now();
  if (!force && configCache && now < nextCheckAt) return configCache;
  nextCheckAt = now + CHECK_INTERVAL_MS;

  try {
    const stats = fs.statSync(configPath);
    const modifiedTime = stats.mtimeMs;
    if (!force && configCache && lastModified === modifiedTime) return configCache;

    delete require.cache[require.resolve(configPath)];
    configCache = require(configPath);
    lastModified = modifiedTime;
    return configCache;
  } catch (err) {
    console.error("Erro ao recarregar config:", err.message);
    if (configCache) return configCache;
    configCache = require(configPath);
    return configCache;
  }
}

function recarregarConfig() {
  nextCheckAt = 0;
  lastModified = -1;
  return carregarConfig(true);
}

module.exports = {
  carregarConfig,
  recarregarConfig,
  getConfig: carregarConfig
};
