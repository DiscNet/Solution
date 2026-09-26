const path = require("path");
const { createJsonStore } = require("./jsonStore");
const { unwrapMessage } = require("./messageText");

const DB_FILE = process.env.BOT_ACTIVITY_PATH ||
  path.join(__dirname, "..", "..", "database", "activity.json");

const store = createJsonStore(DB_FILE, { groups: {} }, { checkIntervalMs: 150 });

function normalizeDb(db) {
  if (!db || typeof db !== "object") db = {};
  if (!db.groups || typeof db.groups !== "object") db.groups = {};
  return db;
}

function blank() {
  return {
    total: 0,
    comandos: 0,
    audios: 0,
    figurinhas: 0,
    documentos: 0,
    fotos: 0,
    videos: 0,
    textos: 0,
    ultima: 0,
  };
}

function normalizeStats(value) {
  const source = value && typeof value === "object" ? value : {};
  const out = blank();
  for (const key of Object.keys(out)) out[key] = Number(source[key] || 0);
  out.pontos =
    out.comandos +
    out.audios +
    out.figurinhas +
    out.documentos +
    out.fotos +
    out.videos;
  return out;
}

function senderKeys(msg, fallback = "") {
  const key = msg?.key || {};
  return [...new Set([
    key.participantAlt,
    key.participant,
    !String(fallback).endsWith("@g.us") ? key.remoteJidAlt : null,
    !String(fallback).endsWith("@g.us") ? key.remoteJid : null,
  ].filter(Boolean).map(String))];
}

function messageBody(msg) {
  return unwrapMessage(msg) || {};
}

function recordMessage({ groupId, msg, sender, isCommand = false }) {
  if (!String(groupId || "").endsWith("@g.us") || msg?.key?.fromMe) return null;

  const keys = [...new Set([sender, ...senderKeys(msg, groupId)].filter(Boolean).map(String))];
  if (!keys.length) return null;

  const db = normalizeDb(store.read(true));
  if (!db.groups[groupId] || typeof db.groups[groupId] !== "object") db.groups[groupId] = { users: {} };
  if (!db.groups[groupId].users || typeof db.groups[groupId].users !== "object") db.groups[groupId].users = {};

  const users = db.groups[groupId].users;
  let canonical = keys.find((key) => users[key]) || keys[0];
  let entry = { ...blank(), ...(users[canonical] || {}) };

  // Se o WhatsApp alternou PN/LID, consolida chaves já conhecidas.
  for (const key of keys) {
    if (key !== canonical && users[key]) {
      const other = normalizeStats(users[key]);
      for (const field of ["total","comandos","audios","figurinhas","documentos","fotos","videos","textos"]) {
        entry[field] = Number(entry[field] || 0) + Number(other[field] || 0);
      }
      entry.ultima = Math.max(Number(entry.ultima || 0), Number(other.ultima || 0));
      delete users[key];
    }
  }

  const body = messageBody(msg);
  entry.total = Number(entry.total || 0) + 1;
  if (isCommand) entry.comandos = Number(entry.comandos || 0) + 1;
  if (body.stickerMessage) entry.figurinhas = Number(entry.figurinhas || 0) + 1;
  else if (body.imageMessage) entry.fotos = Number(entry.fotos || 0) + 1;
  else if (body.videoMessage) entry.videos = Number(entry.videos || 0) + 1;
  else if (body.audioMessage) entry.audios = Number(entry.audios || 0) + 1;
  else if (body.documentMessage || body.documentWithCaptionMessage) entry.documentos = Number(entry.documentos || 0) + 1;
  else entry.textos = Number(entry.textos || 0) + 1;

  entry.ultima = Date.now();
  entry.aliases = keys;
  users[canonical] = entry;
  db.groups[groupId].updatedAt = Date.now();
  store.write(db);
  return normalizeStats(entry);
}

function groupUsers(groupId) {
  const db = normalizeDb(store.read());
  return db.groups[groupId]?.users && typeof db.groups[groupId].users === "object"
    ? db.groups[groupId].users
    : {};
}

function statsFor(groupId, keys = []) {
  const users = groupUsers(groupId);
  const list = [...new Set((Array.isArray(keys) ? keys : [keys]).filter(Boolean).map(String))];
  const key = list.find((candidate) => users[candidate] || Object.values(users).some((x) => x?.aliases?.includes(candidate)));
  if (!key) return normalizeStats(null);
  const direct = users[key];
  if (direct) return normalizeStats(direct);
  const found = Object.values(users).find((x) => list.some((candidate) => x?.aliases?.includes(candidate)));
  return normalizeStats(found);
}

function rows(groupId) {
  return Object.entries(groupUsers(groupId)).map(([jid, value]) => ({
    jid,
    ...normalizeStats(value),
    aliases: Array.isArray(value?.aliases) ? value.aliases : [jid],
  }));
}

function ranking(groupId, limit = 50) {
  return rows(groupId)
    .sort((a, b) => b.pontos - a.pontos || b.total - a.total || b.ultima - a.ultima)
    .slice(0, Math.max(1, Math.min(100, Number(limit) || 50)));
}

function formatLast(timestamp) {
  const value = Number(timestamp || 0);
  if (!value) return "sem registro";
  const diff = Math.max(0, Date.now() - value);
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min}m`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `há ${hours}h`;
  return `há ${Math.floor(hours / 24)}d`;
}

module.exports = {
  DB_FILE,
  recordMessage,
  groupUsers,
  statsFor,
  rows,
  ranking,
  normalizeStats,
  formatLast,
  senderKeys,
};
