// commands/pinmp3.js
const config = require("../../config/config");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

module.exports = {
  name: "pinmp3",
  description: "𝑩𝒂𝒊𝒙𝒂 á𝒖𝒅𝒊𝒐 𝒅𝒐 𝑷𝒊𝒏𝒕𝒆𝒓𝒆𝒔𝒕",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";

      if (!args[0]) {
        await conn.sendMessage(from, {
          text: `❌ *ᴘᴏʀ ғᴀᴠᴏʀ, ғᴏʀɴᴇçᴀ ᴜᴍ ʟɪɴᴋ ᴅᴏ ᴘɪɴᴛᴇʀᴇsᴛ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}pinmp3 https://br.pinterest.com/pin/xxxxx`
        }, { quoted: msg });
        return;
      }

      const link = args[0];

      if (!link.includes('pinterest.com') && !link.includes('pin.it')) {
        await conn.sendMessage(from, {
          text: `❌ *ʟɪɴᴋ ɪɴᴠáʟɪᴅᴏ!* ᴘᴏʀ ғᴀᴠᴏʀ, ғᴏʀɴᴇçᴀ ᴜᴍ ʟɪɴᴋ ᴅᴏ ᴘɪɴᴛᴇʀᴇsᴛ.`
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ 𝓑𝓪𝓲𝔁𝓪𝓷𝓭𝓸 á𝓾𝓭𝓲𝓸..." }, { quoted: msg });

      // Criar diretório temp se não existir
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      const outputPath = path.join(tempDir, `pin_audio_${Date.now()}.mp3`);

      // Usar yt-dlp para baixar apenas o áudio
      const command = `yt-dlp -f bestaudio --extract-audio --audio-format mp3 --audio-quality 0 -o "${outputPath}" "${link}"`;

      await execPromise(command);

      if (!fs.existsSync(outputPath)) {
        throw new Error("Falha ao baixar áudio");
      }

      const audioBuffer = fs.readFileSync(outputPath);

      await conn.sendMessage(from, {
        audio: audioBuffer,
        mimetype: 'audio/mpeg',
        fileName: 'pinterest_audio.mp3'
      }, { quoted: msg });

      await conn.sendMessage(from, {
        text: `✅ *Áᴜᴅɪᴏ ʙᴀɪxᴀᴅᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n📌 *ᴜsᴇ ${prefix}menu para mais comandos*`
      }, { quoted: msg });

      setTimeout(() => {
        try { fs.unlinkSync(outputPath); } catch(e) {}
      }, 5000);

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro no pinmp3:", error);

      let errorMsg = "❌ *ᴇʀʀᴏ ᴀᴏ ʙᴀɪxᴀʀ áᴜᴅɪᴏ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.";

      if (error.message.includes("No video")) {
        errorMsg = "❌ *Nenhum áudio encontrado neste link!*";
      }

      await conn.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
  }
};