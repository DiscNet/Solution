const webp = require("node-webpmux");
const config = require("../../config/config");

function cleanLabel(value, fallback) {
  const text = String(value || "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (text || fallback).slice(0, 80);
}

function cleanMetadata(value, fallback) {
  const text = String(value || "")
    .replace(/[\x00-\x09\x0b-\x1f\x7f]/g, " ")
    .split("\n")
    .map(line => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n")
    .trim();
  return (text || fallback).slice(0, 700);
}

function stickerBotName() {
  const configured = String(config.botName || "")
    .replace(/[\x00-\x1f\x7f]/g, " ")
    .replace(/^\s*[̵̲͞\s]+/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return configured || "GrimmJowBOT";
}

function defaultStickerPack() {
  return "";
}

function defaultStickerAuthor() {
  return "Ненависть мудрых способна породить империи.";
}

function exifBuffer(packname, author, emojis = ["🧊"]) {
  const data = Buffer.from(JSON.stringify({
    "sticker-pack-id": "solution-" + Date.now() + "-" + Math.random().toString(36).slice(2, 8),
    "sticker-pack-name": packname === "" ? "" : cleanMetadata(packname, ""),
    "sticker-pack-publisher": cleanMetadata(author, defaultStickerAuthor()),
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
    options.packname ?? defaultStickerPack(),
    options.author ?? defaultStickerAuthor(),
    options.emojis || ["🧊"],
  );
  return image.save(null);
}

module.exports = {
  cleanLabel,
  cleanMetadata,
  stickerBotName,
  defaultStickerPack,
  defaultStickerAuthor,
  exifBuffer,
  applyStickerMetadata,
};
