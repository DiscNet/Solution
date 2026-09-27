const webp = require("node-webpmux");
const config = require("../../config/config");

const FRAME_TOP = "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮";
const FRAME_BOTTOM = "╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯";

function cleanLabel(value, fallback) {
  const text = String(value || "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (text || fallback).slice(0, 80);
}

function defaultStickerPack() {
  const bot = cleanLabel(config.botName, "Kxlyn");
  return [
    FRAME_TOP,
    "├̬⌑ؔ͟ ⎾🧊⏌ 𝙵𝙸𝙶𝚄𝚁𝙸𝙽𝙷𝙰 𝙳𝙾 𝙱𝙾𝚃",
    `├̬⌑ؔ͟ ⎾🤖⏌ 𝙱𝚘𝚝: ${bot}`,
    FRAME_BOTTOM,
  ].join("\n");
}

function defaultStickerAuthor() {
  const owner = cleanLabel(config.ownerName, "Kxlyn");
  return [
    FRAME_TOP,
    `├̬⌑ؔ͟ ⎾👑⏌ 𝙲𝚛𝚒𝚊𝚍𝚘𝚛: ${owner}`,
    FRAME_BOTTOM,
  ].join("\n");
}

function exifBuffer(packname, author, emojis = ["🧊"]) {
  const data = Buffer.from(JSON.stringify({
    "sticker-pack-id": "solution-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    "sticker-pack-name": cleanLabel(packname, defaultStickerPack()),
    "sticker-pack-publisher": cleanLabel(author, defaultStickerAuthor()),
    emojis: Array.isArray(emojis) ? emojis.slice(0, 8) : ["🧊"],
  }), "utf8");

  const header = Buffer.from([
    0x49, 0x49, 0x2a, 0x00, 0x08, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x41, 0x57, 0x07, 0x00, 0x00, 0x00,
    0x00, 0x00, 0x16, 0x00, 0x00, 0x00,
  ]);
  header.writeUIntLE(data.length, 14, 4);
  return Buffer.concat([header, data]);
}

async function applyStickerMetadata(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer) || !buffer.length) {
    throw new Error("Figurinha vazia ao aplicar metadados.");
  }

  const image = new webp.Image();
  await image.load(buffer);
  image.exif = exifBuffer(
    options.packname || defaultStickerPack(),
    options.author || defaultStickerAuthor(),
    options.emojis || ["🧊"],
  );
  return image.save(null);
}

module.exports = {
  cleanLabel,
  defaultStickerPack,
  defaultStickerAuthor,
  exifBuffer,
  applyStickerMetadata,
};
