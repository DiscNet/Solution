const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..", "..", "database", "grupos");
const PROJECT_ROOT = path.join(__dirname, "..", "..");

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultGroup(groupId = "") {
  return {
    id: String(groupId || ""),
    versaoDados: 1,
    funcoes: {
      modorpg: false,
      modocoins: false,
    },
    economia: {
      usuarios: {},
    },
    rpg: {
      usuarios: {},
      guildas: {},
    },
  };
}

function safeName(groupId) {
  return Buffer.from(String(groupId || "privado"), "utf8").toString("base64url") + ".json";
}

function fileFor(groupId) {
  return path.join(ROOT, safeName(groupId));
}

function readJson(file, fallback = {}) {
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    return data && typeof data === "object" ? data : clone(fallback);
  } catch {
    return clone(fallback);
  }
}

function atomicWrite(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + "." + process.pid + "." + Date.now() + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  fs.renameSync(tmp, file);
  return value;
}

function normalizeGroup(group, groupId = "") {
  const base = group && typeof group === "object" ? group : defaultGroup(groupId);
  if (!base.id) base.id = String(groupId || "");
  if (!base.funcoes || typeof base.funcoes !== "object") base.funcoes = {};
  if (typeof base.funcoes.modorpg !== "boolean") base.funcoes.modorpg = false;
  if (typeof base.funcoes.modocoins !== "boolean") base.funcoes.modocoins = false;
  if (!base.economia || typeof base.economia !== "object") base.economia = {};
  if (!base.economia.usuarios || typeof base.economia.usuarios !== "object") base.economia.usuarios = {};
  if (!base.rpg || typeof base.rpg !== "object") base.rpg = {};
  if (!base.rpg.usuarios || typeof base.rpg.usuarios !== "object") base.rpg.usuarios = {};
  if (!base.rpg.guildas || typeof base.rpg.guildas !== "object") base.rpg.guildas = {};
  base.versaoDados = 1;
  return base;
}

function legacyModes(groupId, group) {
  try {
    const oldRpg = readJson(path.join(PROJECT_ROOT, "database", "rpgSystem.json"), { grupos: {} });
    if (oldRpg?.grupos?.[groupId] === true) group.funcoes.modorpg = true;
  } catch {}

  try {
    const oldEco = readJson(path.join(PROJECT_ROOT, "database", "economia.json"), { groups: {} });
    if (oldEco?.groups?.[groupId]?.enabled === true) group.funcoes.modocoins = true;
  } catch {}

  return group;
}

function migrateLegacyUsers(group) {
  try {
    const oldRpg = readJson(path.join(PROJECT_ROOT, "database", "rpg.json"), { usuarios: {} });
    for (const [jid, user] of Object.entries(oldRpg.usuarios || {})) {
      if (group.rpg.usuarios[jid]) continue;

      const pokemon = user?.pokemon
        ? {
            tipo: user.pokemon.tipo || user.pokemon.species || "",
            apelido: user.pokemon.apelido || user.pokemon.nickname || null,
            fome: Number(user.pokemon.fome ?? user.pokemon.hunger ?? 100),
            xp: Number(user.pokemon.xp || 0),
            nivel: Number(user.pokemon.nivel || user.pokemon.level || 1),
            afeto: Number(user.pokemon.afeto ?? user.pokemon.affection ?? 0),
            criadoEm: Number(user.pokemon.criadoEm || user.pokemon.createdAt || Date.now()),
            ultimaComida: Number(user.pokemon.ultimaComida || user.pokemon.lastFed || Date.now()),
            ultimaMissao: Number(user.pokemon.ultimaMissao || user.pokemon.lastMission || 0),
          }
        : null;

      group.rpg.usuarios[jid] = {
        xp: Number(user?.xp || 0),
        level: Number(user?.level || 1),
        patente: String(user?.patente || "Bronze I"),
        bloqueado: Boolean(user?.bloqueado),
        pet: user?.pet || null,
        pokemon,
        inventarioPet: user?.inventarioPet || {},
        inventarioPokemon: user?.inventarioPokemon || {},
        aventura: user?.aventura || undefined,
      };
    }
  } catch {}

  try {
    const oldEco = readJson(path.join(PROJECT_ROOT, "database", "economia.json"), { users: {} });
    for (const [jid, user] of Object.entries(oldEco.users || {})) {
      if (group.economia.usuarios[jid]) continue;
      group.economia.usuarios[jid] = {
        coins: Number(user?.coins ?? user?.balance ?? user?.saldo ?? user?.gold ?? 0),
        ultimoBonusDia: user?.ultimoBonusDia || null,
        chances: user?.chances || { minerar: 0, cassino: 0 },
        ultimoMinerar: Number(user?.ultimoMinerar || 0),
        ultimoRoubo: Number(user?.ultimoRoubo || 0),
        ultimoTrabalhoCoins: Number(user?.ultimoTrabalhoCoins || 0),
        ultimoCassino: Number(user?.ultimoCassino || 0),
        inventario: user?.inventario || {},
        itensCoins: user?.itensCoins || {},
        cidade: user?.cidade || undefined,
      };
    }
  } catch {}

  return group;
}

function load(groupId) {
  const file = fileFor(groupId);
  const exists = fs.existsSync(file);
  let group = normalizeGroup(readJson(file, defaultGroup(groupId)), groupId);

  if (!exists) {
    group = legacyModes(groupId, group);
    group = migrateLegacyUsers(group);
    atomicWrite(file, group);
  }

  return group;
}

function save(groupId, group) {
  const normalized = normalizeGroup(group, groupId);
  return atomicWrite(fileFor(groupId), normalized);
}

function loadAsArray(groupId) {
  return [load(groupId)];
}

function saveArray(groupId, value) {
  const group = Array.isArray(value) ? value[0] : value;
  return [save(groupId, group || defaultGroup(groupId))];
}

module.exports = {
  ROOT,
  defaultGroup,
  fileFor,
  normalizeGroup,
  load,
  save,
  loadAsArray,
  saveArray,
};
