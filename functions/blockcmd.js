const path = require("path");
const { createJsonStore } = require("./jsonStore");

const BLOCKCMD_CONFIG_PATH = path.join(__dirname, "..", "config", "blockcmd.json");
const store = createJsonStore(BLOCKCMD_CONFIG_PATH, {});

function loadConfig(force = false) {
  return store.read(force);
}

function saveConfig(data) {
  return store.write(data);
}

function isCommandBlocked(groupId, cmdName) {
  const data = loadConfig();
  const group = data[groupId];
  if (!group) return false;
  if (group.bloquearTodos === true) return true;
  return Array.isArray(group.bloqueados) && group.bloqueados.includes(cmdName);
}

module.exports = { isCommandBlocked, loadConfig, saveConfig };
