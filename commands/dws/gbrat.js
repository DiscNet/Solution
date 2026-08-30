// commands/midia/gbrat.js
const config = require("../../config/config");
const axios = require("axios");

module.exports = {
  name: "gbrat",
  description: "🎨 Gera GIF animado Brat",

  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const text = args.join(' ') || 'brat';

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      // 🔥 Baixa o vídeo como buffer e envia
      const apiUrl = `https://tokito-apis.com.br/api/stickers/brat-vid?text=${encodeURIComponent(text)}&apikey=${API_KEY}`;
      
      const response = await axios.get(apiUrl, { 
        responseType: "arraybuffer",
        timeout: 30000 
      });
      
      const videoBuffer = Buffer.from(response.data);

      if (videoBuffer.length < 5000) {
        throw new Error("Vídeo muito pequeno");
      }

      await conn.sendMessage(from, {
        video: videoBuffer,
        gifPlayback: true,
        caption: `🎨 *ʙʀᴀᴛ ɢɪғ*\n📝 ${text}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ɢʙʀᴀᴛ:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ɢɪғ ʙʀᴀᴛ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};