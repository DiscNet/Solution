// commands/admins/autofigu.js
const fs = require("fs");
const path = require("path");
const { downloadMediaMessage } = require("@whiskeysockets/baileys");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const webp = require("node-webpmux");
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");
const prefix = config.prefix || ".";

// ==============================================
// CONFIGURAÇÕES PADRÃO (INALTERADAS)
// ==============================================
const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

// ==============================================
const processedMessages = new Map();

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
  name: "autofigu",
  description: "𝑨𝒕𝒊𝒗𝒂/𝒅𝒆𝒔𝒂𝒕𝒊𝒗𝒂 𝒂 𝒄𝒓𝒊𝒂𝒄̧𝒂̃𝒐 𝒂𝒖𝒕𝒐𝒎𝒂́𝒕𝒊𝒄𝒂 𝒅𝒆 𝒇𝒊𝒈𝒖𝒓𝒊𝒏𝒉𝒂𝒔",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "LukaModzz"
      
      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      if (!from.endsWith("@g.us")) {
        return conn.sendMessage(from, { 
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ғᴜɴᴄɪᴏɴᴀ ᴇᴍ ɢʀᴜᴘᴏs.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const groupMetadata = await conn.groupMetadata(from);
      const sender = msg.key.participant || msg.key.remoteJid;
      const isAdmin = groupMetadata.participants.some(p => p.id === sender && p.admin);
      
      if (!isAdmin) {
        return conn.sendMessage(from, { 
          text: "❌ ᴀᴘᴇɴᴀs ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀᴇs ᴘᴏᴅᴇᴍ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const configPath = path.join(__dirname, "..", "..", "config", "autofigu.json");
      
      let autoconfig = {};
      if (fs.existsSync(configPath)) {
        autoconfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }
      
      const groupId = from;

      if (!args || args.length === 0) {
        const status = autoconfig[groupId] === true ? "✅ ᴀᴛɪᴠᴀᴅᴏ" : "❌ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ";
        const statusEmoji = autoconfig[groupId] === true ? "🔄" : "⏸️";

        return await sendInteractiveMessage(conn, from, {
          text: `🎨 *ᴀᴜᴛᴏғɪɢᴜ*\n━━━━━━━━━━━━━━━━━━━━\n\n${statusEmoji} *sᴛᴀᴛᴜs:* ${status}`,
          footer: "ᴇsᴄᴏʟʜᴀ ᴜᴍᴀ ᴏᴘᴄ̧ᴀ̃ᴏ:",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({ display_text: "✅ ᴀᴛɪᴠᴀʀ", id: `${prefix}autofigu 1`})
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({ display_text: "❌ ᴅᴇsᴀᴛɪᴠᴀʀ", id: `${prefix}autofigu 0`})
            }
          ]
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const opcao = args[0].toLowerCase();
      
      if (opcao === "1" || opcao === "on" || opcao === "ativar") {
        autoconfig[groupId] = true;
        fs.writeFileSync(configPath, JSON.stringify(autoconfig, null, 2));
        
        return conn.sendMessage(from, { 
          text: "✅ *ᴀᴜᴛᴏғɪɢᴜ ᴀᴛɪᴠᴀᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
        
      } else if (opcao === "0" || opcao === "off" || opcao === "desativar") {
        autoconfig[groupId] = false;
        fs.writeFileSync(configPath, JSON.stringify(autoconfig, null, 2));
        
        return conn.sendMessage(from, { 
          text: "⏸️ *ᴀᴜᴛᴏғɪɢᴜ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

    } catch (error) {
      console.error("ᴇʀʀᴏ ᴀᴜᴛᴏғɪɢᴜ:", error);
      await conn.sendMessage(from, { 
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄᴏɴғɪɢᴜʀᴀʀ ᴀᴜᴛᴏ-ғɪɢᴜʀɪɴʜᴀ.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ", vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + (pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ") + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });
    }
  },

  async autoHandler(conn, msg, from, sender) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const botLid = config.botLid;
      const bot = config.botName;
      if (!botLid) return;
      if (sender === botLid) return;

      if (!from.endsWith("@g.us")) return;
      if (!msg.message?.imageMessage && !msg.message?.videoMessage) return;

      const configPath = path.join(__dirname, "..", "..", "config", "autofigu.json");
      let autoconfig = {};
      if (fs.existsSync(configPath)) {
        autoconfig = JSON.parse(fs.readFileSync(configPath, "utf8"));
      }

      if (autoconfig[from] !== true) return;

      const messageId = msg.key.id;
      if (processedMessages.has(messageId)) return;
      processedMessages.set(messageId, Date.now());

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const mediaBuffer = await downloadMediaMessage(msg, "buffer", {}, {});
      if (!mediaBuffer) return;

      const tempDir = path.join(__dirname, "..", "..", "temp");
      const tempInput = path.join(tempDir, `input_${Date.now()}.jpg`);
      const tempOutput = path.join(tempDir, `output_${Date.now()}.webp`);

      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      fs.writeFileSync(tempInput, mediaBuffer);

      await execPromise(`ffmpeg -i "${tempInput}" -vf "scale=512:512" -c:v libwebp -q:v 80 "${tempOutput}"`);

      const buffer = fs.readFileSync(tempOutput);
      const finalSticker = await addStickerMetadata(buffer, PACKNAME, AUTHOR);

      await conn.sendMessage(from, { 
        sticker: finalSticker,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      fs.unlinkSync(tempInput);
      fs.unlinkSync(tempOutput);

    } catch (error) {
      console.error("ᴇʀʀᴏ ᴀᴜᴛᴏʜᴀɴᴅʟᴇʀ:", error);
    }
  }
};