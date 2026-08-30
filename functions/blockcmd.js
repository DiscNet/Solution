// functions/blockcmd.js
const fs = require("fs");
const path = require("path");

const BLOCKCMD_CONFIG_PATH = path.join(__dirname, "..", "config", "blockcmd.json");

function loadConfig() {
  try {
    if (fs.existsSync(BLOCKCMD_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(BLOCKCMD_CONFIG_PATH, "utf8"));
    }
  } catch (e) {}
  return {};
}

function saveConfig(data) {
  const dir = path.join(__dirname, "..", "config");
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(BLOCKCMD_CONFIG_PATH, JSON.stringify(data, null, 2));
}

function isCommandBlocked(groupId, cmdName) {
  const data = loadConfig();
  if (data[groupId]) {
    if (data[groupId].bloquearTodos === true) return true;
    if (data[groupId].bloqueados && data[groupId].bloqueados.includes(cmdName)) return true;
  }
  return false;
}

module.exports = { isCommandBlocked, loadConfig, saveConfig };