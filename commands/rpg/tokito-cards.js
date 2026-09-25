const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const tokitoApi = require("../../functions/tokitoApi");
const rpgSystem = require("../../functions/rpgSystem");
const economy = require("../../functions/economySystem");
const { resolveRegisteredKey } = require("../../functions/rpgIdentity");
const { getMessageProfilePicture } = require("../../functions/profilePicture");
const { createStatusQuoted } = require("../../functions/statusCard");

const RPG_DB = path.join(__dirname, "..", "..", "database", "rpg.json");

function readRpg() {
  try { return JSON.parse(fs.readFileSync(RPG_DB, "utf8")); }
  catch { return { usuarios: {} }; }
}

function ensureGroupRpg(from) {
  if (!String(from || "").endsWith("@g.us")) {
    const e = new Error("Esse comando funciona em grupos."); e.userMessage = e.message; throw e;
  }
  if (!rpgSystem.isRpgAtivo(from)) {
    const e = new Error("O RPG está desativado neste grupo."); e.userMessage = e.message; throw e;
  }
}

async function pictureUrl(conn, msg, from, jid) {
  try {
    const picture = await getMessageProfilePicture(conn, msg, from, [jid], { fallback: null });
    if (picture?.url) return picture.url;
  } catch {}
  try { return await conn.profilePictureUrl(jid, "image"); } catch {}
  return "";
}

function rankingPosition(db, jid) {
  const entries = Object.entries(db.usuarios || {}).sort((a, b) =>
    Number(b[1]?.level || 0) - Number(a[1]?.level || 0) || Number(b[1]?.xp || 0) - Number(a[1]?.xp || 0)
  );
  const index = entries.findIndex(([key]) => key === jid);
  return index >= 0 ? index + 1 : entries.length || 1;
}

module.exports = [
  {
    name: "level",
    aliases: ["levelcard", "nivelcard"],
    menuCategory: "RPG",
    menuSection: "Rankings",
    usage: "level",
    description: "Mostra seu level em card da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureGroupRpg(from);
        const db = readRpg();
        const jid = resolveRegisteredKey(msg, from, db.usuarios);
        const user = jid ? db.usuarios[jid] : null;
        if (!user) throw Object.assign(new Error(), { userMessage: "Você ainda não está registrado no RPG. Use .registro." });
        const foto = await pictureUrl(conn, msg, from, jid);
        const groupPhoto = await conn.profilePictureUrl(from, "image").catch(() => "");
        const rank = rankingPosition(db, jid);
        const required = Math.max(100, Number(user.level || 1) * 100);
        const image = tokitoApi.url("/canvas/levelcard", {
          foto,
          nome: user.pushName || msg.pushName || "Jogador",
          xp_before: Number(user.xp || 0),
          xp_after: required,
          level: Number(user.level || 1),
          ranking: rank,
          patente: user.patente || "Recruta",
          fundo: groupPhoto || foto,
        });
        await conn.sendMessage(from, {
          image: { url: image },
          caption: "📈 *LEVEL RPG*\n🏆 Ranking: #" + rank + "\n⭐ Nível: " + Number(user.level || 1) + "\n🎖️ Patente: " + (user.patente || "Recruta"),
        }, { quoted: createStatusQuoted(msg) });
      } catch (e) {
        await conn.sendMessage(from, { text: "❌ " + (e.userMessage || "Não foi possível gerar o level card.") }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "coinscard",
    aliases: ["carteiracard", "coincard"],
    menuCategory: "RPG",
    menuSection: "Economia",
    usage: "coinscard",
    description: "Mostra a carteira em card da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        if (!economy.isEnabled(from)) throw Object.assign(new Error(), { userMessage: "A economia está desativada neste grupo." });
        const jid = economy.actorJid(msg, from);
        const wallet = economy.reconcileUser(jid);
        const foto = await pictureUrl(conn, msg, from, jid);
        const image = tokitoApi.url("/canvas/coins", {
          foto,
          nome: msg.pushName || "Usuário",
          coins: Number(wallet.coins || 0),
          banco: Number(wallet.bank || wallet.banco || 0),
          minerar: Number(wallet.stats?.mined || 0),
          cassino: Number(wallet.stats?.gambled || 0),
        });
        await conn.sendMessage(from, {
          image: { url: image },
          caption: "🪙 *CARTEIRA*\n💰 " + economy.format(wallet.coins || 0),
        }, { quoted: createStatusQuoted(msg) });
      } catch (e) {
        await conn.sendMessage(from, { text: "❌ " + (e.userMessage || "Não foi possível gerar o card de Coins.") }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports._test = { readRpg, rankingPosition };
