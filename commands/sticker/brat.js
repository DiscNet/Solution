// commands/midia/sbrat.js
const { exec } = require('child_process');
const { promisify } = require('util');
const { existsSync, mkdirSync, unlinkSync, writeFileSync } = require('fs');
const { join } = require('path');
const config = require("../../config/config");
const webp = require("node-webpmux");

const execPromise = promisify(exec);

// ==============================================
// CONFIGURAÇÕES PADRÃO
// ==============================================
const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  const tempInput = join(__dirname, "..", "..", "temp", `meta_in_${Date.now()}.webp`);
  const tempOutput = join(__dirname, "..", "..", "temp", `meta_out_${Date.now()}.webp`);
  
  const tempDir = join(__dirname, "..", "..", "temp");
  if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
  
  writeFileSync(tempInput, mediaBuffer);
  
  try {
    const img = new webp.Image();
    
    const json = {
      "sticker-pack-id": `${getRandomNumber(10000, 99999)}`,
      "sticker-pack-name": packname,
      "sticker-pack-publisher": author,
      emojis: ["✨", "🎨"]
    };
    
    const exifAttr = Buffer.from([
      0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00, 0x01, 0x00, 0x41, 0x57,
      0x07, 0x00, 0x00, 0x00, 0x00, 0x00, 0x16, 0x00, 0x00, 0x00
    ]);
    
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    
    await img.load(tempInput);
    img.exif = exif;
    await img.save(tempOutput);
    
    const resultBuffer = require('fs').readFileSync(tempOutput);
    
    unlinkSync(tempInput);
    unlinkSync(tempOutput);
    
    return resultBuffer;
  } catch (error) {
    try {
      if (existsSync(tempInput)) unlinkSync(tempInput);
      if (existsSync(tempOutput)) unlinkSync(tempOutput);
    } catch (e) {}
    throw error;
  }
}

module.exports = {
  name: "sbrat",
  description: "🎨 Gera figurinha no estilo Brat Generator",

  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "LukaModzz";
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      const text = args.join(' ') || 'brat';
      
      const tempDir = join(__dirname, '..', '..', 'temp');
      if (!existsSync(tempDir)) mkdirSync(tempDir, { recursive: true });
      
      const pngPath = join(tempDir, `sbrat_${Date.now()}.png`);
      const webpPath = join(tempDir, `sbrat_${Date.now()}.webp`);
      const textFilePath = join(tempDir, `sbrat_text_${Date.now()}.txt`);

      const words = text.split(' ');
      const totalChars = text.length;
      
      let charsPerLine;
      if (totalChars <= 6) charsPerLine = totalChars;
      else if (totalChars <= 10) charsPerLine = Math.ceil(totalChars / 2);
      else charsPerLine = 9;
      
      let lines = [];
      let currentLine = '';
      
      for (const word of words) {
        const test = currentLine + (currentLine ? ' ' : '') + word;
        if (test.length > charsPerLine && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = test;
        }
      }
      if (currentLine) lines.push(currentLine);
      if (lines.length === 0) lines = ['brat'];

      let fontSize;
      if (lines.length === 1) fontSize = 110;
      else if (lines.length === 2) fontSize = 90;
      else if (lines.length === 3) fontSize = 72;
      else if (lines.length === 4) fontSize = 58;
      else if (lines.length === 5) fontSize = 48;
      else if (lines.length === 6) fontSize = 40;
      else fontSize = 34;

      console.log(`🎨 sBrat: ${totalChars} chars → ${lines.length} linhas, fonte ${fontSize}px`);

      writeFileSync(textFilePath, lines.join('\n'), 'utf8');

      // Passo 1: Cria PNG (540x540)
      const pngCmd = `ffmpeg -f lavfi -i color=c=white:s=540x540:d=1 ` +
        `-vf "drawtext=textfile='${textFilePath.replace(/'/g, "'\\''")}':fontcolor=black@1.0:fontsize=${fontSize}:x=15:y=(h-text_h)/2:line_spacing=10,` +
        `boxblur=3:2,` +
        `scale=1080:1080:flags=neighbor" ` +
        `-frames:v 1 -y "${pngPath}"`;

      await execPromise(pngCmd, { timeout: 20000 });

      // Passo 2: Converte PNG para WebP (sticker)
      const webpCmd = `ffmpeg -i "${pngPath}" -vf "scale=512:512" -c:v libwebp -lossless 0 -q:v 80 -preset default -an "${webpPath}"`;
      await execPromise(webpCmd, { timeout: 10000 });

      // Passo 3: Adiciona metadados
      const stickerBuffer = require('fs').readFileSync(webpPath);
      const finalSticker = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);

      // Envia a figurinha
      await conn.sendMessage(from, {
        sticker: finalSticker,
        mimetype: "image/webp",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: "LukaModzz",
            serverMessageId: 116
          }
        }
      }, {
        quoted: {
          key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" },
          message: {
            contactMessage: {
              displayName: pushName,
              vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD"
            }
          }
        }
      });

      await conn.sendMessage(from, { react: { text: "♿", key: msg.key } });

      // Limpa arquivos
      setTimeout(() => {
        try { unlinkSync(pngPath); } catch(e) {}
        try { unlinkSync(webpPath); } catch(e) {}
        try { unlinkSync(textFilePath); } catch(e) {}
      }, 5000);

    } catch (error) {
      console.error("Erro sbrat:", error);
      await conn.sendMessage(from, {
        text: "❌ Erro ao criar figurinha Brat!",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};