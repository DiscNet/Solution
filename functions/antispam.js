const path = require("path");
const { createJsonStore } = require("./jsonStore");

const CONFIG_PATH = path.join(__dirname, "..", "config", "antispam.json");
const configStore = createJsonStore(CONFIG_PATH, {});
const userState = new Map();
const STATE_TTL_MS = 60 * 60 * 1000;

function loadConfig(force = false) {
  return configStore.read(force);
}

function saveConfig(config) {
  return configStore.write(config);
}

function isAntispamAtivo(groupId) {
  return loadConfig()[groupId] === true;
}

function toggleAntispam(groupId, ativar) {
  const config = loadConfig();
  config[groupId] = ativar;
  saveConfig(config);
  return true;
}

function getState(userKey) {
  let state = userState.get(userKey);
  if (!state) {
    state = {
      timestamps: [],
      warnings: 0,
      mutedUntil: 0,
      lastWarningTime: 0,
      touchedAt: Date.now()
    };
    userState.set(userKey, state);
  }
  state.touchedAt = Date.now();
  return state;
}

function verificarSpam(senderId, groupId, limite = 5, tempoSegundos = 10) {
  const userKey = `${groupId}_${senderId}`;
  const userData = getState(userKey);
  const agora = Date.now();
  const limiteTempo = tempoSegundos * 1000;

  if (userData.mutedUntil > agora) {
    return {
      isSpam: true,
      isMuted: true,
      mutedUntil: userData.mutedUntil,
      count: userData.timestamps.length,
      limit: limite,
      warnings: userData.warnings,
      shouldWarn: false,
      shouldExpel: false
    };
  }

  if (userData.mutedUntil && userData.mutedUntil <= agora) userData.mutedUntil = 0;
  userData.timestamps = userData.timestamps.filter(t => (agora - t) < limiteTempo);
  userData.timestamps.push(agora);

  const currentCount = userData.timestamps.length;
  const result = {
    isSpam: false,
    isMuted: false,
    count: currentCount,
    limit: limite,
    warnings: userData.warnings,
    shouldWarn: false,
    shouldExpel: false
  };

  if (currentCount > limite) {
    userData.warnings += 1;
    userData.lastWarningTime = agora;
    result.warnings = userData.warnings;
    result.isSpam = true;

    if (userData.warnings >= 3) {
      result.shouldExpel = true;
      userData.warnings = 0;
      userData.timestamps = [];
      userData.mutedUntil = 0;
    } else {
      userData.mutedUntil = agora + 10_000;
      userData.timestamps = [];
      result.shouldWarn = true;
      result.isMuted = true;
      result.mutedUntil = userData.mutedUntil;
    }
  }

  userData.touchedAt = agora;
  return result;
}

function limparDadosAntigos() {
  const limite = Date.now() - STATE_TTL_MS;
  for (const [key, state] of userState.entries()) {
    if (state.touchedAt < limite && state.mutedUntil < Date.now()) userState.delete(key);
  }
}

const cleanupTimer = setInterval(limparDadosAntigos, 30 * 60 * 1000);
cleanupTimer.unref?.();

module.exports = {
  isAntispamAtivo,
  toggleAntispam,
  verificarSpam
};
