const { createStatusQuoted } = require("../../functions/statusCard");
// commands/midia/gsbrat.js
const config = require("../../config/config");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const webp = require("node-webpmux");

const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  const tempInput = path.join(__dirname, "..", "..", "temp", `meta_in_${Date.now()}.webp`);
  const tempOutput = path.join(__dirname, "..", "..", "temp", `meta_out_${Date.now()}.webp`);
  
  const tempDir = path.join(__dirname, "..", "..", "temp");
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  
  fs.writeFileSync(tempInput, mediaBuffer);
  
  try {
    const img = new webp.Image();
    const json = {
      "sticker-pack-id": `${getRandomNumber(10000, 99999)}`,
      "sticker-pack-name": packname,
      "sticker-pack-publisher": author,
      emojis: ["✨", "🎨"]
    };
    const exifAttr = Buffer.from([0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00]);
    const jsonBuff = Buffer.from(JSON.stringify(json), "utf-8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);
    await img.load(tempInput);
    img.exif = exif;
    await img.save(tempOutput);
    const result = fs.readFileSync(tempOutput);
    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);
    return result;
  } catch (e) {
    try { if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput); } catch (_) {}
    try { if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput); } catch (_) {}
    throw e;
  }
}

module.exports = {
  name: "gsbrat",
  description: "🎨 Gera figurinha animada Brat",

  async execute(conn, msg, args, from) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const API_KEY = config.tokitoApi;
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const text = args.join(' ') || 'brat';

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      // 🔥 Passo 1: Baixa o vídeo da API
      const apiUrl = `https://tokito-apis.com.br/api/stickers/brat-vid?text=${encodeURIComponent(text)}&apikey=${API_KEY}`;
      
      const response = await axios.get(apiUrl, { 
        responseType: "arraybuffer",
        timeout: 30000 
      });
      
      const videoBuffer = Buffer.from(response.data);

      // 🔥 Passo 2: Salva o vídeo temporariamente
      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const uniqueId = Date.now();
      const tempInput = path.join(tempDir, `gsbrat_${uniqueId}.mp4`);
      const tempOutput = path.join(tempDir, `gsbrat_${uniqueId}.webp`);
      
      fs.writeFileSync(tempInput, videoBuffer);

      // 🔥 Passo 3: Converte MP4 para WebP animado
      const ffmpegCmd = `ffmpeg -i "${tempInput}" -vf "scale=512:512,fps=10" -c:v libwebp -lossless 0 -q:v 70 -preset default -loop 0 -an "${tempOutput}"`;
      await execPromise(ffmpegCmd, { timeout: 20000 });

      if (!fs.existsSync(tempOutput) || fs.statSync(tempOutput).size === 0) {
        throw new Error("Falha na conversão");
      }

      // 🔥 Passo 4: Adiciona metadados
      const stickerBuffer = fs.readFileSync(tempOutput);
      const finalSticker = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);

      // 🔥 Passo 5: Envia a figurinha animada
      await conn.sendMessage(from, {
        sticker: finalSticker,
        mimetype: "image/webp",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: createStatusQuoted(msg)
      });

      try { fs.unlinkSync(tempInput); } catch (e) {}
      try { fs.unlinkSync(tempOutput); } catch (e) {}

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ɢsʙʀᴀᴛ:", error);
      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ғɪɢᴜʀɪɴʜᴀ ᴀɴɪᴍᴀᴅᴀ!*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};