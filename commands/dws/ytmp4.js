// commands/midia/ytmp4.js
const config = require("../../config/config");
const axios = require("axios");

module.exports = {
  name: "ytmp4",
  description: "𝑩𝒂𝒊𝒙𝒂 𝒗𝒊́𝒅𝒆𝒐 𝒅𝒐 𝒀𝒐𝒖𝑻𝒖𝒃𝒆",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!args[0]) {
        return await conn.sendMessage(from, { 
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ʟɪɴᴋ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ytmp4 https://youtu.be/xxxxx`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const link = args[0];
      
      await conn.sendMessage(from, { react: { text: "📹", key: msg.key } });
      
      const loadingMsg = await conn.sendMessage(from, { 
        text: "📥 *ᴀɢᴜᴀʀᴅᴇ ᴇɴǫᴜᴀɴᴛᴏ ғᴀᴄ̧ᴏ ᴏ ᴅᴏᴡɴʟᴏᴀᴅ...*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });

      // 🔥 API youtube-video com link COMPLETO (sem encodeURIComponent)
      const apiUrl = `https://tokito-apis.com.br/api/youtube-video?q=${link}&apikey=${API_KEY}`;
      
      const response = await axios.get(apiUrl, { 
        responseType: "arraybuffer",
        timeout: 180000
      });
      
      const videoBuffer = Buffer.from(response.data);

      if (videoBuffer.length < 10000) {
        throw new Error("Vídeo muito pequeno");
      }

      await conn.sendMessage(from, { 
        text: "✅ *ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏɴᴄʟᴜɪ́ᴅᴏ! ᴇɴᴠɪᴀɴᴅᴏ...*",
        edit: loadingMsg.key
      });

      await conn.sendMessage(from, {
        video: videoBuffer,
        mimetype: "video/mp4",
        caption: null,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ʏᴛᴍᴘ4:", error.message);
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴀɪxᴀʀ ᴏ ᴠɪ́ᴅᴇᴏ! ᴛᴇɴᴛᴇ ᴏ ᴏᴜᴛʀᴏ ʟɪɴᴋ.*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};