// Menu: Figurinhas - Criação | Comando: stbg
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/stbg.js

const FormData = require("form-data");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execPromise = util.promisify(exec);
const webp = require("node-webpmux");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../../config/config");

const REMOVE_BG_API_KEY = "xyo9rDrGTeUv26jaJa5tdX8g";

const PACKNAME = `Created by LᴜᴋᴀMᴏᴅᴢᴢ Rᴏʙᴏᴛ\nDev & Owner: Kxʟʏɴ\n`;
const AUTHOR = `\nBᴏᴛ: +55 (63) 9200-3562\nMy hatred shall build empires.`;

async function addMeta(file){
  const img = new webp.Image();

  const json = {
    "sticker-pack-id": `${Math.floor(Math.random()*90000)+10000}`,
    "sticker-pack-name": PACKNAME,
    "sticker-pack-publisher": AUTHOR,
    emojis:["✨","🎨"]
  };

  const exifAttr = Buffer.from([
    0x49,0x49,0x2a,0x00,0x08,0x00,0x00,0x00,0x01,0x00,
    0x41,0x57,0x07,0x00,0x00,0x00,0x00,0x00,0x16,0x00,0x00,0x00
  ]);

  const jsonBuff = Buffer.from(JSON.stringify(json));
  const exif = Buffer.concat([exifAttr,jsonBuff]);
  exif.writeUIntLE(jsonBuff.length,14,4);

  await img.load(file);
  img.exif = exif;
  await img.save(file);

  return fs.readFileSync(file);
}

module.exports = {
  name:"stbg",
  async execute(conn, msg, args, from, axiosInstance){
    try{
      const owner = config.ownerName || "LukaModzz";

      let pushName = "Usuário";
      try {
        pushName = msg.pushName || "LukaModzz";
      } catch (e) {
        pushName = "LukaModzz";
      }

      const quoted = msg.message?.extendedTextMessage?.contextInfo;

      if(!quoted?.quotedMessage?.imageMessage) {
        return conn.sendMessage(from, {
          text: "❌ ʀᴇsᴘᴏɴᴅᴀ ᴀ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴘᴀʀᴀ ʀᴇᴍᴏᴠᴇʀ ᴏ ғᴜɴᴅᴏ!",
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
          quoted: createStatusQuoted(msg)
        });
      }

      const stream = await downloadContentFromMessage(quoted.quotedMessage.imageMessage,"image");

      let buffer = Buffer.from([]);
      for await(const c of stream) buffer = Buffer.concat([buffer,c]);

      const form = new FormData();
      form.append("image_file",buffer);
      form.append("size","auto");

      const res = await axiosInstance.post("https://api.remove.bg/v1.0/removebg",form,{
        headers:{...form.getHeaders(),"X-Api-Key":REMOVE_BG_API_KEY},
        responseType:"arraybuffer"
      });

      const tempDir = path.join(__dirname, "..", "..", "temp");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const input = path.join(tempDir, `stbg_in_${Date.now()}.png`);
      const output = path.join(tempDir, `stbg_out_${Date.now()}.webp`);

      fs.writeFileSync(input, res.data);

      await execPromise(`ffmpeg -i ${input} -vf "scale=512:512:force_original_aspect_ratio=decrease" -vcodec libwebp -lossless 1 -qscale 50 -preset default -loop 0 -an -vsync 0 ${output}`);

      const final = await addMeta(output);

      await conn.sendMessage(from, {
        sticker: final,
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
        quoted: createStatusQuoted(msg)
      });

      try {
        if (fs.existsSync(input)) fs.unlinkSync(input);
        if (fs.existsSync(output)) fs.unlinkSync(output);
      } catch (e) {}

    } catch(e) {
      console.log(e);
      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ʀᴇᴍᴏᴠᴇʀ ғᴜɴᴅᴏ!",
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
        quoted: createStatusQuoted(msg)
      });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Figurinhas",
  "menuSection": "Criação",
  "usage": "stbg (responda à imagem)",
  "description": "Uso: .stbg (responda à imagem)"
});
