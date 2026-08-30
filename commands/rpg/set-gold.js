// commands/dono/set-gold.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

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
  name: "set-gold",
  aliases: ["setgold", "goldset", "definirgold"],
  description: "ᴅᴇғɪɴᴇ ᴀ Qᴜᴀɴᴛɪᴅᴀᴅᴇ ᴅᴇ ɢᴏʟᴅ ᴅᴇ ᴜᴍ ᴜsᴜᴀ́ʀɪᴏ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
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
          quoted: {
            key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" },
            message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } }
          }
        });
      }

      // 🔥 VERIFICA SE MARCOU ALGUÉM
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
      
      if (!mentionedJid || mentionedJid.length === 0) {
        return await conn.sendMessage(from, {
          text: `❌ ᴍᴀʀǫᴜᴇ ᴏ ᴜsᴜᴀ́ʀɪᴏ ᴇ ɪɴғᴏʀᴍᴇ ᴀ Qᴜᴀɴᴛɪᴅᴀᴅᴇ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: .set-gold @usuario 1000`,
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
      
      // 🔥 VERIFICA SE FOI INFORMADA A QUANTIDADE
      if (!args[1]) {
        return await conn.sendMessage(from, {
          text: `❌ ɪɴғᴏʀᴍᴇ ᴀ Qᴜᴀɴᴛɪᴅᴀᴅᴇ ᴅᴇ ɢᴏʟᴅ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: .set-gold @usuario 1000`,
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

      const quantidade = parseInt(args[1]);
      
      // 🔥 VERIFICA SE A QUANTIDADE É VÁLIDA
      if (isNaN(quantidade) || quantidade < 0) {
        return await conn.sendMessage(from, {
          text: "❌ ᴠᴀʟᴏʀ ɪɴᴠᴀ́ʟɪᴅᴏ! ᴅɪɢɪᴛᴇ ᴜᴍ ɴᴜ́ᴍᴇʀᴏ ᴠᴀ́ʟɪᴅᴏ ᴇ ᴘᴏsɪᴛɪᴠᴏ.",
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

      const alvo = db.usuarios[alvoJid];
      const goldAntigo = alvo.gold;
      
      // 🔥 DEFINE O NOVO GOLD
      alvo.gold = quantidade;
      
      // Salva no banco de dados
      salvarDb(db);

      // 🔥 PEGA O NOME DO ALVO
      let nomeAlvo = alvo.pushName || alvoJid.split('@')[0];
      if (alvoJid.endsWith("@s.whatsapp.net")) {
        try {
          const contact = await conn.contactQuery(alvoJid);
          if (contact?.name) nomeAlvo = contact.name;
        } catch (e) {}
      }

      await conn.sendMessage(from, {
        text: `✅ *ɢᴏʟᴅ ᴀʟᴛᴇʀᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*

━━━━━━━━━━━━━━━━━━━━
👤 *ᴜsᴜᴀ́ʀɪᴏ:* @${nomeAlvo}
📱 *ᴊɪᴅ:* \`${alvoJid}\`

💰 *ɢᴏʟᴅ ᴀɴᴛɪɢᴏ:* ${goldAntigo}
💰 *ɢᴏʟᴅ ɴᴏᴠᴏ:* ${quantidade}

━━━━━━━━━━━━━━━━━━━━
📌 ᴀʟᴛᴇʀᴀᴄ̧ᴀ̃ᴏ ʀᴇᴀʟɪᴢᴀᴅᴀ ᴘᴏʀ: ${pushName}`,
        mentions: [alvoJid],
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
        quoted: {
          key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" },
          message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } }
        }
      });

    } catch (error) {
      console.error("❌ Erro set-gold:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴀʟᴛᴇʀᴀʀ ᴏ ɢᴏʟᴅ!*\n\n📌 ${error.message}`,
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