const { createStatusQuoted } = require("../../functions/statusCard");
// commands/sticker/sc.js
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const webp = require("node-webpmux");
const config = require("../../config/config");

// ==============================================
// MESMO PACKNAME E AUTHOR DO COMANDO /s
// ==============================================
const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function addStickerMetadata(mediaBuffer, packname, author) {
  const tempInput = path.join(__dirname, "..", "..", "temp", `input_${Date.now()}.webp`);
  const tempOutput = path.join(__dirname, "..", "..", "temp", `output_${Date.now()}.webp`);

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
  name: "sc",
  description: "ᴄʀɪᴀ ғɪɢᴜʀɪɴʜᴀ ᴄɪʀᴄᴜʟᴀʀ ᴀ ᴘᴀʀᴛɪʀ ᴅᴇ ɪᴍᴀɢᴇᴍ ᴏᴜ ᴠíᴅᴇᴏ",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      let mediaBuffer = null;
      let isVideo = false;

      if (msg.message?.imageMessage || msg.message?.videoMessage) {
        const caption = msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
        const hasCommand = /(^|\s)(\.scirculo\b|\.sc\b|scirculo\b|sc\b)/.test(caption);

        if (!hasCommand) {
          return conn.sendMessage(from, {
            text: "❌ *ᴜsᴇ .sc ᴏᴜ .scirculo ɴᴀ ʟᴇɢᴇɴᴅᴀ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ᴍɪ́ᴅɪᴀ*",
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, {
            quoted: createStatusQuoted(msg)
          });
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
            text: "❌ *ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ/ᴠɪ́ᴅᴇᴏ ᴄᴏᴍ .sc*",
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, {
            quoted: createStatusQuoted(msg)
          });
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
          return conn.sendMessage(from, {
            text: "❌ *ᴊᴀ́ ᴇ́ ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ! ᴜsᴇ .toimg*",
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        } else {
          return conn.sendMessage(from, {
            text: "❌ *ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴏᴜ ᴠɪ́ᴅᴇᴏ ᴄᴏᴍ .sc*",
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }
      }

      if (!mediaBuffer) {
        return conn.sendMessage(from, {
          text: "❌ *ᴇɴᴠɪᴇ ᴏᴜ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ/ᴠɪ́ᴅᴇᴏ ᴄᴏᴍ .sc*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempInput = path.join(tempDir, `input_${Date.now()}.png`);
      const tempCircular = path.join(tempDir, `circular_${Date.now()}.png`);
      const tempOutput = path.join(tempDir, `sticker_${Date.now()}.webp`);

      fs.writeFileSync(tempInput, mediaBuffer);

      if (isVideo) {
        const tempFrame = path.join(tempDir, `frame_${Date.now()}.png`);
        await execPromise(`ffmpeg -i "${tempInput}" -vframes 1 -f image2 "${tempFrame}" -y`);
        await execPromise(`convert "${tempFrame}" -resize 512x512^ -gravity center -extent 512x512 \\( +clone -threshold -1 -negate -fill white -draw "circle 256,256 256,0" \\) -alpha off -compose copy_opacity -composite "${tempCircular}"`);
        await execPromise(`ffmpeg -i "${tempInput}" -i "${tempCircular}" -filter_complex "[0:v]scale=512:512,setpts=PTS-STARTPTS[v];[v][1:v]alphamerge" -t 5 -r 15 -c:v libwebp -lossless 0 -q:v 80 -preset default -an "${tempOutput}" -y`);
        try { fs.unlinkSync(tempFrame); } catch(e) {}
      } else {
        await execPromise(`convert "${tempInput}" -resize 512x512^ -gravity center -extent 512x512 \\( +clone -threshold -1 -negate -fill white -draw "circle 256,256 256,0" \\) -alpha off -compose copy_opacity -composite "${tempCircular}"`);
        await execPromise(`ffmpeg -i "${tempCircular}" -c:v libwebp -lossless 0 -q:v 90 -preset default -an "${tempOutput}" -y`);
      }

      if (fs.existsSync(tempOutput) && fs.statSync(tempOutput).size > 0) {
        const stickerBuffer = fs.readFileSync(tempOutput);
        const finalStickerBuffer = await addStickerMetadata(stickerBuffer, PACKNAME, AUTHOR);

        await conn.sendMessage(from, {
          sticker: finalStickerBuffer,
          mimetype: "image/webp",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: createStatusQuoted(msg)
        });

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
      } else {
        throw new Error("Falha ao criar figurinha circular");
      }

      try {
        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
        if (fs.existsSync(tempCircular)) fs.unlinkSync(tempCircular);
        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
      } catch (e) {}

    } catch (error) {
      console.error("sᴄ:", error);
      try { await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }); } catch (e) {}

      await conn.sendMessage(from, {
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ᴄʀɪᴀʀ ғɪɢᴜʀɪɴʜᴀ ᴄɪʀᴄᴜʟᴀʀ!*\n\n📌 ᴠᴇʀɪғɪǫᴜᴇ sᴇ ᴏ ɪᴍᴀɢᴇᴍᴀɢɪᴄᴋ ᴇsᴛᴀ́ ɪɴsᴛᴀʟᴀᴅᴏ: ᴘᴋɢ ɪɴsᴛᴀʟʟ ɪᴍᴀɢᴇᴍᴀɢɪᴄᴋ",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};