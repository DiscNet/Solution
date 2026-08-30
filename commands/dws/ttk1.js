const { createStatusQuoted } = require("../../functions/statusCard");
// commands/tiktok1.js
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const config = require("../../config/config");

module.exports = {
  name: "ttkmp4",
  aliases: ["tiktok"],
  description: "𝑩𝒂𝒊𝒙𝒂 𝒗𝒊́𝒅𝒆𝒐 𝒅𝒐 𝑻𝒊𝒌𝑻𝒐𝒌 𝒂𝒕𝒓𝒂𝒗𝒆́𝒔 𝒅𝒐 𝒍𝒊𝒏𝒌",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      const prefix = config.prefix;
      const prefixAtual = config.prefix;
      const texto = msg.message?.extendedTextMessage?.text || msg.message?.conversation || "";
      // 🔥 PEGA O QUE O USUÁRIO DIGITOU (COM ALIASES)
      const cmd = texto.split(" ")[0].replace(prefixAtual, "").trim();
      
      // Pega o Push Name
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      if (!args || args.length === 0) {
        return conn.sendMessage(from, {
          text: `- *❌ | ғᴏʀɴᴇᴄ̧ᴀ ᴏ ʟɪɴᴋ*\n> ᴇxᴇᴍᴘʟᴏ: ${prefix}${cmd} https://vm.tiktok.com/ZSXAGRmGP/`,
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

      await conn.sendMessage(from, { react: { text: "📥", key: msg.key } });

      const link = args[0];
      
      const sentMsg = await conn.sendMessage(from, {
        text: `*📥͜͡￫ Bᴀɪxᴀɴᴅᴏ ᴠɪ́ᴅᴇᴏ ᴅᴏ Tɪᴋᴛᴏᴋ!*`,
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
      let title = "TikTok Video";
      let author = "";
      
      // API 1: tikwm.com
      try {
        const apiUrl = `https://tikwm.com/api/?url=${encodeURIComponent(link)}`;
        const response = await axios.get(apiUrl, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          timeout: 15000
        });
        
        if (response.data && response.data.code === 0 && response.data.data) {
          videoUrl = response.data.data.play || response.data.data.wmplay;
          title = response.data.data.title || "TikTok Video";
          author = response.data.data.author?.unique_id || "";
        }
      } catch (e) {
        console.log("API tikwm falhou:", e.message);
      }
      
      // API 2: tikdown
      if (!videoUrl) {
        try {
          const apiUrl = `https://tikdown.org/api/ajaxSearch?q=${encodeURIComponent(link)}`;
          const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
          });
          
          if (response.data && response.data.video) {
            videoUrl = response.data.video;
            title = response.data.title || "TikTok Video";
          }
        } catch (e) {
          console.log("API tikdown falhou:", e.message);
        }
      }
      
      // API 3: tiktokdl
      if (!videoUrl) {
        try {
          const apiUrl = `https://tiktokdl.com/api/analysis?url=${encodeURIComponent(link)}`;
          const response = await axios.get(apiUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            timeout: 15000
          });
          
          if (response.data && response.data.video) {
            videoUrl = response.data.video;
            title = response.data.title || "TikTok Video";
          }
        } catch (e) {
          console.log("API tiktokdl falhou:", e.message);
        }
      }
      
      if (videoUrl) {
        const videoResponse = await axios.get(videoUrl, {
          responseType: 'arraybuffer',
          timeout: 45000
        });
        
        const videoBuffer = Buffer.from(videoResponse.data);
        
        const tempDir = path.join(__dirname, "..", "..", "temp");
        if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
        
        const tempVideo = path.join(tempDir, `tiktok_${Date.now()}.mp4`);
        fs.writeFileSync(tempVideo, videoBuffer);
        
        const caption = null;
        
        await conn.sendMessage(from, {
          video: { url: tempVideo },
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
        
        await conn.sendMessage(from, {
          text: `*📥͜͡￫ Dᴏᴡɴʟᴏᴀᴅ ᴄᴏɴᴄʟᴜɪ́ᴅᴏ!*`,
          edit: sentMsg.key
        });
        
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
        
      } else {
        throw new Error("Nenhuma API funcionou");
      }
      
    } catch (error) {
      console.error("Erro no tiktok1:", error);
      
      await conn.sendMessage(from, {
        text: ` ҉ ⃤ ❌ *𝑬𝒓𝒓𝒐 𝒂𝒐 𝒃𝒂𝒊𝒙𝒂𝒓 𝒗𝒊́𝒅𝒆𝒐*\n\n⚠️ *Verifique o link e tente novamente*`,
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