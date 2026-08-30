// commands/midia/ytplay.js
const config = require("../../config/config");
const { sendButtons } = require('gifted-btns');
const axios = require("axios");
const readmore = String.fromCharCode(8206).repeat(4001);

module.exports = {
  name: "ytplay",
  description: "𝑷𝒆𝒔𝒒𝒖𝒊𝒔𝒂𝒓 𝒗𝒊́𝒅𝒆𝒐 𝒏𝒐 𝒀𝒐𝒖𝑻𝒖𝒃𝒆 𝒆 𝒆𝒔𝒄𝒐𝒍𝒉𝒆𝒓 𝒆𝒏𝒕𝒓𝒆 𝒂́𝒖𝒅𝒊𝒐 𝒐𝒖 𝒗𝒊́𝒅𝒆𝒐",
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
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ʟɪɴᴋ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}ytplay https://youtu.be/xxxxx`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const link = args[0];
      await conn.sendMessage(from, { react: { text: "🎬", key: msg.key } });

      // 🔥 Busca na API Tokito
      const searchUrl = `https://tokito-apis.com.br/api/youtube-search?query=${encodeURIComponent(link)}&apikey=${API_KEY}`;
      const { data: json } = await axios.get(searchUrl, { timeout: 15000 });

      if (!json.status || !json.resultado || !json.resultado.length) {
        return await conn.sendMessage(from, { 
          text: "❌ *ᴠɪ́ᴅᴇᴏ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const v = json.resultado[0];
      const title = v.title || "Título indisponível";
      const channel = v.author?.name || "Canal desconhecido";
      const duration = v.timestamp || "N/A";
      const views = v.views ? formatarViews(v.views) : "N/A";
      const thumbnail = v.thumbnail;
      const url = v.url;

      // Canvas
      const cardUrl = `https://tokito-apis.com.br/canvas/youtube?capa=${encodeURIComponent(thumbnail)}&titulo=${encodeURIComponent(title)}&canal=${encodeURIComponent(channel)}&duracao=${encodeURIComponent(duration)}&url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

      const caption = ` 🎬 | ${title}\n 👤 | ${channel}\n ⏱️ | ${duration}\n 👁️ | ${views}\n 🔗 | ${url}`;

      await sendButtons(conn, from, {
        text: caption,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ · ʏᴏᴜᴛᴜʙᴇ ᴘʟᴀʏᴇʀ",
        image: { url: cardUrl },
        buttons: [
          { id: `${prefix}ytmp4 ${url}`, text: "📹 ᴠɪ́ᴅᴇᴏ" },
          { id: `${prefix}ytmp3 ${url}`, text: "🎵 ᴀ́ᴜᴅɪᴏ" }
        ],
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

    } catch (error) {
      console.error("ʏᴛᴘʟᴀʏ:", error);
      await conn.sendMessage(from, { 
        text: "❌ *ʟɪɴᴋ ɪɴᴠᴀ́ʟɪᴅᴏ ᴏᴜ ᴠɪ́ᴅᴇᴏ ɪɴᴅɪsᴘᴏɴɪ́ᴠᴇʟ.*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

function formatarViews(n) {
  if (!n) return "N/A";
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
  return n.toString();
}