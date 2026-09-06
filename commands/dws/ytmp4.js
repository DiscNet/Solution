const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { getVideo, downloadVideo } = require("../../functions/youtubeClient");

module.exports = {
  name: "ytmp4",
  description: "ʙᴀɪxᴀ ᴠɪ́ᴅᴇᴏ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const tempDir = path.join(os.tmpdir(), "grimmjow-youtube");
    const outputPath = path.join(tempDir, `${Date.now()}-${randomUUID()}.mp4`);

    try {
      const target = args.join(" ").trim();
      if (!target) {
        return conn.sendMessage(from, {
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴜᴍ ʟɪɴᴋ ᴏᴜ ɴᴏᴍᴇ ᴅᴏ ᴠɪ́ᴅᴇᴏ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}ytmp4 https://youtu.be/xxxxx`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "📹", key: msg.key } });
      const loading = await conn.sendMessage(from, {
        text: "📥 *ʙᴀɪxᴀɴᴅᴏ ᴠɪ́ᴅᴇᴏ...*"
      }, { quoted: createStatusQuoted(msg) });

      const video = await getVideo(target);
      if (!video) throw new Error("ERR_YOUTUBE_NOT_FOUND");

      await downloadVideo(video.id, outputPath);

      await conn.sendMessage(from, {
        text: "✅ *ᴠɪ́ᴅᴇᴏ ᴘʀᴏɴᴛᴏ. ᴇɴᴠɪᴀɴᴅᴏ...*",
        edit: loading.key
      });

      await conn.sendMessage(from, {
        video: { url: outputPath },
        mimetype: "video/mp4",
        caption: `🎬 *${video.title}*\n👤 ${video.channel}`
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[ERROR] ytmp4 | ERR_YOUTUBE_VIDEO", error);
      await conn.sendMessage(from, {
        text: "❌ *ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇ ʙᴀɪxᴀʀ ᴏ ᴠɪ́ᴅᴇᴏ.*"
      }, { quoted: createStatusQuoted(msg) });
    } finally {
      try { await fs.promises.unlink(outputPath); } catch {}
    }
  }
};
