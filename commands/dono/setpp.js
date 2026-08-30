// commands/setpp.js
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");

module.exports = {
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
          text: "❌ Envie ou responda a uma imagem com .setpp",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      // O Baileys + jimp cuidam do redimensionamento automaticamente
      await conn.updateProfilePicture(conn.user.id, imageBuffer);

      await conn.sendMessage(from, {
        text: "✅ Foto de perfil do bot atualizada!",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ", serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro setpp:", error);
      await conn.sendMessage(from, { text: "❌ Erro ao trocar foto de perfil." }, { quoted: msg });
    }
  }
};
