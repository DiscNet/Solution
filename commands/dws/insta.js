// commands/midia/insta.js
const config = require("../../config/config");
const { sendButtons } = require('gifted-btns');
const axios = require("axios");

module.exports = {
  name: "insta",
  description: "𝑩𝒂𝒊𝒙𝒂 𝒗𝒊́𝒅𝒆𝒐 𝒐𝒖 á𝒖𝒅𝒊𝒐 𝒅𝒐 𝑰𝒏𝒔𝒕𝒂𝒈𝒓𝒂𝒎",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }
      
      if (!args[0]) {
        return await conn.sendMessage(from, { 
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ʟɪɴᴋ ᴅᴏ ɪɴsᴛᴀɢʀᴀᴍ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}insta https://www.instagram.com/reel/xxxxx`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const link = args[0];
      await conn.sendMessage(from, { react: { text: "⏳", key: msg.key } });

      // 🔥 API Tokito para Instagram
      const apiUrl = `https://tokito-apis.site/api/insta-video?url=${encodeURIComponent(link)}&apikey=${API_KEY}`;

      // Primeiro envia o vídeo
      await conn.sendMessage(from, {
        video: { url: apiUrl },
        mimetype: "video/mp4",
        caption: null,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      await conn.sendMessage(from, { react: { text: "📸", key: msg.key } });

    } catch (error) {
      console.error("ᴇʀʀᴏ ɪɴsᴛᴀ:", error);
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴘʀᴏᴄᴇssᴀʀ ᴏ ʟɪɴᴋ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};