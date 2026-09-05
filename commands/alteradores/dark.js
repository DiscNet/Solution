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
  name: "dark",
  aliases: ["escuro"],
  description: "Aplica efeito escuro em preto e branco",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";

    try {
      const imageMessage = getImageMessage(msg);
      if (!imageMessage) {
        return conn.sendMessage(from, {
          text: `❌ Envie uma imagem com ${prefix}dark na legenda ou responda a uma imagem com ${prefix}dark.`
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "🌑", key: msg.key } }).catch(() => {});
      const input = await downloadImage(imageMessage);
      const output = await sharp(input, { failOn: "none" })
        .rotate()
        .grayscale()
        .modulate({ brightness: 0.65 })
        .resize(1280, 1280, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 90 })
        .toBuffer();

      await conn.sendMessage(from, {
        image: output,
        caption: "🌑 *Dark*"
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("dark:", error);
      await conn.sendMessage(from, { react: { text: "❌", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, { text: "❌ Não foi possível aplicar o efeito dark." }, { quoted: createStatusQuoted(msg) }).catch(() => {});
    }
  }
};
