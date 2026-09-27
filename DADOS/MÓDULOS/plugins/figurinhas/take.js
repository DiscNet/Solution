// Menu: Figurinhas - Edição | Comando: take
const webp = require("node-webpmux");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { unwrapMessage } = require("../../functions/messageText");

function sourceSticker(msg) {
  const content = unwrapMessage(msg);
  const quoted = Object.values(content || {})
    .find(value => value && typeof value === "object" && value.contextInfo)
    ?.contextInfo?.quotedMessage;
  return unwrapMessage(quoted)?.stickerMessage || content?.stickerMessage || null;
}

function stickerName(msg) {
  const name = String(msg?.pushName || "Usuário")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/^@+/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 63) || "Usuário";
  return "@" + name;
}

async function downloadSticker(sticker) {
  const stream = await downloadContentFromMessage(sticker, "sticker");
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    const data = Buffer.from(chunk);
    size += data.length;
    if (size > 20 * 1024 * 1024) throw new Error("Figurinha muito grande.");
    chunks.push(data);
  }
  if (!size) throw new Error("Figurinha vazia.");
  return Buffer.concat(chunks);
}

async function withName(buffer, name) {
  const image = new webp.Image();
  await image.load(buffer);
  const metadata = Buffer.from(JSON.stringify({
    "sticker-pack-id": "take-" + Date.now(),
    "sticker-pack-name": "",
    "sticker-pack-publisher": name,
    emojis: [],
  }), "utf8");
  const header = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  header.writeUIntLE(metadata.length, 14, 4);
  image.exif = Buffer.concat([header, metadata]);
  return image.save(null);
}

module.exports = {
  name: "take",
  aliases: [],
  menuCategory: "Figurinhas",
  menuSection: "Edição",
  usage: "take (responda à figurinha)",
  description: "Reenvia a figurinha com o nome de quem usou o comando",
  async execute(conn, msg, args, from) {
    const sticker = sourceSticker(msg);
    if (!sticker) {
      return conn.sendMessage(from, { text: "❌ Responda a uma figurinha com .take." });
    }
    try {
      const original = await downloadSticker(sticker);
      const renamed = await withName(original, stickerName(msg));
      return conn.sendMessage(from, { sticker: renamed });
    } catch (error) {
      console.error("[TAKE]", error?.message || error);
      return conn.sendMessage(from, { text: "❌ Não foi possível editar essa figurinha." });
    }
  },
  _internals: { sourceSticker, stickerName, withName },
};
