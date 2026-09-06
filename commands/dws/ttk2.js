const { createStatusQuoted } = require("../../functions/statusCard");
// commands/tiktok2.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const config = require("../../config/config");

module.exports = {
  name: "ttkmp3",
  description: "𝑩𝒂𝒊𝒙𝒂 𝒂́𝒖𝒅𝒊𝒐 𝒅𝒐 𝑻𝒊𝒌𝑻𝒐𝒌 𝒂𝒕𝒓𝒂𝒗𝒆́𝒔 𝒅𝒐 𝒍𝒊𝒏𝒌",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";

      // Pega o Push Name
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      if (!args || args.length === 0) {
        return conn.sendMessage(from, {
          text: ` ҉ ⃤ ❌ *𝑼𝒔𝒆:* .tiktok2 [𝒍𝒊𝒏𝒌]\n\n📝 *𝑬𝒙𝒆𝒎𝒑𝒍𝒐𝒔:*\n.tiktok2 https://vm.tiktok.com/XXXXX/`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ",
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } });

      const link = args[0];

      const sentMsg = await conn.sendMessage(from, {
        text: `*📥͜͡￫ ʙᴀɪxᴀɴᴅᴏ ᴀᴜᴅɪᴏ ᴅᴏ ᴛɪᴋᴛᴏᴋ!*`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ",
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });

      let videoUrl = null;
      let title = "TikTok Audio";
      let author = "";

      // APIs (mesmas do tiktok1)
      try {
        const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(link)}`;
        const response = await axios.get(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 15000
        });

        if (response.data && response.data.code === 0 && response.data.data) {
          videoUrl = response.data.data.play || response.data.data.wmplay;
          title = response.data.data.title || "TikTok Audio";
          author = response.data.data.author?.unique_id || "";
        }
      } catch (e) {}

      if (!videoUrl) {
        try {
          const apiUrl = `https://tikdown.org/api/ajaxSearch?q=${encodeURIComponent(link)}`;
          const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
          });
          if (response.data && response.data.video) {
            videoUrl = response.data.video;
            title = response.data.title || "TikTok Audio";
          }
        } catch (e) {}
      }

      if (!videoUrl) {
        try {
          const apiUrl = `https://tiktokdl.com/api/analysis?url=${encodeURIComponent(link)}`;
          const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 15000
          });
          if (response.data && response.data.video) {
            videoUrl = response.data.video;
            title = response.data.title || "TikTok Audio";
          }
        } catch (e) {}
      }

      if (videoUrl) {
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 45000
        });

        const videoBuffer = Buffer.from(videoResponse.data);

        const tempDir = path.join(__dirname, "..", "..", "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

        const tempVideo = path.join(tempDir, `tiktok_video_${Date.now()}.mp4`);
        const tempAudio = path.join(tempDir, `tiktok_audio_${Date.now()}.mp3`);

        fs.writeFileSync(tempVideo, videoBuffer);

        try {
          const ffmpegCmd = `ffmpeg -i "${tempVideo}" -q:a 0 -map a "${tempAudio}"`;
          await execPromise(ffmpegCmd);

          if (fs.existsSync(tempAudio) && fs.statSync(tempAudio).size > 0) {
            const audioBuffer = fs.readFileSync(tempAudio);

            const caption = `\n🎤 *𝑇𝑖𝑡𝑢𝑙𝑜:* ${title}\n${author ? `👤 *𝐴𝑢𝑡𝑜𝑟:* @${author}\n` : ''}📥 *TɪᴋTᴏᴋ Aᴜᴅɪᴏ!*`;

            await conn.sendMessage(from, {
              audio: { url: tempAudio },
              mimetype: "audio/mpeg",
              caption: caption,
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ",
                  serverMessageId: 116
                }
              }
            }, {
              quoted: createStatusQuoted(msg)
            });

            fs.unlinkSync(tempVideo);
            fs.unlinkSync(tempAudio);

            await conn.sendMessage(from, {
              text: '*📥͜͡￫ ᴅᴏᴡɴʟᴏᴀᴅ ᴄᴏɴᴄʟᴜɪ́ᴅᴏ*',
              edit: sentMsg.key
            });

            await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
          }
        } catch (ffmpegError) {
          console.error("Erro ffmpeg:", ffmpegError);
          fs.unlinkSync(tempVideo);
          throw new Error("Falha ao extrair áudio");
        }
      } else {
        throw new Error("Nenhuma API funcionou");
      }

    } catch (error) {
      console.error("Erro no tiktok2:", error);

      await conn.sendMessage(from, {
        text: ` ҉ ⃤ ❌ *𝑬𝒓𝒓𝒐 𝒂𝒐 𝒃𝒂𝒊𝒙𝒂𝒓 𝒂́𝒖𝒅𝒊𝒐*\n\n⚠️ *ᴠᴇʀɪғɪǫᴜᴇ ᴏ ʟɪɴᴋ ᴇ ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ*`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ",
            serverMessageId: 116
          }
        }
      }, {
        quoted: createStatusQuoted(msg)
      });

      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
    }
  }
};