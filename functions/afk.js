// functions/afk.js
const fs = require("fs");
const path = require("path");

const afkPath = path.join(__dirname, "..", "database", "afk.json");

function garantirDb() {
  const dbDir = path.join(__dirname, "..", "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(afkPath)) {
    fs.writeFileSync(afkPath, JSON.stringify({ usuarios: {} }, null, 2));
  }
}

function carregarDb() {
  garantirDb();
  const data = fs.readFileSync(afkPath, "utf8");
  return JSON.parse(data);
}

function salvarDb(data) {
  garantirDb();
  fs.writeFileSync(afkPath, JSON.stringify(data, null, 2));
}

function setAfk(jid, motivo) {
  const db = carregarDb();
  db.usuarios[jid] = {
    motivo: motivo || "Não informado",
    data: Date.now()
  };
  salvarDb(db);
}

function removeAfk(jid) {
  const db = carregarDb();
  delete db.usuarios[jid];
  salvarDb(db);
}

function isAfk(jid) {
  const db = carregarDb();
  return !!db.usuarios[jid];
}

function getAfk(jid) {
  const db = carregarDb();
  return db.usuarios[jid] || null;
}

module.exports = {
  setAfk,
  removeAfk,
  isAfk,
  getAfk
};