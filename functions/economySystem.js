const fs = require("fs");
const path = require("path");
const { createJsonStore } = require("./jsonStore");
const { RPG_DB, candidates, resolveRegisteredKey } = require("./rpgIdentity");

const DB_FILE = process.env.BOT_ECONOMY_PATH ||
  path.join(__dirname, "..", "database", "economia.json");

const store = createJsonStore(DB_FILE, {
  groups: {},
  users: {},
}, { checkIntervalMs: 250 });

const CURRENCY = "Coins";

function normalizeDb(db) {
  if (!db || typeof db !== "object") db = {};
  if (!db.groups || typeof db.groups !== "object") db.groups = {};
  if (!db.users || typeof db.users !== "object") db.users = {};
  return db;
}

function readRpgDb() {
  try {
    const db = JSON.parse(fs.readFileSync(RPG_DB, "utf8"));
    if (!db.usuarios || typeof db.usuarios !== "object") db.usuarios = {};
    return db;
  } catch (_) {
    return { usuarios: {} };
  }
}

function writeRpgDb(db) {
  fs.mkdirSync(path.dirname(RPG_DB), { recursive: true });
  const tmp = `${RPG_DB}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, RPG_DB);
}

function actorJid(msg, from = "") {
  const rpg = readRpgDb();
  return resolveRegisteredKey(msg, from, rpg.usuarios) ||
    candidates(msg, from)[0] ||
    msg?.key?.participantAlt ||
    msg?.key?.participant ||
    msg?.key?.remoteJidAlt ||
    msg?.key?.remoteJid ||
    from ||
    null;
}

function groupState(groupId) {
  const db = normalizeDb(store.read());
  const state = db.groups[groupId];
  if (state && typeof state === "object") return state;
  return { enabled: false, updatedAt: 0 };
}

function isEnabled(groupId) {
  if (!String(groupId || "").endsWith("@g.us")) return true;
  return groupState(groupId).enabled === true;
}

function setEnabled(groupId, enabled, actor = null) {
  const db = normalizeDb(store.read(true));
  db.groups[groupId] = {
    enabled: Boolean(enabled),
    updatedAt: Date.now(),
    updatedBy: actor || null,
  };
  store.write(db);
  return db.groups[groupId].enabled;
}

function defaultUser(jid, rpgUser = null) {
  const legacy = Math.max(0, Number(rpgUser?.gold || 0));
  return {
    jid,
    coins: legacy,
    lastRpgGold: legacy,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    lastMine: 0,
    lastWork: 0,
    lastCrime: 0,
    lastDaily: 0,
    stats: {
      mined: 0,
      worked: 0,
      donated: 0,
      received: 0,
      gambled: 0,
      won: 0,
      lost: 0,
    },
  };
}

function reconcileUser(jid, options = {}) {
  const db = normalizeDb(store.read(true));
  const rpgDb = readRpgDb();
  const rpgUser = rpgDb.usuarios[jid] || null;
  let user = db.users[jid];

  if (!user || typeof user !== "object") {
    user = defaultUser(jid, rpgUser);
    db.users[jid] = user;
  }

  user.coins = Math.max(0, Number(user.coins || 0));
  user.lastRpgGold = Math.max(0, Number(user.lastRpgGold ?? user.coins));
  user.stats = { ...defaultUser(jid).stats, ...(user.stats || {}) };

  // Compatibilidade bidirecional com o Gold antigo:
  // se algum comando legado alterou ficha.gold desde a última sincronização,
  // transportamos exatamente essa diferença para Coins.
  if (rpgUser && options.reconcileLegacy !== false) {
    const currentGold = Math.max(0, Number(rpgUser.gold || 0));
    const delta = currentGold - user.lastRpgGold;
    if (delta !== 0) {
      user.coins = Math.max(0, user.coins + delta);
      user.lastRpgGold = currentGold;
    }
  }

  user.updatedAt = Date.now();
  store.write(db);
  return user;
}

function mirrorToRpg(jid, coins) {
  const rpgDb = readRpgDb();
  const rpgUser = rpgDb.usuarios[jid];
  if (!rpgUser) return false;
  rpgUser.gold = Math.max(0, Math.floor(Number(coins || 0)));
  writeRpgDb(rpgDb);
  return true;
}

function saveUser(user, options = {}) {
  const db = normalizeDb(store.read(true));
  const jid = user?.jid;
  if (!jid) throw new Error("Usuário da economia sem JID");

  user.coins = Math.max(0, Math.floor(Number(user.coins || 0)));
  user.updatedAt = Date.now();
  db.users[jid] = user;
  store.write(db);

  if (options.mirror !== false) {
    mirrorToRpg(jid, user.coins);
    const fresh = normalizeDb(store.read(true));
    if (fresh.users[jid]) {
      fresh.users[jid].lastRpgGold = user.coins;
      fresh.users[jid].updatedAt = Date.now();
      store.write(fresh);
      Object.assign(user, fresh.users[jid]);
    }
  }
  return user;
}

function add(jid, amount, reason = "generic") {
  const value = Math.floor(Number(amount || 0));
  if (!Number.isFinite(value)) throw new Error("Valor inválido");
  const user = reconcileUser(jid);
  user.coins = Math.max(0, user.coins + value);
  user.lastReason = reason;
  return saveUser(user);
}

function setBalance(jid, amount, reason = "admin") {
  const value = Math.max(0, Math.floor(Number(amount || 0)));
  if (!Number.isFinite(value)) throw new Error("Valor inválido");
  const user = reconcileUser(jid);
  user.coins = value;
  user.lastReason = reason;
  return saveUser(user);
}

function transfer(fromJid, toJid, amount) {
  const value = Math.floor(Number(amount || 0));
  if (!Number.isFinite(value) || value <= 0) throw new Error("Valor inválido");
  if (!fromJid || !toJid || fromJid === toJid) throw new Error("Destino inválido");

  const from = reconcileUser(fromJid);
  const to = reconcileUser(toJid);
  if (from.coins < value) {
    const err = new Error("Saldo insuficiente");
    err.code = "INSUFFICIENT_FUNDS";
    err.balance = from.coins;
    throw err;
  }

  from.coins -= value;
  to.coins += value;
  from.stats.donated = Number(from.stats.donated || 0) + value;
  to.stats.received = Number(to.stats.received || 0) + value;
  saveUser(from);
  saveUser(to);
  return { from, to, amount: value };
}

function rank(limit = 10) {
  const db = normalizeDb(store.read(true));
  const all = Object.keys(db.users).map((jid) => reconcileUser(jid));
  return all
    .sort((a, b) => Number(b.coins || 0) - Number(a.coins || 0))
    .slice(0, Math.max(1, Math.min(50, Number(limit) || 10)));
}

function format(value) {
  return `${Math.max(0, Math.floor(Number(value || 0))).toLocaleString("pt-BR")} ${CURRENCY}`;
}

module.exports = {
  DB_FILE,
  CURRENCY,
  actorJid,
  groupState,
  isEnabled,
  setEnabled,
  reconcileUser,
  saveUser,
  add,
  setBalance,
  transfer,
  rank,
  format,
  readRpgDb,
};
