// Menu: RPG - Economia | Sistema compartilhado inspirado na arquitetura da Tokito.
const config = require("../../config/config");
const economy = require("../../functions/economySystem");
const { messageContext } = require("../../functions/profilePicture");
const { createStatusQuoted } = require("../../functions/statusCard");

const WORK_CD = 10 * 60 * 1000;
const DAILY_CD = 24 * 60 * 60 * 1000;

function ensureGroup(from) {
  if (!String(from || "").endsWith("@g.us")) {
    const e = new Error("Este comando só funciona em grupos.");
    e.userMessage = e.message;
    throw e;
  }
}

function ensureEnabled(from) {
  ensureGroup(from);
  if (!economy.isEnabled(from)) {
    const e = new Error(`A economia está desativada. Um administrador precisa usar ${config.prefix || "."}modocoins on.`);
    e.userMessage = e.message;
    throw e;
  }
}

function remaining(last, cooldown) {
  return Math.max(0, cooldown - (Date.now() - Number(last || 0)));
}

function fmtTime(ms) {
  const sec = Math.ceil(ms / 1000);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function mentionTarget(msg) {
  const ctx = messageContext(msg);
  return Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid[0] : null;
}

function sender(msg, from) {
  return economy.actorJid(msg, from);
}

function tag(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

async function reply(conn, msg, from, text, mentions = []) {
  return conn.sendMessage(from, {
    text,
    ...(mentions.length ? { mentions } : {}),
  }, { quoted: createStatusQuoted(msg) });
}

const commands = [
  {
    name: "coins",
    aliases: ["saldo", "carteira"],
    menuCategory: "RPG",
    menuSection: "Economia",
    usage: "coins",
    description: "mostra seu saldo da economia compartilhada",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureEnabled(from);
        const jid = sender(msg, from);
        const user = economy.reconcileUser(jid);
        return reply(conn, msg, from,
          `🪙 *sᴜᴀ ᴄᴀʀᴛᴇɪʀᴀ*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ${tag(jid)}\n` +
          `💰 sᴀʟᴅᴏ: *${economy.format(user.coins)}*\n` +
          `━━━━━━━━━━━━━━━━━━━━\n\n` +
          `> O saldo é compartilhado entre RPG, mercado e Pokémon.`,
          [jid]);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível consultar o saldo."}`);
      }
    },
  },

  {
    name: "doarcoins",
    aliases: ["transferircoins", "pixcoins"],
    menuCategory: "RPG",
    menuSection: "Economia",
    usage: "doarcoins valor @usuario",
    description: "transfere Coins para outro usuário",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureEnabled(from);
        const fromJid = sender(msg, from);
        const toJid = mentionTarget(msg);
        const value = Number(String(args?.[0] || "").replace(/\D/g, ""));
        if (!toJid || !Number.isInteger(value) || value <= 0) {
          throw Object.assign(new Error("Uso: .doarcoins 100 @usuario"), { userMessage: "Use: .doarcoins 100 @usuario" });
        }
        const result = economy.transfer(fromJid, toJid, value);
        return reply(conn, msg, from,
          `🎁 *ᴅᴏᴀᴄ̧ᴀ̃ᴏ ʀᴇᴀʟɪᴢᴀᴅᴀ*\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `👤 ᴅᴇ: ${tag(fromJid)}\n` +
          `🎯 ᴘᴀʀᴀ: ${tag(toJid)}\n` +
          `🪙 ᴠᴀʟᴏʀ: *${economy.format(value)}*\n` +
          `💰 sᴀʟᴅᴏ: *${economy.format(result.from.coins)}*\n` +
          `━━━━━━━━━━━━━━━━━━━━`,
          [fromJid, toJid]);
      } catch (e) {
        const text = e.code === "INSUFFICIENT_FUNDS"
          ? `Saldo insuficiente. Você possui ${economy.format(e.balance)}.`
          : (e.userMessage || "Não foi possível transferir Coins.");
        return reply(conn, msg, from, `❌ ${text}`);
      }
    },
  },

  {
    name: "rankcoins",
    aliases: ["rankingcoins", "rankeconomia"],
    menuCategory: "RPG",
    menuSection: "Economia",
    usage: "rankcoins",
    description: "mostra o ranking da economia",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureEnabled(from);
        const ranking = economy.rank(10);
        if (!ranking.length) return reply(conn, msg, from, "🪙 Ainda não há saldo registrado.");

        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
        const mentions = ranking.map((u) => u.jid);
        const lines = ranking.map((u, i) =>
          `${medals[i]} ${tag(u.jid)} — *${economy.format(u.coins)}*`
        );
        return reply(conn, msg, from,
          `🏆 *ʀᴀɴᴋɪɴɢ ᴅᴇ ᴄᴏɪɴs*\n\n${lines.join("\n")}`,
          mentions);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível gerar o ranking."}`);
      }
    },
  },

  {
    name: "dailycoins",
    aliases: ["daily", "bonusdiario"],
    menuCategory: "RPG",
    menuSection: "Economia",
    usage: "dailycoins",
    description: "recebe o bônus diário de Coins",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureEnabled(from);
        const jid = sender(msg, from);
        const user = economy.reconcileUser(jid);
        const wait = remaining(user.lastDaily, DAILY_CD);
        if (wait) throw Object.assign(new Error(), { userMessage: `Seu próximo bônus fica disponível em *${fmtTime(wait)}*.` });

        const gain = Math.floor(Math.random() * 301) + 400;
        user.coins += gain;
        user.lastDaily = Date.now();
        economy.saveUser(user);
        return reply(conn, msg, from,
          `🎁 *ʙᴏ̂ɴᴜs ᴅɪᴀ́ʀɪᴏ*\n\n🪙 +*${economy.format(gain)}*\n💰 sᴀʟᴅᴏ: *${economy.format(user.coins)}*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível receber o bônus."}`);
      }
    },
  },

  {
    name: "cassino",
    aliases: ["apostarcoins"],
    menuCategory: "RPG",
    menuSection: "Economia",
    usage: "cassino valor",
    description: "aposta Coins em um jogo simples de sorte",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureEnabled(from);
        const jid = sender(msg, from);
        const value = Math.floor(Number(args?.[0] || 0));
        if (!Number.isFinite(value) || value < 10) throw Object.assign(new Error(), { userMessage: "A aposta mínima é 10 Coins." });

        const user = economy.reconcileUser(jid);
        if (user.coins < value) throw Object.assign(new Error(), { userMessage: `Saldo insuficiente: ${economy.format(user.coins)}.` });

        user.stats.gambled = Number(user.stats.gambled || 0) + value;
        const roll = Math.random();
        let text;
        if (roll < 0.42) {
          user.coins -= value;
          user.stats.lost = Number(user.stats.lost || 0) + value;
          text = `🎰 *ᴄᴀssɪɴᴏ*\n\n❌ Você perdeu *${economy.format(value)}*.`;
        } else if (roll < 0.92) {
          const profit = value;
          user.coins += profit;
          user.stats.won = Number(user.stats.won || 0) + profit;
          text = `🎰 *ᴄᴀssɪɴᴏ*\n\n✅ Você ganhou *${economy.format(profit)}*.`;
        } else {
          const profit = value * 3;
          user.coins += profit;
          user.stats.won = Number(user.stats.won || 0) + profit;
          text = `🎰 *JACKPOT!*\n\n💎 Você ganhou *${economy.format(profit)}*!`;
        }
        economy.saveUser(user);
        return reply(conn, msg, from, `${text}\n💰 sᴀʟᴅᴏ: *${economy.format(user.coins)}*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível realizar a aposta."}`);
      }
    },
  },
];

module.exports = commands;
