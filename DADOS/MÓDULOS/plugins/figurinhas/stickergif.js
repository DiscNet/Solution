// Menu: Figurinhas - Criação | Comando: stickergif
// commands/sticker_gif.js (converter GIF/MP4 para sticker animado)
const config = require("../../../config/config");

module.exports = {
  name: "stickergif",
  description: "𝑪𝒐𝒏𝒗𝒆𝒓𝒕𝒆𝒓 𝑮𝑰𝑭 𝒐𝒖 𝒗𝒊𝒅𝒆𝒐 𝒆𝒎 𝒔𝒕𝒊𝒄𝒌𝒆𝒓 𝒂𝒏𝒊𝒎𝒂𝒅𝒐",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";

      const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;

      if (!quotedMsg || !quotedMsg.videoMessage) {
        await conn.sendMessage(from, {
          text: `❌ *ᴘᴏʀ ғᴀᴠᴏʀ, ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍ ɢɪғ ᴏᴜ ᴠíᴅᴇᴏ ᴄᴜʀᴛᴏ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ʀᴇsᴘᴏɴᴅᴀ ᴜᴍ ᴠíᴅᴇᴏ ᴄᴏᴍ ${prefix}stickergif`
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ *ᴄᴏɴᴠᴇʀᴛᴇɴᴅᴏ ᴘᴀʀᴀ sᴛɪᴄᴋᴇʀ ᴀɴɪᴍᴀᴅᴏ...*" }, { quoted: msg });

      const videoUrl = quotedMsg.videoMessage.url;
      const response = await axiosInstance.get(videoUrl, { responseType: 'arraybuffer' });
      const videoBuffer = Buffer.from(response.data);

      await conn.sendMessage(from, {
        sticker: videoBuffer,
        isAnimated: true
      }, { quoted: msg });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro:", error);
      await conn.sendMessage(from, { text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴏɴᴠᴇʀᴛᴇʀ!*" }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Criação",
  "usage": "stickergif (responda à imagem ou vídeo)",
  "description": "Uso: .stickergif (responda à imagem ou vídeo)"
});
