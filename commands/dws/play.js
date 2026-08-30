const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/play.js
const config = require("../../config/config");
const axios = require("axios");

module.exports = {
  name: "play",
  description: "𝑷𝒆𝒔𝒒𝒖𝒊𝒔𝒂 𝒆 𝒕𝒐𝒄𝒂 𝒎ú𝒔𝒊𝒄𝒂 𝒏𝒐 𝒀𝒐𝒖𝑻𝒖𝒃𝒆",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const q = args.join(" ");
      
      if (!q || !q.trim()) {
        return await conn.sendMessage(from, { 
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴍᴇ ᴅᴀ ᴍᴜ́sɪᴄᴀ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}play mc poze`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🎧", key: msg.key } });

      // 🔥 API Tokito - youtube-search
      const searchUrl = `https://tokito-apis.com.br/api/youtube-search?query=${encodeURIComponent(q)}&apikey=${API_KEY}`;
      const { data: json } = await axios.get(searchUrl, { timeout: 15000 });

      if (!json.status || !json.resultado || !json.resultado.length) {
        return await conn.sendMessage(from, { 
          text: "❌ *ɴᴇɴʜᴜᴍ ʀᴇsᴜʟᴛᴀᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const video = json.resultado[0];
      const title = video.title;
      const channel = video.author?.name || "Desconhecido";
      const duration = video.timestamp || "N/A";
      const thumbnail = video.thumbnail;
      const url = video.url;

      // 🔥 Canvas da Tokito COM apikey
      const cardUrl = `https://tokito-apis.com.br/canvas/youtube?capa=${encodeURIComponent(thumbnail)}&titulo=${encodeURIComponent(title)}&canal=${encodeURIComponent(channel)}&duracao=${encodeURIComponent(duration)}&url=${encodeURIComponent(url)}&apikey=${API_KEY}`;

      // Envia imagem
      await conn.sendMessage(from, {
        image: { url: cardUrl },
        caption: null,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      // 🔥 Áudio
      const audioUrl = `https://tokito-apis.com.br/api/youtube-audio?q=${encodeURIComponent(url)}&apikey=${API_KEY}`;
      
      try {
        await conn.sendMessage(from, {
          audio: { url: audioUrl },
          mimetype: "audio/mpeg",
          ptt: false,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } catch (err) {
        const fallbackAudio = `https://tokito-apis.com.br/api/youtube-audio?q=${encodeURIComponent(`${title} ${channel}`)}&apikey=${API_KEY}`;
        await conn.sendMessage(from, {
          audio: { url: fallbackAudio },
          mimetype: "audio/mpeg",
          ptt: false,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🎧", key: msg.key } });

    } catch (error) {
      console.error("ᴘʟᴀʏ:", error);
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴜsᴄᴀʀ ᴀ ᴍᴜ́sɪᴄᴀ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};