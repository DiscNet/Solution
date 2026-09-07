// Menu: RPG - Administração | Comando: ver-ficha
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/ver-ficha.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");

function carregarDb() {
  if (!fs.existsSync(dbPath)) return { usuarios: {} };
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

module.exports = {
  permissions: { owner: true },
  name: "ver-ficha",
  aliases: ["verficha", "fichauser", "userficha"],
  description: "ᴠᴇʀ ᴀ ғɪᴄʜᴀ ᴅᴇ ᴏᴜᴛʀᴏ ᴜsᴜᴀ́ʀɪᴏ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // 🔥 VERIFICA SE É O DONO
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const isOwner = sender === ownerLid || sender.replace(/[^0-9]/g, "") === ownerLid.replace(/[^0-9]/g, "");

      if (!isOwner) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // 🔥 VERIFICA SE MARCOU ALGUÉM
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

      if (!mentionedJid || mentionedJid.length === 0) {
        return await conn.sendMessage(from, {
          text: `❌ ᴍᴀʀǫᴜᴇ ᴏ ᴜsᴜᴀ́ʀɪᴏ ǫᴜᴇ ᴅᴇsᴇᴊᴀ ᴠᴇʀ ᴀ ғɪᴄʜᴀ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: .ver-ficha @ᴜsᴜᴀʀɪᴏ`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const alvoJid = mentionedJid[0];

      // Carrega o banco de dados
      const db = carregarDb();

      // 🔥 VERIFICA SE O USUÁRIO ESTÁ REGISTRADO
      if (!db.usuarios[alvoJid]) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴜsᴜᴀ́ʀɪᴏ ᴀɪɴᴅᴀ ɴᴀ̃ᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ ɴᴏ ʀᴘɢ!",
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const ficha = db.usuarios[alvoJid];

      // 🔥 PEGA O NOME DO ALVO
      let nomeAlvo = ficha.pushName || alvoJid.split('@')[0];
      if (alvoJid.endsWith("@s.whatsapp.net")) {
        try {
          const contact = await conn.contactQuery(alvoJid);
          if (contact?.name) nomeAlvo = contact.name;
        } catch (e) {}
      }

      // Calcula XP necessário para próximo nível
      const xpNecessario = ficha.level * 100;
      const progresso = Math.floor((ficha.xp / xpNecessario) * 20);
      const barra = "▰".repeat(progresso) + "▱".repeat(20 - progresso);

      // Emojis das classes
      const emojis = {
        "Arqueiro": "🏹",
        "Assassino": "🗡️"
      };
      const emoji = emojis[ficha.classe] || "⚔️";

      // Monta a mensagem com fonte smallcap
      const texto = `🔍 *ғ ɪ ᴄ ʜ ᴀ  ᴅ ᴇ  ʀ ᴘ ɢ  -  ᴅ ᴏ ɴ ᴏ*

━━━━━━━━━━━━━━━━━━━━
👤 ɴᴏᴍᴇ: ${ficha.pushName}
📱 ᴊɪᴅ: ${alvoJid}
🏷️ ᴄʟᴀssᴇ: ${ficha.classe}
📊 ʟᴇᴠᴇʟ: ${ficha.level}
⭐ ᴘᴀᴛᴇɴᴛᴇ: ${ficha.patente}
💰 ɢᴏʟᴅ: ${ficha.gold}

📈 ᴇxᴘ: ${ficha.xp}/${xpNecessario}
${barra}

━━━━━━━━━━━━━━━━━━━━
❤️ ᴠɪᴅᴀ: ${ficha.vida}/${ficha.vidaMax}
💙 ᴍᴀɴᴀ: ${ficha.mana}/${ficha.manaMax}
⚔️ ᴅᴀɴᴏ: ${ficha.dano}
🛡️ ᴅᴇғᴇsᴀ: ${ficha.defesa}
💨 ᴀɢɪʟɪᴅᴀᴅᴇ: ${ficha.agilidade}
💥 ᴄʀɪᴛɪᴄᴏ: ${ficha.critico}%

━━━━━━━━━━━━━━━━━━━━
🗡️ ᴀʀᴍᴀs: ${ficha.arma.length > 0 ? ficha.arma.join(", ") : "ɴᴇɴʜᴜᴍᴀ"}
⚔️ ᴇsᴘᴀᴅᴀs: ${ficha.espada.length > 0 ? ficha.espada.join(", ") : "ɴᴇɴʜᴜᴍᴀ"}
🛡️ ᴇsᴄᴜᴅᴏs: ${ficha.escudo.length > 0 ? ficha.escudo.join(", ") : "ɴᴇɴʜᴜᴍ"}
🐾 ᴘᴇᴛs: ${ficha.pet.length > 0 ? ficha.pet.join(", ") : "ɴᴇɴʜᴜᴍ"}

🎯 ʜᴀʙɪʟɪᴅᴀᴅᴇs: ${ficha.habilidades.length > 0 ? ficha.habilidades.join(", ") : "ɴᴇɴʜᴜᴍᴀ"}

📦 ɪᴛᴇɴs: ${ficha.itens.length > 0 ? ficha.itens.join(", ") : "ɴᴇɴʜᴜᴍ"}
━━━━━━━━━━━━━━━━━━━━

📌 ᴄᴏɴsᴜʟᴛᴀ ʀᴇᴀʟɪᴢᴀᴅᴀ ᴘᴏʀ: ${pushName}`;

      await conn.sendMessage(from, {
        text: texto,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });

    } catch (error) {
      console.error("❌ Erro ver-ficha:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ғɪᴄʜᴀ!*\n\n📌 ${error.message}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "RPG",
  "menuSection": "Administração",
  "usage": "ver-ficha @usuario",
  "description": "Uso: .ver-ficha @usuario"
});
