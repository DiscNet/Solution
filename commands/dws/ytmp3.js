const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/ytmp3.js
const config = require("../../config/config");
const axios = require("axios");

module.exports = {
  name: "ytmp3",
  description: "𝑩𝒂𝒊𝒙𝒂 𝒂́𝒖𝒅𝒊𝒐 𝒅𝒐 𝒀𝒐𝒖𝑻𝒖𝒃𝒆",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!args[0]) {
        return await conn.sendMessage(from, { 
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ʟɪɴᴋ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ytmp3 https://youtu.be/xxxxx`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      const link = args[0];
      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } });

      // 🔥 API Tokito - youtube-audio
      const apiUrl = `https://tokito-apis.com.br/api/youtube-audio?q=${encodeURIComponent(link)}&apikey=${API_KEY}`;

      await conn.sendMessage(from, {
        audio: { url: apiUrl },
        mimetype: "audio/mpeg",
        fileName: "audio.mp3",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ʏᴛᴍᴘ3:", error);
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴀɪxᴀʀ ᴏ ᴀ́ᴜᴅɪᴏ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};