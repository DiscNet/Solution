// Menu: Figurinhas - Edição | Comando: toimg
// commands/sticker/toimg.js
const fs = require("fs");
const path = require("path");
const { execFileCompat, writableTempDir } = require("../../functions/runtimeCompat");

const sharp = require("../../functions/sharpCompat");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");

const TEMP_DIR = writableTempDir("solution-toimg");
const MAX_STICKER_BYTES = 20 * 1024 * 1024;

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function safeUnlink(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

function randomId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
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

function unwrapMessage(message) {
  let current = message;

  for (let i = 0; i < 6 && current; i++) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.viewOnceMessageV2Extension?.message) {
      current = current.viewOnceMessageV2Extension.message;
      continue;
    }
    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }

  return current || {};
}

function getContextInfo(msg) {
  const message = unwrapMessage(msg?.message);

  for (const value of Object.values(message || {})) {
    if (value && typeof value === "object" && value.contextInfo) {
      return value.contextInfo;
    }
  }

  return null;
}

function getStickerMessage(msg) {
  const direct = unwrapMessage(msg?.message);
  if (direct?.stickerMessage) return direct.stickerMessage;

  const contextInfo = getContextInfo(msg);
  const quoted = unwrapMessage(contextInfo?.quotedMessage);
  return quoted?.stickerMessage || null;
}

async function downloadSticker(stickerMessage) {
  const stream = await downloadContentFromMessage(stickerMessage, "sticker");
  const chunks = [];
  let total = 0;

  for await (const chunk of stream) {
    const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    total += buffer.length;

    if (total > MAX_STICKER_BYTES) {
      throw new Error("Figurinha excedeu o limite de segurança de 20 MB");
    }

    chunks.push(buffer);
  }

  const result = Buffer.concat(chunks);
  if (!result.length) throw new Error("O WhatsApp retornou uma figurinha vazia");
  return result;
}

async function convertWithSharp(stickerBuffer) {
  return sharp(stickerBuffer, {
    animated: false,
    failOn: "none",
    limitInputPixels: false
  })
    .rotate()
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

async function convertWithFfmpeg(stickerBuffer) {
  ensureTempDir();
  const id = randomId();
  const inputPath = path.join(TEMP_DIR, `toimg_input_${id}.webp`);
  const outputPath = path.join(TEMP_DIR, `toimg_output_${id}.png`);

  try {
    fs.writeFileSync(inputPath, stickerBuffer);

    await execFileCompat(
      "ffmpeg",
      [
        "-y",
        "-hide_banner",
        "-loglevel", "error",
        "-i", inputPath,
        "-frames:v", "1",
        "-c:v", "png",
        outputPath
      ],
      { timeout: 30000, maxBuffer: 8 * 1024 * 1024 }
    );

    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
      throw new Error("FFmpeg não gerou a imagem PNG");
    }

    return fs.readFileSync(outputPath);
  } finally {
    safeUnlink(inputPath);
    safeUnlink(outputPath);
  }
}

async function stickerToPng(stickerBuffer) {
  try {
    const image = await convertWithSharp(stickerBuffer);
    if (!Buffer.isBuffer(image) || image.length === 0) {
      throw new Error("Sharp gerou uma imagem vazia");
    }
    return image;
  } catch (sharpError) {
    console.warn(`toimg: Sharp falhou, tentando FFmpeg: ${sharpError.message}`);
    return convertWithFfmpeg(stickerBuffer);
  }
}

module.exports = {
  name: "toimg",
  aliases: ["stickerimg", "stickerimage"],
  description: "ᴄᴏɴᴠᴇʀᴛᴇ ғɪɢᴜʀɪɴʜᴀ ᴇᴍ ɪᴍᴀɢᴇᴍ ᴘɴɢ",

  async execute(conn, msg, args, from) {
    const bot = config.botName || "LukaModzz";
    const prefix = config.prefix || ".";

    try {
      await conn.sendMessage(from, { react: { text: "🖼️", key: msg.key } }).catch(() => {});

      const stickerMessage = getStickerMessage(msg);
      if (!stickerMessage) {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});

        return sendWithStatus(conn, from, {
          text:
            `╭━━━〔 🧊 ᴛᴏɪᴍɢ 〕━━━╮\n` +
            `┃ ⚠️ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ\n` +
            `┃ 📝 ᴜsᴇ: *${prefix}toimg*\n` +
            `╰━━━━━━━━━━━━━━━━━━╯`,
          contextInfo: newsletterContext(bot)
        }, msg);
      }

      const stickerBuffer = await downloadSticker(stickerMessage);
      const imageBuffer = await stickerToPng(stickerBuffer);

      const animated = stickerMessage.isAnimated === true;
      const caption =
        `╭━━━〔 🧊 ᴛᴏɪᴍɢ 〕━━━╮\n` +
        `┃ ✅ ᴄᴏɴᴠᴇʀsᴀ̃ᴏ ᴄᴏɴᴄʟᴜɪ́ᴅᴀ\n` +
        `┃ 🖼️ ғᴏʀᴍᴀᴛᴏ: *PNG*\n` +
        (animated ? `┃ 🎞️ ᴀɴɪᴍᴀᴅᴀ: 1º ғʀᴀᴍᴇ\n` : "") +
        `╰━━━━━━━━━━━━━━━━━━╯`;

      await sendWithStatus(conn, from, {
        image: imageBuffer,
        mimetype: "image/png",
        caption,
        contextInfo: newsletterContext(bot)
      }, msg);

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      const detail = error?.stderr || error?.cause?.stderr || error?.message || String(error);
      console.error("toimg:", detail);

      const permissionError =
        error?.code === "ERR_EXEC_PERMISSION" ||
        error?.cause?.code === "ERR_EXEC_PERMISSION";
      const missingTool =
        error?.code === "ERR_EXEC_MISSING" ||
        error?.cause?.code === "ERR_EXEC_MISSING";

      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
      await sendWithStatus(conn, from, {
        text:
          `╭━━━〔 🧊 ᴛᴏɪᴍɢ 〕━━━╮\n` +
          (permissionError
            ? `┃ ❌ ᴏ ᴀɴᴅʀᴏɪᴅ ʙʟᴏǫᴜᴇᴏᴜ ᴀ ᴇxᴇᴄᴜᴄ̧ᴀ̃ᴏ ᴅᴏ ғғᴍᴘᴇɢ\n`
            : missingTool
              ? `┃ ❌ ғғᴍᴘᴇɢ ɴᴀ̃ᴏ ᴇsᴛᴀ́ ɪɴsᴛᴀʟᴀᴅᴏ\n`
              : `┃ ❌ ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇ ᴄᴏɴᴠᴇʀᴛᴇʀ\n`) +
          `┃ 🔄 ᴛᴇɴᴛᴇ ᴏᴜᴛʀᴀ ғɪɢᴜʀɪɴʜᴀ\n` +
          `╰━━━━━━━━━━━━━━━━━━╯`,
        contextInfo: newsletterContext(bot)
      }, msg).catch(() => {});
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Edição",
  "usage": "toimg (responda à figurinha)",
  "description": "Uso: .toimg (responda à figurinha)"
});
