// Menu: Downloads - YouTube | Comando: play
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
  name: "play",
  description: "ᴘᴇsǫᴜɪsᴀ ᴇ ᴇɴᴠɪᴀ ᴀ́ᴜᴅɪᴏ ᴅᴏ ʏᴏᴜᴛᴜʙᴇ",
  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const tempDir = path.join(os.tmpdir(), "grimmjow-youtube");
    const outputPath = path.join(tempDir, `${Date.now()}-${randomUUID()}.mp3`);

    try {
      const query = args.join(" ").trim();
      if (!query) {
        return conn.sendMessage(from, {
          text: `❌ *ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴍᴇ ᴅᴀ ᴍᴜ́sɪᴄᴀ!*\n\n📌 ᴇxᴇᴍᴘʟᴏ: ${prefix}play mc poze`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "🎧", key: msg.key } });
      const loading = await conn.sendMessage(from, {
        text: `🔎 *ᴘᴇsǫᴜɪsᴀɴᴅᴏ:* ${query}`
      }, { quoted: createStatusQuoted(msg) });

      const video = await getVideo(query);
      if (!video) throw new Error("ERR_YOUTUBE_NOT_FOUND");

      if (video.thumbnail) {
        await conn.sendMessage(from, {
          image: { url: video.thumbnail },
          caption: `🎵 *${video.title}*\n👤 ${video.channel}\n⏱️ ${video.duration}`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, {
        text: "📥 *ʙᴀɪxᴀɴᴅᴏ ᴀ́ᴜᴅɪᴏ...*",
        edit: loading.key
      });

      await downloadAudioMp3(video.id, outputPath);

      await conn.sendMessage(from, {
        audio: { url: outputPath },
        mimetype: "audio/mpeg",
        fileName: `${safeFileName(video.title)}.mp3`,
        ptt: false
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[ERROR] play | ERR_YOUTUBE_PLAY", error);
      await conn.sendMessage(from, {
        text: "❌ *ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇ ʙᴜsᴄᴀʀ ᴏᴜ ʙᴀɪxᴀʀ ᴏ ᴀ́ᴜᴅɪᴏ.*"
      }, { quoted: createStatusQuoted(msg) });
    } finally {
      try { await fs.promises.unlink(outputPath); } catch {}
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Downloads",
  "menuSection": "YouTube",
  "usage": "play música ou link",
  "description": "Uso: .play música ou link"
});
