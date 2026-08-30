const { createStatusQuoted } = require("../../functions/statusCard");
// commands/asciiimg.js
const config = require("../../config/config");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);

module.exports = {
  name: "asciiimg",
  description: "𝑻𝒓𝒂𝒏𝒔𝒇𝒐𝒓𝒎𝒂 𝒊𝒎𝒂𝒈𝒆𝒎 𝒆𝒎 𝑨𝑺𝑪𝑰𝑰 𝒂𝒓𝒕 𝒆 𝒆𝒏𝒗𝒊𝒂 𝒄𝒐𝒎𝒐 𝒊𝒎𝒂𝒈𝒆𝒎",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      let imageBuffer = null;

      if (msg.message?.imageMessage) {
        imageBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      }
      else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const quotedMsg = { message: { imageMessage: quoted.imageMessage }, key: msg.key };
        imageBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
      }

      if (!imageBuffer) {
        return conn.sendMessage(from, {
          text: "❌ Envie ou responda a uma imagem com .asciiimg",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const uniqueId = Date.now();
      const tempInput = path.join(tempDir, `ascii_in_${uniqueId}.jpg`);
      const tempTxt = path.join(tempDir, `ascii_txt_${uniqueId}.txt`);
      const tempOutput = path.join(tempDir, `ascii_out_${uniqueId}.png`);
      fs.writeFileSync(tempInput, imageBuffer);

      const width = args[0] ? parseInt(args[0]) : 80;
      
      // Passo 1: Gera o texto ASCII com jp2a
      await execPromise(`jp2a --width=${width} "${tempInput}" > "${tempTxt}"`);

      let asciiArt = fs.readFileSync(tempTxt, "utf8");

      if (!asciiArt || asciiArt.trim().length === 0) {
        throw new Error("ASCII art vazio");
      }

      asciiArt = asciiArt.replace(/\n+$/, "");

      // Passo 2: Converte o texto ASCII em imagem usando ImageMagick
      // Cria uma imagem preta com texto verde (estilo terminal)
      const escapedText = asciiArt.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
      
      // Salva o texto em um arquivo temporário para o ImageMagick ler
      fs.writeFileSync(tempTxt, asciiArt);

      try {
        // Usa ImageMagick para criar imagem a partir do texto
        await execPromise(`magick -background black -fill "#00FF00" -font Courier -pointsize 8 label:@${tempTxt} "${tempOutput}"`);
      } catch (e) {
        // Fallback: tenta com convert
        try {
          await execPromise(`convert -background black -fill "#00FF00" -font Courier -pointsize 8 label:@${tempTxt} "${tempOutput}"`);
        } catch (e2) {
          // Segundo fallback: usa ffmpeg para criar imagem a partir do texto
          const tempTxtClean = path.join(tempDir, `ascii_clean_${uniqueId}.txt`);
          fs.writeFileSync(tempTxtClean, asciiArt.replace(/'/g, "'\\''"));
          
          await execPromise(`ffmpeg -f lavfi -i color=c=black:s=1280x720:d=1 -vf "drawtext=textfile='${tempTxtClean}':fontcolor=#00FF00:fontsize=10:fontfile=/data/data/com.termux/files/usr/share/fonts/truetype/liberation/LiberationMono-Regular.ttf:x=10:y=10" -frames:v 1 "${tempOutput}"`);
          
          try { fs.unlinkSync(tempTxtClean); } catch (e) {}
        }
      }

      // Verifica se a imagem foi criada
      if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
        const asciiImageBuffer = fs.readFileSync(tempOutput);

        await conn.sendMessage(from, {
          image: asciiImageBuffer,
          caption: `🎨 *ASCII Art*\n📏 Largura: ${width} caracteres`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } else {
        throw new Error("Falha ao criar imagem ASCII");
      }

      // Limpa arquivos temporários
      try { fs.unlinkSync(tempInput); } catch (e) {}
      try { fs.unlinkSync(tempTxt); } catch (e) {}
      try { fs.unlinkSync(tempOutput); } catch (e) {}

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro asciiimg:", error);
      await conn.sendMessage(from, { 
        text: "❌ Erro ao criar ASCII art!\n\n⚠️ Instale o jp2a e ImageMagick:\n`pkg install jp2a imagemagick`",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}