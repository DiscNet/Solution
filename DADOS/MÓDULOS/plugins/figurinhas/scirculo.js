// Menu: Figurinhas - Criação | Comando: scirculo
// commands/scirculo.js
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const webp = require("node-webpmux");

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  const tempInput = path.join(__dirname, "..", "..", "..", "temp", `input_${Date.now()}.webp`);
  const tempOutput = path.join(__dirname, "..", "..", "..", "temp", `output_${Date.now()}.webp`);

  const tempDir = path.join(__dirname, "..", "..", "..", "temp");
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

    const resultBuffer = fs.readFileSync(tempOutput);

    fs.unlinkSync(tempInput);
    fs.unlinkSync(tempOutput);

    return resultBuffer;

  } catch (error) {
    try {
      if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
      if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
    } catch (e) {}
    throw error;
  }
}

module.exports = {
  name: "scirculo",
  description: "ᴄʀɪᴀ ғɪɢᴜʀɪɴʜᴀ ᴄɪʀᴄᴜʟᴀʀ (ᴇsᴛɪʟᴏ ғᴏᴛᴏ ᴅᴇ ᴘᴇʀғɪʟ) ᴀ ᴘᴀʀᴛɪʀ ᴅᴇ ɪᴍᴀɢᴇᴍ ᴏᴜ ᴠíᴅᴇᴏ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      // ==============================================
      // CONFIGURAÇÕES PADRÃO DA FIGURINHA (MESMAS DO .s)
      // ==============================================
      const PACKNAME = `○֩Lᴜᴋᴀ.ᴍᴏᴅᴢᴢ🍥҈

 ۩                                L͟u͟k͟a͟                                 🂱


      `;
      const AUTHOR = `🔱҉⃤𝙾𝚠𝚗𝚎𝚛: 63 98467-3123 ꪜ\n📍҉⃤𝐵𝑜𝑡: 63 99200-3562 ꪜ\n🕋҉⃤ℒ𝓊𝓀𝒶ℳℴ𝒹𝓏𝓏 ꪜ`;
      // ==============================================

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      let mediaBuffer = null;
      let isVideo = false;

      // ==============================================
      // EXTRAI A MÍDIA
      // ==============================================

      if (msg.message?.imageMessage || msg.message?.videoMessage) {
        const caption = msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
        const hasCommand = /(^|\s)(\.scirculo\b|\.sc\b|scirculo\b|sc\b)/.test(caption);

        if (!hasCommand) {
          return conn.sendMessage(from, {
            text: "❌ ᴜsᴇ .scirculo, .sc, sᴄɪʀᴄᴜʟᴏ ᴏᴜ sᴄ ɴᴀ ʟᴇɢᴇɴᴅᴀ ᴅᴀ ɪᴍᴀɢᴇᴍ/víᴅᴇᴏ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ᴍíᴅɪᴀ"
          }, { quoted: msg });
        }

        if (msg.message?.imageMessage) {
          mediaBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
        } else {
          mediaBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
          isVideo = true;
        }
      }
      else if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const text = msg.message.extendedTextMessage.text || "";
        const hasCommand = /(^|\s)(\.scirculo\b|\.sc\b|scirculo\b|sc\b)/.test(text);

        if (!hasCommand) {
          return conn.sendMessage(from, {
            text: "❌ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ/víᴅᴇᴏ ᴄᴏᴍ .scirculo, .sc, sᴄɪʀᴄᴜʟᴏ ᴏᴜ sᴄ"
          }, { quoted: msg });
        }

        if (quoted.imageMessage) {
          const quotedMsg = { message: { imageMessage: quoted.imageMessage }, key: msg.key };
          mediaBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
        }
        else if (quoted.videoMessage) {
          const quotedMsg = { message: { videoMessage: quoted.videoMessage }, key: msg.key };
          mediaBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
          isVideo = true;
        }
        else if (quoted.stickerMessage) {
          return conn.sendMessage(from, { text: "❌ ᴊá é ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ! ᴜsᴇ .toimg ᴘᴀʀᴀ ᴄᴏɴᴠᴇʀᴛᴇʀ." }, { quoted: msg });
        } else {
          return conn.sendMessage(from, { text: "❌ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴏᴜ ᴠíᴅᴇᴏ ᴄᴏᴍ .scirculo ᴏᴜ .sc" }, { quoted: msg });
        }
      }

      if (!mediaBuffer) {
        return conn.sendMessage(from, { text: "❌ ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ/víᴅᴇᴏ ᴄᴏᴍ .scirculo ᴏᴜ .sc" }, { quoted: msg });
      }

      // ==============================================
      // CRIAÇÃO DA FIGURINHA CIRCULAR COM IMAGEMAGICK
      // ==============================================

      const tempDir = path.join(__dirname, "..", "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempInput = path.join(tempDir, `input_${Date.now()}.png`);
      const tempCircular = path.join(tempDir, `circular_${Date.now()}.png`);
      const tempOutput = path.join(tempDir, `sticker_${Date.now()}.webp`);

      fs.writeFileSync(tempInput, mediaBuffer);

      if (isVideo) {
        // Para vídeo: extrair primeiro frame, aplicar círculo, depois converter
        const tempFrame = path.join(tempDir, `frame_${Date.now()}.png`);

        // Extrair primeiro frame do vídeo
        await execPromise(`ffmpeg -i "${tempInput}" -vframes 1 -f image2 "${tempFrame}" -y`);

        // Aplicar círculo no frame com ImageMagick
        const convertCmd = `convert "${tempFrame}" -resize 512x512^ -gravity center -extent 512x512 \\( +clone -threshold -1 -negate -fill white -draw "circle 256,256 256,0" \\) -alpha off -compose copy_opacity -composite "${tempCircular}"`;
        await execPromise(convertCmd);

        // Converter frame circular para vídeo webp
        await execPromise(`ffmpeg -i "${tempInput}" -i "${tempCircular}" -filter_complex "[0:v]scale=512:512,setpts=PTS-STARTPTS[v];[v][1:v]alphamerge" -t 5 -r 15 -c:v libwebp -lossless 0 -q:v 80 -preset default -an "${tempOutput}" -y`);

        try { fs.unlinkSync(tempFrame); } catch(e) {}

      } else {
        // Para imagem: usar ImageMagick para criar círculo
        const convertCmd = `convert "${tempInput}" -resize 512x512^ -gravity center -extent 512x512 \\( +clone -threshold -1 -negate -fill white -draw "circle 256,256 256,0" \\) -alpha off -compose copy_opacity -composite "${tempCircular}"`;
        await execPromise(convertCmd);

        // Converter para webp
        await execPromise(`ffmpeg -i "${tempCircular}" -c:v libwebp -lossless 0 -q:v 90 -preset default -an "${tempOutput}" -y`);
      }

      if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
        const stickerBuffer = fs.readFileSync(tempOutput);
        const finalStickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);

        await conn.sendMessage(from, {
          sticker: finalStickerBuffer,
          mimetype: "image/webp"
        }, { quoted: msg });

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
      } else {
        throw new Error("Falha ao criar figurinha circular");
      }

      // Limpar arquivos temporários
      try {
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempCircular)) fs.unlinkSync(tempCircular);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch (e) {}

    } catch (error) {
      console.error("Erro no comando scirculo:", error);
      try {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
      } catch (e) {}

      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ғɪɢᴜʀɪɴʜᴀ ᴄɪʀᴄᴜʟᴀʀ.\n\n📌 ᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ɪᴍᴀɢᴇᴍᴀɢɪᴄᴋ ᴇsᴛá ɪɴsᴛᴀʟᴀᴅᴏ: ᴘᴋɢ ɪɴsᴛᴀʟʟ ɪᴍᴀɢᴇᴍᴀɢɪᴄᴋ"
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Criação",
  "usage": "scirculo (responda à imagem ou vídeo)",
  "description": "Uso: .scirculo (responda à imagem ou vídeo)"
});
