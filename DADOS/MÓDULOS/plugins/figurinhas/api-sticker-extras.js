// Extras gratuitos de figurinha inspirados no catálogo da Tokito V10.
const fs = require("fs");
const path = require("path");
const os = require("os");
const util = require("util");
const { execFile } = require("child_process");
const webp = require("node-webpmux");
const { downloadContentFromMessage } = require("@whiskeysockets/baileys");
const { unwrapMessage } = require("../../functions/messageText");
const { createStatusQuoted } = require("../../functions/statusCard");

const execFilePromise = util.promisify(execFile);

function contextInfo(msg) {
  const message = unwrapMessage(msg);
  for (const value of Object.values(message || {})) {
    if (value && typeof value === "object" && value.contextInfo) return value.contextInfo;
  }
  return {};
}

function stickerMessage(msg) {
  const direct = unwrapMessage(msg)?.stickerMessage;
  if (direct) return direct;
  return unwrapMessage(contextInfo(msg)?.quotedMessage)?.stickerMessage || null;
}

async function downloadSticker(sticker) {
  const stream = await downloadContentFromMessage(sticker, "sticker");
  const chunks = [];
  let size = 0;
  for await (const chunk of stream) {
    const data = Buffer.from(chunk);
    size += data.length;
    if (size > 20 * 1024 * 1024) throw new Error("Figurinha muito grande");
    chunks.push(data);
  }
  return Buffer.concat(chunks);
}

function parseExif(buffer) {
  if (!buffer?.length) return null;
  const text = buffer.toString("utf8");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try { return JSON.parse(text.slice(start, end + 1)); }
  catch (_) { return null; }
}

module.exports = [
  {
    name: "exif",
    aliases: ["stickerinfo"],
    menuCategory: "Figurinhas",
    menuSection: "Edição",
    usage: "exif (responda à figurinha)",
    description: "Mostra nome do pacote e autor gravados na figurinha",
    async execute(conn, msg, args, from) {
      try {
        const source = stickerMessage(msg);
        if (!source) {
          return conn.sendMessage(from, { text: "❌ Responda a uma figurinha." }, { quoted: createStatusQuoted(msg) });
        }
        const buffer = await downloadSticker(source);
        const image = new webp.Image();
        await image.load(buffer);
        const data = parseExif(image.exif);
        await conn.sendMessage(from, {
          text:
            `🏷️ *EXIF DA FIGURINHA*\n\n` +
            `📦 Pacote: *${data?.["sticker-pack-name"] || "não informado"}*\n` +
            `✍️ Autor: *${data?.["sticker-pack-publisher"] || "não informado"}*\n` +
            `🆔 ID: *${data?.["sticker-pack-id"] || "não informado"}*`,
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        await conn.sendMessage(from, { text: "❌ Não foi possível ler os metadados dessa figurinha." }, { quoted: createStatusQuoted(msg) });
      }
    },
  },

  {
    name: "togif",
    aliases: ["sticker2gif", "figgif"],
    menuCategory: "Figurinhas",
    menuSection: "Conversão",
    usage: "togif (responda à figurinha animada)",
    description: "Converte figurinha animada em vídeo com reprodução tipo GIF",
    async execute(conn, msg, args, from) {
      const source = stickerMessage(msg);
      if (!source) {
        return conn.sendMessage(from, { text: "❌ Responda a uma figurinha." }, { quoted: createStatusQuoted(msg) });
      }

      const dir = await fs.promises.mkdtemp(path.join(os.tmpdir(), "solution-togif-"));
      const input = path.join(dir, "input.webp");
      const output = path.join(dir, "output.mp4");

      try {
        const buffer = await downloadSticker(source);
        await fs.promises.writeFile(input, buffer);
        await execFilePromise("ffmpeg", [
          "-y", "-hide_banner", "-loglevel", "error",
          "-i", input,
          "-movflags", "+faststart",
          "-pix_fmt", "yuv420p",
          "-vf", "scale=trunc(iw/2)*2:trunc(ih/2)*2",
          "-an",
          output,
        ], { timeout: 60000, maxBuffer: 8 * 1024 * 1024 });

        const video = await fs.promises.readFile(output);
        await conn.sendMessage(from, {
          video,
          mimetype: "video/mp4",
          gifPlayback: true,
          caption: "🎞️ Figurinha convertida.",
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        await conn.sendMessage(from, { text: "❌ Não foi possível converter essa figurinha." }, { quoted: createStatusQuoted(msg) });
      } finally {
        await fs.promises.rm(dir, { recursive: true, force: true }).catch(() => {});
      }
    },
  },
];
