const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/spotify.js
const config = require("../../config/config");
const axios = require("axios");

module.exports = {
  name: "spotify",
  aliases: ["sp"],
  description: "𝑩𝒖𝒔𝒄𝒂 𝒎𝒖́𝒔𝒊𝒄𝒂𝒔 𝒏𝒐 𝑺𝒑𝒐𝒕𝒊𝒇𝒚",
  async execute(conn, msg, args, from, axiosInstance, cmdName) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const tokitoApi = config.tokitoApi;
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      const cmd = texto.split(" ")[0].replace(prefix, "").trim();

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const q = args.join(" ");

      if (!q) {
        return await conn.sendMessage(from, {
          text: `❌ *ᴅɪɢɪᴛᴇ ᴏ ɴᴏᴍᴇ ᴅᴀ ᴍᴜ́sɪᴄᴀ!*\n\n🎧 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}${cmd} epoch`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "⌛", key: msg.key } });

      // 🔥 API Tokito - spotify-play
      const apiUrl = `https://tokito-apis.com.br/api/spotify-play?query=${encodeURIComponent(q)}&q=${encodeURIComponent(q)}&apikey=${tokitoApi}`;
      const { data } = await axios.get(apiUrl, { timeout: 15000 });

      if (!data || !data.status || !data.resultado) {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        return await conn.sendMessage(from, {
          text: "❌ *ᴍᴜ́sɪᴄᴀ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴀ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const m = data.resultado;
      const title = m.titulo || "Desconhecido";
      const artist = m.artista || "Desconhecido";
      const duration = m.duracao || "0:00";
      const cover = m.capa || "";
      const popularity = m.popularidade || 0;
      const album = m.album || "Desconhecido";
      const release = m.lancamento || "Desconhecido";
      const link = m.link || "";
      const downloadUrl = m.download_url || "";

      const caption = `🎧 *sᴘᴏᴛɪғʏ*\n━━━━━━━━━━━━━━━━━━━\n🎞️ *ᴛɪ́ᴛᴜʟᴏ:* ${title}\n👤 *ᴀʀᴛɪsᴛᴀ:* ${artist}\n💽 *ᴀ́ʟʙᴜᴍ:* ${album}\n⏱️ *ᴅᴜʀᴀᴄ̧ᴀ̃ᴏ:* ${duration}\n🔥 *ᴘᴏᴘᴜʟᴀʀɪᴅᴀᴅᴇ:* ${popularity}\n📅 *ʟᴀɴᴄ̧ᴀᴍᴇɴᴛᴏ:* ${release}\n━━━━━━━━━━━━━━━━━━━\n🔗 ${link}`;

      // Envia capa com informações
      if (cover) {
        await conn.sendMessage(from, {
          image: { url: cover },
          caption: caption,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } else {
        await conn.sendMessage(from, {
          text: caption,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      // Envia o áudio
      if (downloadUrl) {
        await conn.sendMessage(from, {
          audio: { url: downloadUrl },
          mimetype: "audio/mpeg",
          ptt: false,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("sᴘᴏᴛɪғʏ:", error);
      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴜsᴄᴀʀ ᴀ ᴍᴜ́sɪᴄᴀ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};