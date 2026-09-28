const fs = require("fs");
const path = require("path");
const sharp = require("../../functions/sharpCompat");
const tokitoApi = require("../../functions/apiClient");
const { execFileCompat, writableTempDir } = require("../../functions/runtimeCompat");
const { createStatusQuoted } = require("../../functions/statusCard");

const TEMP_DIR = writableTempDir("solution-brat");

function safeUnlink(file) {
  try {
    if (file && fs.existsSync(file)) fs.unlinkSync(file);
  } catch (_) {}
}

async function convertImageToWebp(buffer) {
  try {
    return await sharp(buffer)
      .resize(512, 512, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
  } catch (sharpError) {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const input = path.join(TEMP_DIR, `brat_${id}.img`);
    const output = path.join(TEMP_DIR, `brat_${id}.webp`);

    try {
      fs.writeFileSync(input, buffer);
      await execFileCompat(
        "ffmpeg",
        [
          "-y",
          "-hide_banner",
          "-loglevel", "error",
          "-i", input,
          "-vf", "scale=512:512:force_original_aspect_ratio=decrease",
          "-c:v", "libwebp",
          "-q:v", "80",
          output,
        ],
        { timeout: 30000, maxBuffer: 8 * 1024 * 1024 }
      );

      const result = fs.readFileSync(output);
      if (!result.length) throw new Error("FFmpeg gerou WebP vazio.");
      return result;
    } finally {
      safeUnlink(input);
      safeUnlink(output);
    }
  }
}

const commands = [
  {
    name: "brat",
    aliases: [],
    menuCategory: "Downloads",
    menuSection: "Imagens",
    usage: "brat texto",
    description: "Cria figurinha Brat pela Tokito API",

    async execute(conn, msg, args, from) {
      const text = args.join(" ").trim();
      if (!text) {
        return conn.sendMessage(from, {
          text: "❌ Uso: .brat <texto>",
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        const result = await tokitoApi.buffer(
          "/api/stickers/brat-img",
          { text },
          { timeout: 45000 }
        );

        if (!result.buffer.length) {
          throw new Error("A API não retornou imagem.");
        }

        const webp = await convertImageToWebp(result.buffer);

        await conn.sendMessage(from, {
          sticker: webp,
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[BRAT]", info.status || "-", info.message);

        const text =
          error?.code === "ERR_EXEC_PERMISSION"
            ? "❌ O Android/Termux bloqueou a execução do FFmpeg."
            : error?.code === "ERR_EXEC_MISSING"
              ? "❌ FFmpeg não foi encontrado neste ambiente."
              : tokitoApi.userError(error, "Não foi possível gerar o Brat.");

        await conn.sendMessage(from, {
          text,
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },

  {
    name: "bratvid",
    aliases: ["bratvideo"],
    menuCategory: "Downloads",
    menuSection: "Imagens",
    usage: "bratvid texto",
    description: "Gera Brat animado pela Tokito API",

    async execute(conn, msg, args, from) {
      const text = args.join(" ").trim();
      if (!text) {
        return conn.sendMessage(from, {
          text: "❌ Uso: .bratvid <texto>",
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        const result = await tokitoApi.buffer(
          "/api/stickers/brat-vid",
          { text },
          { timeout: 60000 }
        );

        if (!result.buffer.length) {
          throw new Error("A API não retornou vídeo.");
        }

        await conn.sendMessage(from, {
          video: result.buffer,
          mimetype: result.contentType.split(";")[0] || "video/mp4",
          gifPlayback: true,
          caption: "🧊 Brat",
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[BRATVID]", info.status || "-", info.message);

        await conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível gerar o Brat animado."),
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports = commands;
