const path = require("path");
const { createJsonStore } = require("./jsonStore");

const afkPath = path.join(__dirname, "..", "database", "afk.json");
const store = createJsonStore(afkPath, { usuarios: {} });

function carregarDb() {
  const db = store.read();
  if (!db.usuarios || typeof db.usuarios !== "object") db.usuarios = {};
  return db;
}

function salvarDb(data) {
  store.write(data);
}

function setAfk(jid, motivo) {
  const db = carregarDb();
  db.usuarios[jid] = { motivo: motivo || "Não informado", data: Date.now() };
  salvarDb(db);
}

function removeAfk(jid) {
  const db = carregarDb();
  if (!db.usuarios[jid]) return false;
  delete db.usuarios[jid];
  salvarDb(db);
  return true;
}

function isAfk(jid) {
  return !!carregarDb().usuarios[jid];
}

function getAfk(jid) {
  return carregarDb().usuarios[jid] || null;
}

module.exports = { setAfk, removeAfk, isAfk, getAfk };
