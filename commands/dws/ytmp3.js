// Menu: Downloads - YouTube | Comando: ytmp3
const fs = require("fs");
const os = require("os");
const path = require("path");
const { randomUUID } = require("crypto");
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const { getVideo, downloadAudioMp3 } = require("../../functions/youtubeClient");

function safeFileName(value) {
  return String(value || "audio")
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80) || "audio";
}

module.exports = {
  name: "ytmp3",
  description: "ʙᴀɪxᴀ ᴀ́ᴜᴅɪᴏ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const tempDir = path.join(os.tmpdir(), "grimmjow-youtube");
    const outputPath = path.join(tempDir, `${Date.now()}-${randomUUID()}.mp3`);

    try {
      const target = args.join(" ").trim();
      if (!target) {
        return conn.sendMessage(from, {
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴜᴍ ʟɪɴᴋ ᴏᴜ ɴᴏᴍᴇ ᴅᴏ ᴠɪ́ᴅᴇᴏ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}ytmp3 https://youtu.be/xxxxx`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } });
      const loading = await conn.sendMessage(from, {
        text: "📥 *ʙᴀɪxᴀɴᴅᴏ ᴀ́ᴜᴅɪᴏ...*"
      }, { quoted: createStatusQuoted(msg) });

      const video = await getVideo(target);
      if (!video) throw new Error("ERR_YOUTUBE_NOT_FOUND");

      await downloadAudioMp3(video.id, outputPath);

      await conn.sendMessage(from, {
        text: "✅ *ᴀ́ᴜᴅɪᴏ ᴘʀᴏɴᴛᴏ. ᴇɴᴠɪᴀɴᴅᴏ...*",
        edit: loading.key
      });

      await conn.sendMessage(from, {
        audio: { url: outputPath },
        mimetype: "audio/mpeg",
        fileName: `${safeFileName(video.title)}.mp3`,
        ptt: false
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[ERROR] ytmp3 | ERR_YOUTUBE_AUDIO", error);
      await conn.sendMessage(from, {
        text: "❌ *ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇ ʙᴀɪxᴀʀ ᴏ ᴀ́ᴜᴅɪᴏ.*"
      }, { quoted: createStatusQuoted(msg) });
    } finally {
      try { await fs.promises.unlink(outputPath); } catch {}
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Downloads",
  "menuSection": "YouTube",
  "usage": "ytmp3 link",
  "description": "Uso: .ytmp3 link"
});
