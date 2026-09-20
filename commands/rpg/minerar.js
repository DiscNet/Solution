// Menu: RPG - Economia e itens | Comando: minerar
const fs = require("fs");
const path = require("path");
const config = require("../../config/config");
const rpgSystem = require("../../functions/rpgSystem");
const economy = require("../../functions/economySystem");
const { resolveRegisteredKey } = require("../../functions/rpgIdentity");
const { createStatusQuoted } = require("../../functions/statusCard");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");
const COOLDOWN = 5 * 60 * 1000;

function readDb() {
  try {
    const data = JSON.parse(fs.readFileSync(dbPath, "utf8"));
    if (!data.usuarios || typeof data.usuarios !== "object") data.usuarios = {};
    return data;
  } catch (_) {
    return { usuarios: {} };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const tmp = `${dbPath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, dbPath);
}

function remaining(last) {
  return Math.max(0, COOLDOWN - (Date.now() - Number(last || 0)));
}

function fmt(ms) {
  const sec = Math.ceil(ms / 1000);
  return `${Math.floor(sec / 60)}m ${sec % 60}s`;
}

function addXp(user, amount) {
  let gainedLevels = 0;
  user.xp = Math.max(0, Number(user.xp || 0)) + Math.max(0, Number(amount || 0));
  user.level = Math.max(1, Number(user.level || 1));

  while (user.xp >= user.level * 100) {
    user.xp -= user.level * 100;
    user.level += 1;
    user.vidaMax = Number(user.vidaMax || 90) + 20;
    user.vida = user.vidaMax;
    user.manaMax = Number(user.manaMax || 40) + 10;
    user.mana = user.manaMax;
    user.dano = Number(user.dano || 20) + 5;
    user.defesa = Number(user.defesa || 8) + 2;
    user.agilidade = Number(user.agilidade || 25) + 2;
    user.critico = Number(user.critico || 10) + 1;
    gainedLevels += 1;
  }
  return gainedLevels;
}

module.exports = {
  permissions: { group: true },
  name: "minerar",
  aliases: ["miner", "mina", "mine"],
  menuCategory: "RPG",
  menuSection: "Economia e itens",
  usage: "minerar",
  description: "minera Gold/Coins e XP, respeitando os modos RPG e Coins",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    try {
      if (!rpgSystem.isRpgAtivo(from)) {
        return conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n📌 Um administrador deve usar ${prefix}rpgsystem on.`
        }, { quoted: createStatusQuoted(msg) });
      }

      const db = readDb();
      const jid = resolveRegisteredKey(msg, from, db.usuarios);
      if (!jid || !db.usuarios[jid]) {
        return conn.sendMessage(from, {
          text: `❌ Você ainda não está registrado no RPG.\n📌 Use ${prefix}registro.`
        }, { quoted: createStatusQuoted(msg) });
      }

      const user = db.usuarios[jid];
      const wait = remaining(user.ultimaMina);
      if (wait) {
        return conn.sendMessage(from, {
          text: `⛏️ *ᴀɢᴜᴀʀᴅᴇ!*\n\n⏳ Próxima mineração em *${fmt(wait)}*.`
        }, { quoted: createStatusQuoted(msg) });
      }

      const coinsMode = economy.isEnabled(from);
      const moneyGain = coinsMode
        ? Math.floor(Math.random() * 451) + 100
        : Math.floor(Math.random() * 300) + 1;

      const xpGain = Math.random() <= 0.28 ? Math.floor(Math.random() * 20) + 5 : 0;
      const patenteXp = Math.random() <= 0.22 ? Math.floor(Math.random() * 8) + 2 : 0;
      const levels = addXp(user, xpGain);

      user.xpPatente = Math.max(0, Number(user.xpPatente || 0)) + patenteXp;
      user.ultimaMina = Date.now();

      let balance;
      if (coinsMode) {
        const wallet = economy.reconcileUser(jid);
        wallet.coins += moneyGain;
        wallet.lastMine = Date.now();
        wallet.stats.mined = Number(wallet.stats.mined || 0) + 1;
        economy.saveUser(wallet);
        balance = wallet.coins;

        // economy.saveUser espelha Coins em ficha.gold; recarregamos esse valor
        // na cópia atual para não sobrescrevê-lo ao salvar o restante do RPG.
        user.gold = balance;
      } else {
        user.gold = Math.max(0, Number(user.gold || 0)) + moneyGain;
        balance = user.gold;
      }

      writeDb(db);

      const moneyLabel = coinsMode ? "ᴄᴏɪɴs" : "ɢᴏʟᴅ";
      let text =
        `⛏️ *ʀᴇsᴜʟᴛᴀᴅᴏ ᴅᴀ ᴍɪɴᴇʀᴀᴄ̧ᴀ̃ᴏ*\n\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `🪙 *${moneyLabel}:* +${moneyGain.toLocaleString("pt-BR")}\n` +
        `📈 *xᴘ:* +${xpGain}\n` +
        `🎖️ *xᴘ ᴅᴇ ᴘᴀᴛᴇɴᴛᴇ:* +${patenteXp}\n` +
        `━━━━━━━━━━━━━━━━━━━━\n` +
        `💰 *sᴀʟᴅᴏ:* ${balance.toLocaleString("pt-BR")}\n` +
        `📊 *ʟᴇᴠᴇʟ:* ${user.level}\n` +
        `📈 *xᴘ ᴀᴛᴜᴀʟ:* ${user.xp}/${user.level * 100}`;

      if (levels > 0) {
        text += `\n\n🎉 *Você subiu ${levels} nível(is)!*`;
      }

      if (coinsMode) {
        text += `\n\n🪙 *Modo Coins ativo:* este saldo também é usado por Pokémon e economia.`;
      }

      return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[RPG/MINERAR]", error);
      return conn.sendMessage(from, {
        text: "❌ Não foi possível concluir a mineração."
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
