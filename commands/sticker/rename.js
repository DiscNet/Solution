// commands/sticker/rename.js
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const webp = require("node-webpmux");
const config = require("../../config/config");

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
      emojis: ["✨", "🏷️"]
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
  name: "rename",
  description: "Adiciona nome do pacote e autor a uma figurinha existente",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      
      if (!args || args.length < 2) {
        return conn.sendMessage(from, {
          text: "❌ *ᴜsᴇ:* .rename [ɴᴏᴍᴇ ᴅᴏ ᴘᴀᴄᴏᴛᴇ] | [ᴀᴜᴛᴏʀ]\n\n📝 *ᴇxᴇᴍᴘʟᴏ:*\n.rename ᴍᴇᴜ ᴘᴀᴄᴋ | @ᴇᴜ\n\n⚠️ *ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ ᴇxɪsᴛᴇɴᴛᴇ*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      let packname = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      let author = "ᴅᴇᴠ: ᴋxʟʏɴ";
      const argsText = args.join(" ");
      if (argsText.includes("|")) {
        const parts = argsText.split("|");
        packname = parts[0].trim();
        author = parts[1] ? parts[1].trim() : author;
      }

      await conn.sendMessage(from, { react: { text: "🏷️", key: msg.key } });

      let stickerBuffer = null;

      if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.stickerMessage) {
        const quotedSticker = msg.message.extendedTextMessage.contextInfo.quotedMessage.stickerMessage;
        const quotedMsg = { message: { stickerMessage: quotedSticker }, key: msg.key };
        stickerBuffer = await downloadMediaMessage(quotedMsg, "buffer", {}, {});
      } 
      else if (msg.message?.stickerMessage) {
        stickerBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      }
      
      if (!stickerBuffer) {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        return conn.sendMessage(from, { 
          text: "❌ *ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ғɪɢᴜʀɪɴʜᴀ ᴇxɪsᴛᴇɴᴛᴇ ᴄᴏᴍ .rename*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }
      
      const newStickerBuffer = await addStickerMetadata(stickerBuffer, packname, author);
      
      await conn.sendMessage(from, { 
        sticker: newStickerBuffer,
        mimetype: "image/webp",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
      
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("ʀᴇɴᴀᴍᴇ:", error);
      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
      await conn.sendMessage(from, { 
        text: "❌ *ᴇʀʀᴏ ᴀᴏ ʀᴇɴᴏᴍᴇᴀʀ ғɪɢᴜʀɪɴʜᴀ.*",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};