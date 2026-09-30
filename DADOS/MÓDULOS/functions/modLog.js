const { createJsonStore } = require("./jsonStore");
const { resolveDataFile } = require("./dataPaths");
const filePath = resolveDataFile("modlog.json", { override: process.env.BOT_MODLOG_PATH });
const store = createJsonStore(filePath, { groups: {} }, { checkIntervalMs: 500 });
const MAX_PER_GROUP = 250;

const ACTIONS = {
  ban: "removeu um membro",
  autoban: "removeu automaticamente um membro",
  listanegra: "barrou a entrada pela lista negra",
  promover: "promoveu um membro",
  rebaixar: "rebaixou um administrador",
  "set-desc": "alterou a descrição do grupo",
  "set-nome": "alterou o nome do grupo",
  "set-perfil": "alterou a imagem do grupo",
  blockcmd: "bloqueou um comando",
  unblockcmd: "desbloqueou um comando",
  abrir: "abriu o grupo",
  fechar: "fechou o grupo",
  "add-user": "adicionou um membro",
  rpgsystem: "alterou o estado do RPG",
  rpgset: "alterou a configuração do RPG",
  rpgadditem: "adicionou item pelo painel RPG",
  rpgremoveitem: "removeu item pelo painel RPG",
  rpgreset: "resetou uma ficha RPG",
  rpgban: "bloqueou um jogador no RPG",
  rpgunban: "desbloqueou um jogador no RPG",
  rpgevento: "alterou o evento global do RPG"
};

function normalizeDb(db) {
  if (!db || typeof db !== "object") db = { groups: {} };
  if (!db.groups || typeof db.groups !== "object") db.groups = {};
  return db;
}

function senderId(msg, from) {
  return msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJidAlt || msg?.key?.remoteJid || from || "";
}

function cleanArg(value) {
  return String(value ?? "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 80);
}

function shouldRecord(command, name, from) {
  if (!String(from || "").endsWith("@g.us")) return false;
  if (name === "modlog") return false;
  if (command?.permissions?.admin || command?.permissions?.botAdmin) return true;
  return Object.prototype.hasOwnProperty.call(ACTIONS, name);
}

function record({ command, name, requestedName, msg, args = [], from }) {
  const canonical = String(command?.name || name || "").toLowerCase();
  if (!shouldRecord(command, canonical, from)) return false;

  const db = normalizeDb(store.read(true));
  if (!Array.isArray(db.groups[from])) db.groups[from] = [];
  const entry = {
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    actor: senderId(msg, from),
    actorName: cleanArg(msg?.pushName || "Administrador"),
    command: canonical,
    requestedName: cleanArg(requestedName || canonical),
    action: ACTIONS[canonical] || `executou ${canonical}`,
    args: (Array.isArray(args) ? args : []).slice(0, 8).map(cleanArg).filter(Boolean)
  };
  db.groups[from].unshift(entry);
  db.groups[from] = db.groups[from].slice(0, MAX_PER_GROUP);
  store.write(db);
  return true;
}

function recordAutomatic({ from, target, reason, command = "autoban", bot = "" }) {
  if (!String(from || "").endsWith("@g.us") || !["autoban", "listanegra"].includes(command)) return false;
  const db = normalizeDb(store.read(true));
  if (!Array.isArray(db.groups[from])) db.groups[from] = [];
  db.groups[from].unshift({
    id: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`,
    at: Date.now(),
    actor: cleanArg(bot),
    actorName: "Bot",
    command,
    requestedName: command,
    action: ACTIONS[command],
    args: [target, reason].map(cleanArg).filter(Boolean),
    automatic: true,
  });
  db.groups[from] = db.groups[from].slice(0, MAX_PER_GROUP);
  store.write(db);
  return true;
}

function list(groupId, limit = 15) {
  const db = normalizeDb(store.read());
  const n = Math.max(1, Math.min(30, Math.floor(Number(limit) || 15)));
  return Array.isArray(db.groups[groupId]) ? db.groups[groupId].slice(0, n) : [];
}

function clear(groupId) {
  const db = normalizeDb(store.read(true));
  db.groups[groupId] = [];
  store.write(db);
  return true;
}

function actionLabel(command) {
  return ACTIONS[command] || `executou ${command}`;
}

module.exports = {
  record,
  recordAutomatic,
  list,
  clear,
  actionLabel,
  shouldRecord,
  filePath,
  MAX_PER_GROUP
};
