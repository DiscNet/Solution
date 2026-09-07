// Menu: Downloads - YouTube | Comando: ytplay
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { sendButtons } = require("gifted-btns");
const { getVideo } = require("../../functions/youtubeClient");

module.exports = {
  name: "ytplay",
  description: "ᴍᴏsᴛʀᴀ ᴜᴍ ᴠɪ́ᴅᴇᴏ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ ᴇ ᴏᴘᴄ̧ᴏ̃ᴇs ᴅᴇ ᴅᴏᴡɴʟᴏᴀᴅ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

    try {
      const target = args.join(" ").trim();
      if (!target) {
        return conn.sendMessage(from, {
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴜᴍ ʟɪɴᴋ ᴏᴜ ɴᴏᴍᴇ ᴅᴏ ᴠɪ́ᴅᴇᴏ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}ytplay https://youtu.be/xxxxx`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "🎬", key: msg.key } });

      const video = await getVideo(target);
      if (!video) {
        return conn.sendMessage(from, {
          text: "❌ *ᴠɪ́ᴅᴇᴏ ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ.*"
        }, { quoted: createStatusQuoted(msg) });
      }

      const text = [
        `🎬 *${video.title}*`,
        `👤 ${video.channel}`,
        `⏱️ ${video.duration}`,
        `👁️ ${video.views}`,
        `🔗 ${video.url}`
      ].join("\n");

      await sendButtons(conn, from, {
        text,
        footer: "ʏᴏᴜᴛᴜʙᴇɪ.ᴊs",
        image: video.thumbnail ? { url: video.thumbnail } : undefined,
        buttons: [
          { id: `${prefix}ytmp4 ${video.url}`, text: "📹 ᴠɪ́ᴅᴇᴏ" },
          { id: `${prefix}ytmp3 ${video.url}`, text: "🎵 ᴀ́ᴜᴅɪᴏ" }
        ],
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
    } catch (error) {
      console.error("[ERROR] ytplay | ERR_YOUTUBE_INFO", error);
      await conn.sendMessage(from, {
        text: "❌ *ʟɪɴᴋ ɪɴᴠᴀ́ʟɪᴅᴏ ᴏᴜ ᴠɪ́ᴅᴇᴏ ɪɴᴅɪsᴘᴏɴɪ́ᴠᴇʟ.*"
      }, { quoted: createStatusQuoted(msg) });
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Downloads",
  "menuSection": "YouTube",
  "usage": "ytplay termo ou link",
  "description": "Uso: .ytplay termo ou link"
});
