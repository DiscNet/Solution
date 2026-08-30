// commands/pinmp4.js
const config = require("../../config/config");
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);
const fs = require('fs');
const path = require('path');

module.exports = {
  name: "pinmp4",
  description: "𝑩𝒂𝒊𝒙𝒂 𝒗𝒊́𝒅𝒆𝒐 𝒅𝒐 𝑷𝒊𝒏𝒕𝒆𝒓𝒆𝒔𝒕",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      
      if (!args[0]) {
        await conn.sendMessage(from, { 
          text: `❌ *Por favor, forneça um link do Pinterest!*\n\n📌 *Exemplo:* ${prefix}pinmp4 https://br.pinterest.com/pin/xxxxx` 
        }, { quoted: msg });
        return;
      }

      const link = args[0];
      
      if (!link.includes('pinterest.com') && !link.includes('pin.it')) {
        await conn.sendMessage(from, { 
          text: `❌ *Link inválido!* Por favor, forneça um link do Pinterest.` 
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ 𝓑𝓪𝓲𝔁𝓪𝓷𝓭𝓸 𝓿𝓲́𝓭𝓮𝓸..." }, { quoted: msg });

      // Criar diretório temp se não existir
      const tempDir = path.join(__dirname, '..', '..', 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      
      const outputPath = path.join(tempDir, `pin_video_${Date.now()}.mp4`);
      
      // Usar yt-dlp para baixar o vídeo
      const command = `yt-dlp -f bestvideo+bestaudio --merge-output-format mp4 -o "${outputPath}" "${link}"`;
      
      await execPromise(command);
      
      if (!fs.existsSync(outputPath)) {
        throw new Error("Falha ao baixar vídeo");
      }
      
      const videoBuffer = fs.readFileSync(outputPath);
      
      await conn.sendMessage(from, {
        video: videoBuffer,
        caption: `✅ *Vídeo baixado com sucesso!*\n\n📌 *Use ${prefix}menu para mais comandos*`
      }, { quoted: msg });
      
      setTimeout(() => {
        try { fs.unlinkSync(outputPath); } catch(e) {}
      }, 5000);
      
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro no pinmp4:", error);
      
      let errorMsg = "❌ *Erro ao baixar vídeo!* Tente novamente.";
      
      if (error.message.includes("Video unavailable")) {
        errorMsg = "❌ *Vídeo indisponível!* Verifique o link.";
      } else if (error.message.includes("429")) {
        errorMsg = "❌ *Muitas tentativas!* Aguarde um momento.";
      }
      
      await conn.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
  }
};