// Menu: Grupos - Configuração | Comando: set-perfil
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/set-perfil.js
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  permissions: { group: true, admin: true, botAdmin: true },
  name: "set-perfil",
  description: "ᴛʀᴏᴄᴀ ᴀ ғᴏᴛᴏ ᴅᴇ ᴘᴇʀғɪʟ ᴅᴏ ɢʀᴜᴘᴏ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const bot = config.botName || "LukaModzz";
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ só ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: bot, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      let imageBuffer = null;

      if (msg.message?.imageMessage) {
        imageBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      }
      else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const quotedMsg = { message: { imageMessage: quoted.imageMessage }, key: msg.key };
        imageBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
      }

      if (!imageBuffer) {
        return conn.sendMessage(from, {
          text: "❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ .sᴇᴛ-ᴘᴇʀғɪʟ",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: bot, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // O Baileys + jimp cuidam do redimensionamento automaticamente
      await conn.updateProfilePicture(from, imageBuffer);

      await conn.sendMessage(from, {
        text: "✅ ғᴏᴛᴏ ᴅᴏ ɢʀᴜᴘᴏ ᴀᴛᴜᴀʟɪᴢᴀᴅᴀ!",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: bot, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro set-perfil:", error);
      await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ ᴀᴏ ᴛʀᴏᴄᴀʀ ғᴏᴛᴏ ᴅᴏ ɢʀᴜᴘᴏ." }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "set-perfil (responda à imagem)",
  "description": "Uso: .set-perfil (responda à imagem)"
});
