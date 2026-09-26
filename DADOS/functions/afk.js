const path = require("path");
const { createJsonStore } = require("./jsonStore");
const { unwrapMessage } = require("./messageText");

const afkPath = path.join(__dirname, "..", "database", "afk.json");
const store = createJsonStore(afkPath, { grupos: {}, usuarios: {} }, { checkIntervalMs: 150 });

function db() {
  const data = store.read();
  if (!data.grupos || typeof data.grupos !== "object") data.grupos = {};
  if (!data.usuarios || typeof data.usuarios !== "object") data.usuarios = {};
  return data;
}

function senderIds(msg, from = "") {
  const key = msg?.key || {};
  return [...new Set([
    key.participantAlt,
    key.participant,
    !String(from).endsWith("@g.us") ? key.remoteJidAlt : null,
    !String(from).endsWith("@g.us") ? key.remoteJid : null,
  ].filter(Boolean).map(String))];
}

function groupMap(data, groupId, create = false) {
  if (!data.grupos[groupId] && create) data.grupos[groupId] = {};
  return data.grupos[groupId] || {};
}

function setAfk(groupId, ids, motivo) {
  const data = db();
  const list = [...new Set((Array.isArray(ids) ? ids : [ids]).filter(Boolean).map(String))];
  if (!list.length) return null;
  const map = groupMap(data, groupId, true);
  const primary = list[0];
  const item = {
    id: primary,
    aliases: list,
    motivo: String(motivo || "").trim() || "Sem motivo especificado",
    data: Date.now(),
  };
  for (const id of list) map[id] = item;
  store.write(data);
  return item;
}

function getAfk(groupId, id) {
  const data = db();
  const map = groupMap(data, groupId);
  if (map[id]) return map[id];
  return Object.values(map).find((item) => Array.isArray(item?.aliases) && item.aliases.includes(id)) || null;
}

function getAfkByIds(groupId, ids = []) {
  for (const id of [...new Set(ids.filter(Boolean).map(String))]) {
    const item = getAfk(groupId, id);
    if (item) return item;
  }
  return null;
}

function removeAfk(groupId, ids = []) {
  const data = db();
  const map = groupMap(data, groupId);
  const item = getAfkByIds(groupId, Array.isArray(ids) ? ids : [ids]);
  if (!item) return null;
  const primary = item.id;
  for (const [key, value] of Object.entries(map)) {
    if (value?.id === primary || key === primary) delete map[key];
  }
  store.write(data);
  return item;
}

function isAfk(groupId, id) {
  return Boolean(getAfk(groupId, id));
}

function tempo(ms) {
  const s = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const d = Math.floor(s / 86400);
  const h = Math.floor((s % 86400) / 3600);
  const m = Math.floor((s % 3600) / 60);
  const seg = s % 60;
  const list = [];
  if (d) list.push(`${d}d`);
  if (h) list.push(`${h}h`);
  if (m) list.push(`${m}m`);
  if (seg || !list.length) list.push(`${seg}s`);
  return list.join(" ");
}

function contextInfo(msg) {
  const body = unwrapMessage(msg);
  for (const value of Object.values(body || {})) {
    if (value && typeof value === "object" && value.contextInfo) return value.contextInfo;
  }
  return {};
}

function targets(msg) {
  const ctx = contextInfo(msg);
  return [...new Set([
    ...(Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid : []),
    ctx?.participantAlt,
    ctx?.participant,
  ].filter(Boolean).map(String))];
}

function commandName(text, prefix = ".") {
  const raw = String(text || "").trim();
  if (!raw.startsWith(prefix)) return "";
  return raw.slice(prefix.length).trim().split(/\s+/)[0]?.toLowerCase() || "";
}

async function processMessage(conn, msg, { from, text = "", prefix = "." } = {}) {
  if (!String(from || "").endsWith("@g.us") || msg?.key?.fromMe) return false;

  const ids = senderIds(msg, from);
  const sender = ids[0];
  if (!sender) return false;

  const afkCommands = new Set(["afk", "off", "ausente", "away", "on", "ativo", "voltei"]);
  if (afkCommands.has(commandName(text, prefix))) return false;

  const mentioned = targets(msg).filter((id) => !ids.includes(id)).slice(0, 3);
  for (const target of mentioned) {
    const item = getAfk(from, target);
    if (!item) continue;
    const duration = tempo(Date.now() - Number(item.data || Date.now()));
    await conn.sendMessage(from, {
      text:
        `💤 *@${target.split("@")[0].split(":")[0]} está AFK*\n\n` +
        `📌 Motivo: *${item.motivo}*\n` +
        `⏳ Ausente há: *${duration}*`,
      mentions: [target],
    }, { quoted: msg }).catch(() => {});
  }

  const own = getAfkByIds(from, ids);
  if (!own) return false;

  const duration = tempo(Date.now() - Number(own.data || Date.now()));
  removeAfk(from, ids);
  await conn.sendMessage(from, {
    text:
      `👋 *@${sender.split("@")[0].split(":")[0]} voltou!*\n\n` +
      `⏳ Ficou AFK por *${duration}*.`,
    mentions: [sender],
  }, { quoted: msg }).catch(() => {});

  return true;
}

module.exports = {
  setAfk,
  removeAfk,
  isAfk,
  getAfk,
  getAfkByIds,
  senderIds,
  targets,
  tempo,
  processMessage,
};
