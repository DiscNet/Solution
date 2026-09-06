const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");
const { searchVideos } = require("../../functions/youtubeClient");

module.exports = {
  name: "ytsearch",
  description: "ᴘᴇsǫᴜɪsᴀ ᴠɪ́ᴅᴇᴏs ɴᴏ ʏᴏᴜᴛᴜʙᴇ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

    try {
      const query = args.join(" ").trim();
      if (!query) {
        return conn.sendMessage(from, {
          text: `❌ *ᴅɪɢɪᴛᴇ ᴏ ɴᴏᴍᴇ ᴅᴏ ᴠɪ́ᴅᴇᴏ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}ytsearch matue 1993`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: bot,
              serverMessageId: 116
            }
          }
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "🔍", key: msg.key } });

      const results = await searchVideos(query, 5);
      if (!results.length) {
        return conn.sendMessage(from, {
          text: `❌ *ɴᴇɴʜᴜᴍ ʀᴇsᴜʟᴛᴀᴅᴏ ᴘᴀʀᴀ:* ${query}`
        }, { quoted: createStatusQuoted(msg) });
      }

      const rows = results.map((video) => {
        const shortTitle = video.title.length > 45 ? `${video.title.slice(0, 42)}...` : video.title;
        return {
          id: `${prefix}ytplay ${video.url}`,
          title: `🎬 ${shortTitle}`,
          description: `⏱️ ${video.duration} · 👤 ${video.channel}`
        };
      });

      await sendInteractiveMessage(conn, from, {
        text: `🔎 *ʏᴏᴜᴛᴜʙᴇ sᴇᴀʀᴄʜ — ${query}*\n📊 ʀᴇsᴜʟᴛᴀᴅᴏs: ${results.length}\n\n📌 sᴇʟᴇᴄɪᴏɴᴇ ᴘᴀʀᴀ ᴀʙʀɪʀ:`,
        footer: "ᴅᴀᴅᴏs ᴏʙᴛɪᴅᴏs ᴘᴇʟᴏ ʏᴏᴜᴛᴜʙᴇɪ.ᴊs",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116
          }
        },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🎬 ʀᴇsᴜʟᴛᴀᴅᴏs",
              sections: [{ title: "📹 ᴠɪ́ᴅᴇᴏs", rows }]
            })
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🎵 ᴍᴘ3 ᴅᴏ 1º",
              id: `${prefix}ytmp3 ${results[0].url}`
            })
          }
        ]
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[ERROR] ytsearch | ERR_YOUTUBE_SEARCH", error);
      await conn.sendMessage(from, {
        text: "❌ *ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇ ᴘᴇsǫᴜɪsᴀʀ ɴᴏ ʏᴏᴜᴛᴜʙᴇ.*"
      }, { quoted: createStatusQuoted(msg) });
    }
  }
};
