// Menu: Dono - Aluguel | Comando: permanecer-bot
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/dono/permanecer-bot.js
const config = require("../../config/config");
const aluguel = require("../../functions/aluguel");

module.exports = {
  permissions: { owner: true },
  name: "permanecer-bot",
  aliases: ["permanente", "botpermanente"],
  description: "ᴛᴏʀɴᴀ ᴏ ʙᴏᴛ ᴘᴇʀᴍᴀɴᴇɴᴛᴇ ɴᴏ ɢʀᴜᴘᴏ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";

      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      const cmd = texto.split(" ")[0].replace(prefix, "").trim() || module.exports.name;

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // VERIFICA SE É O DONO
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

      // PEGA O GRUPO (menção ou argumento)
      let grupoJid = null;
      const mentionedJid = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;

      if (mentionedJid && mentionedJid.length > 0) {
        grupoJid = mentionedJid[0];
      } else if (args[0]) {
        let grupo = args[0];
        if (!grupo.endsWith("@g.us")) {
          const num = grupo.replace(/[^0-9]/g, "");
          if (num.length > 0) {
            grupoJid = num + "@g.us";
          }
        } else {
          grupoJid = grupo;
        }
      }

      if (!grupoJid || !grupoJid.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: `❌ ᴍᴀʀǫᴜᴇ ᴏ ɢʀᴜᴘᴏ ᴏᴜ ᴘᴀssᴇ ᴏ ʟɪᴅ!\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} @g.us`,
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

      // VERIFICA SE O GRUPO EXISTE
      let grupoNome = grupoJid;
      try {
        const metadata = await conn.groupMetadata(grupoJid);
        grupoNome = metadata.subject || grupoJid;
      } catch (e) {
        return await conn.sendMessage(from, {
          text: "❌ ɢʀᴜᴘᴏ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ ᴏᴜ ɪɴᴠᴀ́ʟɪᴅᴏ!",
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

      // ATIVA PERMANENTE
      aluguel.ativarPermanente(grupoJid);

      await conn.sendMessage(from, {
        text: `✅ *ʙᴏᴛ ᴛᴏʀɴᴀᴅᴏ ᴘᴇʀᴍᴀɴᴇɴᴛᴇ!*\n\n📌 *ɢʀᴜᴘᴏ:* ${grupoNome}\n🆔 \`${grupoJid}\`\n♾️ *sᴛᴀᴛᴜs:* ᴘᴇʀᴍᴀɴᴇɴᴛᴇ\n\n📌 ᴏ ʙᴏᴛ ɴᴀ̃ᴏ ᴇxᴘɪʀᴀʀᴀ́ ɴᴇsᴛᴇ ɢʀᴜᴘᴏ!`,
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

    } catch (error) {
      console.error("❌ Erro permanecer-bot:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴛᴏʀɴᴀʀ ᴏ ʙᴏᴛ ᴘᴇʀᴍᴀɴᴇɴᴛᴇ!*\n\n📌 ${error.message}`,
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
  "menuCategory": "Dono",
  "menuSection": "Aluguel",
  "description": "torna o bot permanente no grupo"
});
