const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "..", "..", "config", "config.js");
const resolvedConfigPath = require.resolve(configPath);
const CHECK_INTERVAL_MS = Math.max(250, Number(process.env.CONFIG_CHECK_INTERVAL_MS || 1000));

const BASE_ONLY_KEYS = new Set([
  "tokitoApi",
  "tokitoApiUrl",
  "API_KEY_TOKITO",
  "API_URL",
  "tokitoLikeToken",
  "tokitoSalaToken",
]);

function getRuntimeConfigPath() {
  if (process.env.BOT_CONFIG_PATH) return path.resolve(process.env.BOT_CONFIG_PATH);
  if (process.env.RAILWAY_VOLUME_MOUNT_PATH) {
    return path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, "bot-config.json");
  }
  return path.join(__dirname, "..", "..", "database", "runtime.json");
}

const runtimeConfigPath = getRuntimeConfigPath();

// Mantemos a MESMA referência de objeto durante todo o processo.
// Muitos comandos importam config.js uma única vez; substituir o objeto faria
// esses módulos continuarem usando valores antigos.
let configCache = require(configPath);
let baseConfig = { ...configCache };
let runtimeConfig = {};
let lastBaseModified = -1;
let lastRuntimeModified = -1;
let nextCheckAt = 0;

function getMtime(file) {
  try {
    return fs.statSync(file).mtimeMs;
  } catch (_) {
    return -1;
  }
}

function isPlainObject(value) {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function syncStableConfig() {
  const merged = { ...baseConfig, ...runtimeConfig };

  // Credenciais/endpoint da Tokito pertencem somente ao config.js local.
  // Um runtime.json antigo não pode sobrescrever silenciosamente a chave.
  for (const key of BASE_ONLY_KEYS) {
    if (Object.prototype.hasOwnProperty.call(baseConfig, key)) {
      merged[key] = baseConfig[key];
    } else {
      delete merged[key];
    }
  }

  for (const key of Object.keys(configCache)) {
    if (!Object.prototype.hasOwnProperty.call(merged, key)) delete configCache[key];
  }
  Object.assign(configCache, merged);

  // Garante que futuros require(config/config) recebam a mesma referência estável.
  if (require.cache[resolvedConfigPath]) {
    require.cache[resolvedConfigPath].exports = configCache;
  }

  return configCache;
}

function reloadBaseConfigIfNeeded(force = false) {
  const modified = getMtime(configPath);
  if (!force && modified === lastBaseModified) return;

  const stableRef = configCache;
  delete require.cache[resolvedConfigPath];
  const freshBase = require(configPath);
  baseConfig = { ...freshBase };
  lastBaseModified = modified;

  // O require acima cria uma nova referência; devolvemos o cache ao objeto estável.
  configCache = stableRef;
  if (require.cache[resolvedConfigPath]) {
    require.cache[resolvedConfigPath].exports = configCache;
  }
}

function reloadRuntimeConfigIfNeeded(force = false) {
  const modified = getMtime(runtimeConfigPath);
  if (!force && modified === lastRuntimeModified) return;

  if (modified < 0) {
    runtimeConfig = {};
    lastRuntimeModified = -1;
    return;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(runtimeConfigPath, "utf8"));
    if (!isPlainObject(parsed)) throw new Error("o arquivo precisa conter um objeto JSON");
    runtimeConfig = parsed;
    lastRuntimeModified = modified;
  } catch (error) {
    console.error(`Erro ao carregar config runtime (${runtimeConfigPath}):`, error.message);
    // Mantém a última configuração válida em memória.
  }
}

function carregarConfig(force = false) {
  const now = Date.now();
  if (!force && configCache && now < nextCheckAt) return configCache;
  nextCheckAt = now + CHECK_INTERVAL_MS;

  try {
    reloadBaseConfigIfNeeded(force);
    reloadRuntimeConfigIfNeeded(force);
    return syncStableConfig();
  } catch (error) {
    console.error("Erro ao recarregar config:", error.message);
    return configCache;
  }
}

function recarregarConfig() {
  nextCheckAt = 0;
  return carregarConfig(true);
}

function salvarConfig(patch) {
  if (!isPlainObject(patch)) throw new TypeError("patch de configuração inválido");

  const dir = path.dirname(runtimeConfigPath);
  fs.mkdirSync(dir, { recursive: true });

  // Usa o último estado válido e mescla apenas os campos enviados.
  carregarConfig(true);
  const safePatch = { ...patch };
  for (const key of BASE_ONLY_KEYS) delete safePatch[key];

  const nextRuntime = { ...runtimeConfig, ...safePatch };
  for (const key of BASE_ONLY_KEYS) delete nextRuntime[key];
  const tempPath = `${runtimeConfigPath}.${process.pid}.${Date.now()}.tmp`;

  fs.writeFileSync(tempPath, `${JSON.stringify(nextRuntime, null, 2)}\n`, "utf8");
  fs.renameSync(tempPath, runtimeConfigPath);

  runtimeConfig = nextRuntime;
  lastRuntimeModified = getMtime(runtimeConfigPath);
  nextCheckAt = 0;
  return syncStableConfig();
}

function getBaseConfig() {
  carregarConfig();
  return { ...baseConfig };
}

module.exports = {
  carregarConfig,
  recarregarConfig,
  salvarConfig,
  getConfig: carregarConfig,
  getBaseConfig,
  getRuntimeConfigPath,
  BASE_ONLY_KEYS
};
