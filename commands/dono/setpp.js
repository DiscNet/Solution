// Menu: Dono - Configuração | Comando: setpp
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/setpp.js
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
  permissions: { owner: true },
  name: "setpp",
  description: "𝑻𝒓𝒐𝒄𝒂 𝒂 𝒇𝒐𝒕𝒐 𝒅𝒆 𝒑𝒆𝒓𝒇𝒊𝒍 𝒅𝒐 𝒃𝒐𝒕",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

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
          text: "❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ .setpp",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // O Baileys + jimp cuidam do redimensionamento automaticamente
      await conn.updateProfilePicture(conn.user.id, imageBuffer);

      await conn.sendMessage(from, {
        text: "✅ ғᴏᴛᴏ ᴅᴇ ᴘᴇʀғɪʟ ᴅᴏ ʙᴏᴛ ᴀᴛᴜᴀʟɪᴢᴀᴅᴀ!",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ", serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro setpp:", error);
      await conn.sendMessage(from, { text: "❌ ᴇʀʀᴏ ᴀᴏ ᴛʀᴏᴄᴀʀ ғᴏᴛᴏ ᴅᴇ ᴘᴇʀғɪʟ." }, { quoted: msg });
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Configuração",
  "usage": "setpp (responda à imagem)",
  "description": "Uso: .setpp (responda à imagem)"
});
