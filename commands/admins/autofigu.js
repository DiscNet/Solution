const fs = require("fs");
const path = require("path");
const util = require("util");
const { execFile } = require("child_process");
const sharp = require("sharp");
const webp = require("node-webpmux");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");
const { createStatusQuoted } = require("../../functions/statusCard");

const execFilePromise = util.promisify(execFile);
const prefix = config.prefix || ".";
const TEMP_DIR = path.join(__dirname, "..", "..", "temp");
const CONFIG_PATH = path.join(__dirname, "..", "..", "config", "autofigu.json");

const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

const processedMessages = new Map();

function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function safeUnlink(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function loadAutoConfig() {
  try {
    if (!fs.existsSync(CONFIG_PATH)) return {};
    return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
  } catch (error) {
    console.error("Erro ao ler autofigu.json:", error.message);
    return {};
  }
}

function saveAutoConfig(data) {
  fs.mkdirSync(path.dirname(CONFIG_PATH), { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
}

function newsletterContext(bot) {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: bot,
      serverMessageId: 116
    }
  };
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  ensureTempDir();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const tempInput = path.join(TEMP_DIR, `autofigu_meta_in_${id}.webp`);
  const tempOutput = path.join(TEMP_DIR, `autofigu_meta_out_${id}.webp`);

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
      throw new Error("webpmux gerou arquivo vazio");
    }
    return fs.readFileSync(tempOutput);
  } finally {
    safeUnlink(tempInput);
    safeUnlink(tempOutput);
  }
}

async function imageToWebp(buffer) {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize(512, 512, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 }
    })
    .webp({ quality: 88, effort: 4, smartSubsample: true })
    .toBuffer();
}

async function videoToWebp(buffer) {
  ensureTempDir();
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const tempInput = path.join(TEMP_DIR, `autofigu_video_${id}.mp4`);
  const tempOutput = path.join(TEMP_DIR, `autofigu_video_${id}.webp`);

  try {
    fs.writeFileSync(tempInput, buffer);
    const filter =
      "fps=15," +
      "scale=512:512:force_original_aspect_ratio=decrease," +
      "format=rgba," +
      "pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000";

    await execFilePromise("ffmpeg", [
      "-y", "-hide_banner", "-loglevel", "error",
      "-i", tempInput,
      "-t", "5",
      "-vf", filter,
      "-an",
      "-c:v", "libwebp",
      "-lossless", "0",
      "-compression_level", "6",
      "-q:v", "65",
      "-loop", "0",
      "-preset", "picture",
      tempOutput
    ], {
      timeout: 60000,
      maxBuffer: 10 * 1024 * 1024
    });

    if (!fs.existsSync(tempOutput) || fs.statSync(tempOutput).size === 0) {
      throw new Error("ffmpeg gerou arquivo vazio");
    }
    return fs.readFileSync(tempOutput);
  } finally {
    safeUnlink(tempInput);
    safeUnlink(tempOutput);
  }
}

module.exports = {
  name: "autofigu",
  description: "𝑨𝒕𝒊𝒗𝒂/𝒅𝒆𝒔𝒂𝒕𝒊𝒗𝒂 𝒂 𝒄𝒓𝒊𝒂𝒄̧𝒂̃𝒐 𝒂𝒖𝒕𝒐𝒎𝒂́𝒕𝒊𝒄𝒂 𝒅𝒆 𝒇𝒊𝒈𝒖𝒓𝒊𝒏𝒉𝒂𝒔",

  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "LukaModzz";

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs.",
          contextInfo: newsletterContext(bot)
        }, { quoted: createStatusQuoted(msg) });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);

      if (!isAdmin) {
        return conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.",
          contextInfo: newsletterContext(bot)
        }, { quoted: createStatusQuoted(msg) });
      }

      const autoconfig = loadAutoConfig();
      const groupId = from;

      if (!args || args.length === 0) {
        const status = autoconfig[groupId] === true ? "✅ ᴀᴛɪᴠᴀᴅᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ";
        const statusEmoji = autoconfig[groupId] === true ? "🔄" : "⏸️";

        return sendInteractiveMessage(conn, from, {
          text: `🎨 *ᴀᴜᴛᴏғɪɢᴜ*\n━━━━━━━━━━━━━━━━━━━━\n\n${statusEmoji} *sᴛᴀᴛᴜs:* ${status}`,
          footer: "ᴇsᴄᴏʟʜᴀ ᴜᴍᴀ ᴏᴘᴄ̧ᴀ̃ᴏ:",
          contextInfo: newsletterContext(bot),
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({ display_text: "✅ ᴀᴛɪᴠᴀʀ", id: `${prefix}autofigu 1` })
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({ display_text: "❌ ᴅᴇsᴀᴛɪᴠᴀʀ", id: `${prefix}autofigu 0` })
            }
          ]
        }, { quoted: createStatusQuoted(msg) });
      }

      const opcao = String(args[0] || "").toLowerCase();
      if (opcao === "1" || opcao === "on" || opcao === "ativar") {
        autoconfig[groupId] = true;
        saveAutoConfig(autoconfig);
        return conn.sendMessage(from, {
          text: "✅ *ᴀᴜᴛᴏғɪɢᴜ ᴀᴛɪᴠᴀᴅᴏ!*",
          contextInfo: newsletterContext(bot)
        }, { quoted: createStatusQuoted(msg) });
      }

      if (opcao === "0" || opcao === "off" || opcao === "desativar") {
        autoconfig[groupId] = false;
        saveAutoConfig(autoconfig);
        return conn.sendMessage(from, {
          text: "⏸️ *ᴀᴜᴛᴏғɪɢᴜ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*",
          contextInfo: newsletterContext(bot)
        }, { quoted: createStatusQuoted(msg) });
      }

      return conn.sendMessage(from, {
        text: `❌ Opção inválida. Use ${prefix}autofigu 1 ou ${prefix}autofigu 0.`,
        contextInfo: newsletterContext(bot)
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("ᴇʀʀᴏ ᴀᴜᴛᴏғɪɢᴜ:", error);
      return conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄᴏɴғɪɢᴜʀᴀʀ ᴀᴜᴛᴏ-ғɪɢᴜʀɪɴʜᴀ.",
        contextInfo: newsletterContext(config.botName || "LukaModzz")
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  async autoHandler(conn, msg, from, sender) {
    try {
      const botLid = config.botLid;
      const bot = config.botName || "LukaModzz";
      if (!botLid || sender === botLid) return;
      if (!from.endsWith("@g.us")) return;

      const imageMessage = msg.message?.imageMessage;
      const videoMessage = msg.message?.videoMessage;
      if (!imageMessage && !videoMessage) return;

      const autoconfig = loadAutoConfig();
      if (autoconfig[from] !== true) return;

      const messageId = msg.key?.id;
      if (!messageId || processedMessages.has(messageId)) return;
      processedMessages.set(messageId, Date.now());

      // Evita crescimento infinito do cache.
      if (processedMessages.size > 1000) {
        const limit = Date.now() - 60 * 60 * 1000;
        for (const [id, timestamp] of processedMessages.entries()) {
          if (timestamp < limit) processedMessages.delete(id);
        }
      }

      const mediaBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      if (!Buffer.isBuffer(mediaBuffer) || mediaBuffer.length === 0) return;

      let stickerBuffer = imageMessage
        ? await imageToWebp(mediaBuffer)
        : await videoToWebp(mediaBuffer);

      try {
        stickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);
      } catch (metadataError) {
        console.error("Aviso autofigu metadata:", metadataError.message);
      }

      await conn.sendMessage(from, {
        sticker: stickerBuffer,
        mimetype: "image/webp",
        contextInfo: newsletterContext(bot)
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      const detalhe = error?.stderr || error?.message || String(error);
      console.error("ᴇʀʀᴏ ᴀᴜᴛᴏʜᴀɴᴅʟᴇʀ:", detalhe);
    }
  }
};
