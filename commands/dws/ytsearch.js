const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/ytsearch.js
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");
const axios = require("axios");

module.exports = {
  name: "ytsearch",
  description: "𝑷𝒆𝒔𝒒𝒖𝒊𝒔𝒂 𝒗𝒊́𝒅𝒆𝒐𝒔 𝒏𝒐 𝒀𝒐𝒖𝑻𝒖𝒃𝒆",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!args || args.length === 0) {
        return conn.sendMessage(from, {
          text: `❌ *ᴅɪɢɪᴛᴇ ᴏ ɴᴏᴍᴇ ᴅᴏ ᴠɪ́ᴅᴇᴏ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}ytsearch matue 1993`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🔍", key: msg.key } });

      const pesquisa = args.join(" ");
      
      await conn.sendMessage(from, { 
        text: `🔍 *ᴘᴇsǫᴜɪsᴀɴᴅᴏ:* ${pesquisa}...`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      // 🔥 API Tokito
      const url = `https://tokito-apis.com.br/api/youtube-search?query=${encodeURIComponent(pesquisa)}&apikey=${API_KEY}`;
      const { data: json } = await axios.get(url, { timeout: 15000 });

      if (!json.status || !json.resultado || !json.resultado.length) {
        return await conn.sendMessage(from, { 
          text: `❌ *ɴᴇɴʜᴜᴍ ʀᴇsᴜʟᴛᴀᴅᴏ ᴘᴀʀᴀ:* ${pesquisa}`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const lista = json.resultado.slice(0, 5);

      // 🔥 Monta a lista interativa
      const rows = lista.map((v, i) => ({
        id: `${prefix}ytplay ${v.url}`,
        title: `   🎬 ${v.title.length > 45 ? v.title.substring(0, 42) + "..." : v.title}`,
        description: `⏱️ ${v.timestamp || "N/A"} · 👤 ${v.author?.name || "Desconhecido"}`
      }));

      const menuText = `🔎 *ʏᴏᴜᴛᴜʙᴇ sᴇᴀʀᴄʜ — ${pesquisa}*\n📊 ʀᴇsᴜʟᴛᴀᴅᴏs: ${lista.length}\n\n📌 sᴇʟᴇᴄɪᴏɴᴇ ᴘᴀʀᴀ ᴛᴏᴄᴀʀ:`;

      await sendInteractiveMessage(conn, from, {
        text: menuText,
        footer: "ᴄʟɪǫᴜᴇ ᴘᴀʀᴀ ʀᴇᴘʀᴏᴅᴜᴢɪʀ",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🎬 ʀᴇsᴜʟᴛᴀᴅᴏs",
              sections: [
                {
                  title: "📹 ᴠɪ́ᴅᴇᴏs ᴇɴᴄᴏɴᴛʀᴀᴅᴏs",
                  rows: rows
                }
              ]
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🎵 ᴍᴘ3 ᴅᴏ 1º",
              id: `${prefix}ytmp3 ${lista[0]?.url || ""}`
            })
          }
        ]
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ʏᴛsᴇᴀʀᴄʜ:", error);
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ɴᴀ ᴘᴇsǫᴜɪsᴀ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};