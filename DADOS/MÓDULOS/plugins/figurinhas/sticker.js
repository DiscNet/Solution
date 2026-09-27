// Menu: Figurinhas - Criação | Comando: s
// commands/sticker/sticker.js
const fs = require("fs");
const path = require("path");
const util = require("util");
const { execFile } = require("child_process");
const sharp = require("sharp");
const webp = require("node-webpmux");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const config = require("../../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { defaultStickerPack, defaultStickerAuthor } = require("../../functions/stickerMetadata");

const execFilePromise = util.promisify(execFile);
const TEMP_DIR = path.join(__dirname, "..", "..", "..", "temp");

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function safeUnlink(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function newsletterContext(botName) {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: botName,
      serverMessageId: 116
    }
  };
}

async function sendWithStatus(conn, from, content, msg) {
  return conn.sendMessage(from, content, { quoted: createStatusQuoted(msg) });
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  ensureTempDir();
  const id = randomId();
  const tempInput = path.join(TEMP_DIR, `meta_input_${id}.webp`);
  const tempOutput = path.join(TEMP_DIR, `meta_output_${id}.webp`);

  try {
    fs.writeFileSync(tempInput, mediaBuffer);

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

    const jsonBuff = Buffer.from(JSON.stringify(json), "utf8");
    const exif = Buffer.concat([exifAttr, jsonBuff]);
    exif.writeUIntLE(jsonBuff.length, 14, 4);

    await img.load(tempInput);
    img.exif = exif;
    await img.save(tempOutput);

    if (!fs.existsSync(tempOutput) || fs.statSync(tempOutput).size === 0) {
      throw new Error("webpmux gerou um arquivo vazio");
    }

    return fs.readFileSync(tempOutput);
  } finally {
    safeUnlink(tempInput);
    safeUnlink(tempOutput);
  }
}

async function imageToWebp(mediaBuffer) {
  return sharp(mediaBuffer, { failOn: "none" })
    .rotate()
    .resize(512, 512, {
      // O bot padroniza toda figurinha em 1:1, mesmo que precise esticar a mídia.
      fit: "fill"
    })
    .webp({ quality: 88, effort: 4, smartSubsample: true })
    .toBuffer();
}

async function ensureFfmpeg() {
  try {
    await execFilePromise("ffmpeg", ["-version"], {
      timeout: 10000,
      maxBuffer: 2 * 1024 * 1024
    });
  } catch (error) {
    const err = new Error("ffmpeg não está disponível no ambiente");
    err.cause = error;
    throw err;
  }
}

async function ffmpegToWebp(inputPath, outputPath, isVideo) {
  await ensureFfmpeg();

  // Sem contain/pad: força 512x512 e preserva alpha quando a fonte tiver transparência.
  const scaleFilter = "scale=512:512,format=rgba";
  const args = ["-y", "-hide_banner", "-loglevel", "error", "-i", inputPath];

  if (isVideo) {
    args.push(
      "-t", "5",
      "-vf", `fps=15,${scaleFilter}`,
      "-an",
      "-c:v", "libwebp",
      "-lossless", "0",
      "-compression_level", "6",
      "-q:v", "65",
      "-loop", "0",
      "-preset", "picture"
    );
  } else {
    args.push(
      "-vf", scaleFilter,
      "-frames:v", "1",
      "-an",
      "-c:v", "libwebp",
      "-lossless", "0",
      "-compression_level", "6",
      "-q:v", "80"
    );
  }

  args.push(outputPath);

  await execFilePromise("ffmpeg", args, {
    timeout: isVideo ? 60000 : 30000,
    maxBuffer: 10 * 1024 * 1024
  });

  if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
    throw new Error("ffmpeg gerou um arquivo WebP vazio");
  }

  return fs.readFileSync(outputPath);
}

function makeQuotedMessage(msg, contextInfo, messageType, mediaMessage) {
  return {
    key: {
      remoteJid: msg.key?.remoteJid,
      fromMe: false,
      id: contextInfo?.stanzaId,
      participant: contextInfo?.participant
    },
    message: { [messageType]: mediaMessage }
  };
}

function imageDocumentSource(documentMessage, message) {
  const mimetype = documentMessage?.mimetype || "";
  if (!/^image\//i.test(mimetype)) return null;
  return {
    type: "image",
    mimetype,
    message,
    isDocument: true
  };
}

function getQuotedMedia(msg) {
  const contextInfo = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = contextInfo?.quotedMessage;
  if (!quoted) return null;

  if (quoted.imageMessage) {
    return {
      type: "image",
      mimetype: quoted.imageMessage.mimetype || "image/jpeg",
      message: makeQuotedMessage(msg, contextInfo, "imageMessage", quoted.imageMessage)
    };
  }

  if (quoted.videoMessage) {
    return {
      type: "video",
      mimetype: quoted.videoMessage.mimetype || "video/mp4",
      message: makeQuotedMessage(msg, contextInfo, "videoMessage", quoted.videoMessage)
    };
  }

  if (quoted.documentMessage) {
    return imageDocumentSource(
      quoted.documentMessage,
      makeQuotedMessage(msg, contextInfo, "documentMessage", quoted.documentMessage)
    );
  }

  if (quoted.stickerMessage) return { type: "sticker" };
  return null;
}

function getDirectMedia(msg) {
  if (msg.message?.imageMessage) {
    return {
      type: "image",
      mimetype: msg.message.imageMessage.mimetype || "image/jpeg",
      message: msg
    };
  }

  if (msg.message?.videoMessage) {
    return {
      type: "video",
      mimetype: msg.message.videoMessage.mimetype || "video/mp4",
      message: msg
    };
  }

  if (msg.message?.documentMessage) {
    return imageDocumentSource(msg.message.documentMessage, msg);
  }

  return null;
}

function extensionFor(type, mimetype) {
  if (type === "video") {
    if (/quicktime/i.test(mimetype)) return "mov";
    if (/webm/i.test(mimetype)) return "webm";
    return "mp4";
  }

  if (/png/i.test(mimetype)) return "png";
  if (/webp/i.test(mimetype)) return "webp";
  if (/gif/i.test(mimetype)) return "gif";
  if (/avif/i.test(mimetype)) return "avif";
  return "jpg";
}

async function downloadSourceMedia(source) {
  return downloadMediaMessage(source.message, "buffer", {}, {});
}

module.exports = {
  name: "s",
  aliases: ["sticker", "figurinha", "f"],
  description: "ᴄʀɪᴀ ғɪɢᴜʀɪɴʜᴀ ᴀ ᴘᴀʀᴛɪʀ ᴅᴇ ɪᴍᴀɢᴇᴍ, ᴠɪ́ᴅᴇᴏ ᴏᴜ ᴀʀǫᴜɪᴠᴏ ᴅᴇ ɪᴍᴀɢᴇᴍ",

  async execute(conn, msg, args, from, _axiosInstance, requestedName) {
    const bot = config.botName || "GrimmJow";
    const prefix = config.prefix || ".";
    const invokedName = String(requestedName || "s").trim().toLowerCase() || "s";
    const invokedCommand = `${prefix}${invokedName}`;
    const PACKNAME = defaultStickerPack();
    const AUTHOR = defaultStickerAuthor();

    let inputPath = null;
    let outputPath = null;

    try {
      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      const quotedSource = getQuotedMedia(msg);
      if (quotedSource?.type === "sticker") {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        return sendWithStatus(conn, from, {
          text: `❌ ᴊá é ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ! ᴜsᴇ ${prefix}toimg ᴘᴀʀᴀ ᴄᴏɴᴠᴇʀᴛᴇʀ.`,
          contextInfo: newsletterContext(bot)
        }, msg);
      }

      const source = quotedSource || getDirectMedia(msg);
      if (!source) {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        return sendWithStatus(conn, from, {
          text:
            `❌ ᴇɴᴠɪᴇ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ, ᴠɪ́ᴅᴇᴏ ᴏᴜ ᴀʀǫᴜɪᴠᴏ ᴅᴇ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ ${invokedCommand} ɴᴀ ʟᴇɢᴇɴᴅᴀ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ᴍɪ́ᴅɪᴀ ᴄᴏᴍ ${invokedCommand}\n\n` +
            `📝 *ᴇxᴇᴍᴘʟᴏs:*\n` +
            `• ᴇɴᴠɪᴇ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴇ ᴜsᴇ ${invokedCommand} ɴᴀ ʟᴇɢᴇɴᴅᴀ\n` +
            `• ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ ${invokedCommand}\n` +
            `• ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍ ᴀʀǫᴜɪᴠᴏ .png ᴄᴏᴍ ${invokedCommand}`,
          contextInfo: newsletterContext(bot)
        }, msg);
      }

      const mediaBuffer = await downloadSourceMedia(source);
      if (!Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) {
        throw new Error("A mídia baixada está vazia");
      }

      ensureTempDir();
      const id = randomId();
      inputPath = path.join(TEMP_DIR, `sticker_input_${id}.${extensionFor(source.type, source.mimetype)}`);
      outputPath = path.join(TEMP_DIR, `sticker_output_${id}.webp`);
      fs.writeFileSync(inputPath, mediaBuffer);

      let stickerBuffer;

      if (source.type === "image") {
        try {
          // Sharp preserva transparência de PNG/WebP/AVIF e força a saída para 512x512.
          stickerBuffer = await imageToWebp(mediaBuffer);
        } catch (sharpError) {
          console.error("Falha no sharp; tentando ffmpeg:", sharpError.message);
          stickerBuffer = await ffmpegToWebp(inputPath, outputPath, false);
        }
      } else {
        stickerBuffer = await ffmpegToWebp(inputPath, outputPath, true);
      }

      if (!Buffer.isBuffer(stickerBuffer) || stickerBuffer.length === 0) {
        throw new Error("Conversão gerou um WebP vazio");
      }

      // Metadados são opcionais. Se o webpmux falhar, a figurinha ainda é enviada.
      try {
        stickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);
      } catch (metadataError) {
        console.error("Aviso: não foi possível adicionar metadados à figurinha:", metadataError.message);
      }

      await sendWithStatus(conn, from, {
        sticker: stickerBuffer,
        mimetype: "image/webp",
        contextInfo: newsletterContext(bot)
      }, msg);

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      const detalhe = error?.stderr || error?.cause?.stderr || error?.message || String(error);
      console.error("Erro ao criar figurinha:", detalhe);

      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
      await sendWithStatus(conn, from, {
        text: "❌ ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ ᴄʀɪᴀʀ ᴀ ғɪɢᴜʀɪɴʜᴀ. ᴏ ᴄᴏɴᴠᴇʀsᴏʀ ᴅᴇ ᴍíᴅɪᴀ ᴇɴᴄᴏɴᴛʀᴏᴜ ᴜᴍ ᴇʀʀᴏ.",
        contextInfo: newsletterContext(bot)
      }, msg).catch(() => {});
    } finally {
      safeUnlink(inputPath);
      safeUnlink(outputPath);
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Criação",
  "usage": "s (responda à imagem ou vídeo)",
  "description": "Uso: .s (responda à imagem ou vídeo)"
});
