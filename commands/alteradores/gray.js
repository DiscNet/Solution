// Menu: Alteradores - Imagem | Comando: gray
const sharp = require("sharp");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");

function getImageMessage(msg) {
  if (msg.message?.imageMessage) return msg.message.imageMessage;
  return msg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage || null;
}

async function downloadImage(imageMessage) {
  const stream = await downloadContentFromMessage(imageMessage, "image");
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.from(chunk));
  const buffer = Buffer.concat(chunks);
  if (!buffer.length) throw new Error("imagem vazia");
  return buffer;
}

module.exports = {
  name: "gray",
  aliases: ["cinza", "grayscale"],
  description: "ᴀᴘʟɪᴄᴀ ᴇғᴇɪᴛᴏ ᴄɪɴᴢᴀ/preto ᴇ ʙʀᴀɴᴄᴏ",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";

    try {
      const imageMessage = getImageMessage(msg);
      if (!imageMessage) {
        return conn.sendMessage(from, {
          text: `❌ ᴇɴᴠɪᴇ ᴜᴍᴀ ɪᴍᴀɢᴇᴍ ᴄᴏᴍ ${prefix}gray na legenda ou responda a uma imagem com ${prefix}gray.`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "⚫", key: msg.key } }).catch(() => {});
      const input = await downloadImage(imageMessage);
      const output = await sharp(input, { failOn: "none" })
        .rotate()
        .grayscale()
        .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      await conn.sendMessage(from, {
        image: output,
        caption: "⚫ *Cinza*"
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("gray:", error);
      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, { text: "❌ ɴãᴏ ғᴏɪ ᴘᴏssíᴠᴇʟ ᴀᴘʟɪᴄᴀʀ ᴏ ᴇғᴇɪᴛᴏ ᴄɪɴᴢᴀ." }, { quoted: createStatusQuoted(msg) }).catch(() => {});
    }
  }
};


Object.assign(module.exports, {
  "menuCategory": "Alteradores",
  "menuSection": "Imagem",
  "usage": "gray (responda à imagem)",
  "description": "Uso: .gray (responda à imagem)"
});
