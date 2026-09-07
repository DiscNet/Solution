// Menu: RPG - Economia e itens | Comando: roubar
// commands/rpg/roubar.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");

function carregarDb() {
  if (!fs.existsSync(dbPath)) return { usuarios: {} };
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function salvarDb(data) {
  const dbDir = path.join(__dirname, "..", "..", "database");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  permissions: { group: true },
  name: "roubar",
  aliases: ["steal", "rob"],
  description: "ᴛᴇɴᴛᴀ ʀᴏᴜʙᴀʀ ᴏ ɢᴏʟᴅ ᴅᴇ ᴜᴍ ᴜsᴜᴀ́ʀɪᴏ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // Verifica se o RPG está ativo
      if (from.endsWith("@g.us") && !rpgSystem.isRpgAtivo(from)) {
        return await conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴘᴇᴄᴀ ᴀ ᴜᴍ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ ᴏ sɪsᴛᴇᴍᴀ ᴄᴏᴍ:\n${prefix}rpgsystem on`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // Verifica se é um grupo
      if (!from.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // Pega o LID do usuário que está roubando
      let ladraoJid = msg.key.participant || msg.key.remoteJid || from;
      if (from.endsWith("@g.us") && msg.key.participant) {
        ladraoJid = msg.key.participant;
      }

      // 🔥 VERIFICA SE MARCOU ALGUÉM
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentionedJid || mentionedJid.length === 0) {
        return await conn.sendMessage(from, {
          text: `❌ ᴍᴀʀǫᴜᴇ ᴀʟɢᴜᴇ́ᴍ ᴘᴀʀᴀ ʀᴏᴜʙᴀʀ!\n\n📌 ${prefix}roubar @usuario`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const vitimaJid = mentionedJid[0];

      // Verifica se está tentando roubar a si mesmo
      if (ladraoJid === vitimaJid) {
        return await conn.sendMessage(from, {
          text: "❌ ᴠᴏᴄᴇ ɴᴀ̃ᴏ ᴘᴏᴅᴇ ʀᴏᴜʙᴀʀ ᴀ sɪ ᴍᴇsᴍᴏ!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // Carrega o banco de dados
      const db = carregarDb();

      // Verifica se o ladrão está registrado
      if (!db.usuarios[ladraoJid]) {
        return await conn.sendMessage(from, {
          text: `❌ ᴠᴏᴄᴇ ᴀɪɴᴅᴀ ɴᴀᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ!\n📌 ᴜsᴇ ${prefix}registro para criar seu personagem.`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // Verifica se a vítima está registrada
      if (!db.usuarios[vitimaJid]) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴜsᴜᴀ́ʀɪᴏ ᴀɪɴᴅᴀ ɴᴀ̃ᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ ɴᴏ ʀᴘɢ!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const ladrao = db.usuarios[ladraoJid];
      const vitima = db.usuarios[vitimaJid];

      // 🔥 VERIFICA COOLDOWN (15 MINUTOS)
      const agora = Date.now();
      const cooldown = 15 * 60 * 1000; // 15 minutos

      if (ladrao.ultimoRoubo && (agora - ladrao.ultimoRoubo) < cooldown) {
        const tempoRestante = Math.ceil((cooldown - (agora - ladrao.ultimoRoubo)) / 1000);
        const minutos = Math.floor(tempoRestante / 60);
        const segundos = tempoRestante % 60;

        return await conn.sendMessage(from, {
          text: `🥷 *ᴀɢᴜᴀʀᴅᴇ!*\n\nᴠᴏᴄᴇ ᴊᴀ́ ᴛᴇɴᴛᴏᴜ ʀᴏᴜʙᴀʀ ʀᴇᴄᴇɴᴛᴇᴍᴇɴᴛᴇ.\n\n⏳ ᴛᴇᴍᴘᴏ ʀᴇsᴛᴀɴᴛᴇ: ${minutos}ᴍ ${segundos}s`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // 🔥 VERIFICA SE A VÍTIMA TEM GOLD SUFICIENTE
      if (vitima.gold < 10) {
        return await conn.sendMessage(from, {
          text: `❌ ᴇsᴛᴇ ᴜsᴜᴀ́ʀɪᴏ ᴇsᴛᴀ́ ᴘᴏʙʀᴇ ᴅᴇᴍᴀɪs ᴘᴀʀᴀ sᴇʀ ʀᴏᴜʙᴀᴅᴏ! (${vitima.gold} ɢᴏʟᴅs)`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      // 🔥 DETERMINA O RESULTADO (50% SUCESSO / 50% FALHA)
      const sucesso = Math.random() < 0.5;

      let mensagem = "";
      let goldRoubado = 0;
      let xpPerdido = 0;

      if (sucesso) {
        // 🔥 SUCESSO: Rouba entre 20% e 30% do gold da vítima
        const percentual = Math.floor(Math.random() * 11) + 20; // 20% a 30%
        goldRoubado = Math.floor(vitima.gold * (percentual / 100));

        // Garante que não rouba mais do que a vítima tem
        if (goldRoubado > vitima.gold) goldRoubado = vitima.gold;

        // Transfere o gold
        vitima.gold -= goldRoubado;
        ladrao.gold += goldRoubado;

        mensagem = `🥷 *ʀᴏᴜʙᴏ ʀᴇᴀʟɪᴢᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*

━━━━━━━━━━━━━━━━━━━━
💰 *ɢᴏʟᴅ ʀᴏᴜʙᴀᴅᴏ:* +${goldRoubado}
📊 *ᴘᴇʀᴄᴇɴᴛᴜᴀʟ:* ${percentual}% do gold da vítima

👤 *ᴠɪ́ᴛɪᴍᴀ:* @${vitima.pushName || vitima.lid.split('@')[0]}
🥷 *ʟᴀᴅʀᴀ̃ᴏ:* @${ladrao.pushName || ladrao.lid.split('@')[0]}

━━━━━━━━━━━━━━━━━━━━
💰 *ɢᴏʟᴅ ᴀᴛᴜᴀʟ ᴅᴏ ʟᴀᴅʀᴀ̃ᴏ:* ${ladrao.gold}
💰 *ɢᴏʟᴅ ʀᴇsᴛᴀɴᴛᴇ ᴅᴀ ᴠɪ́ᴛɪᴍᴀ:* ${vitima.gold}`;

      } else {
        // 🔥 FALHA: Perde entre 3% e 7% de XP
        const percentualXp = Math.floor(Math.random() * 5) + 3; // 3% a 7%
        xpPerdido = Math.floor(ladrao.xp * (percentualXp / 100));

        // Garante que não perde mais XP do que tem
        if (xpPerdido > ladrao.xp) xpPerdido = ladrao.xp;

        ladrao.xp -= xpPerdido;

        mensagem = `❌ *ᴛᴇɴᴛᴀᴛɪᴠᴀ ᴅᴇ ʀᴏᴜʙᴏ ғᴀʟʜᴏᴜ!*

━━━━━━━━━━━━━━━━━━━━
💀 *xᴘ ᴘᴇʀᴅɪᴅᴏ:* -${xpPerdido}
📊 *ᴘᴇʀᴄᴇɴᴛᴜᴀʟ:* ${percentualXp}% do seu XP

🥷 *ʟᴀᴅʀᴀ̃ᴏ:* @${ladrao.pushName || ladrao.lid.split('@')[0]}
👤 *ᴠɪ́ᴛɪᴍᴀ:* @${vitima.pushName || vitima.lid.split('@')[0]}

━━━━━━━━━━━━━━━━━━━━
📈 *xᴘ ᴀᴛᴜᴀʟ:* ${ladrao.xp}`;
      }

      // Registra o roubo
      ladrao.ultimoRoubo = agora;

      // Salva no banco de dados
      salvarDb(db);

      // Menciona ambos os usuários
      const mencionados = [ladraoJid, vitimaJid];

      mensagem += `\n\n⏳ ᴘʀᴏ́xɪᴍᴏ ʀᴏᴜʙᴏ ᴇᴍ 15 ᴍɪɴᴜᴛᴏs.`;

      await conn.sendMessage(from, {
        text: mensagem,
        mentions: mencionados,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro roubar:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴛᴇɴᴛᴀʀ ʀᴏᴜʙᴀʀ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "RPG",
  "menuSection": "Economia e itens",
  "usage": "roubar @usuario",
  "description": "Uso: .roubar @usuario"
});
