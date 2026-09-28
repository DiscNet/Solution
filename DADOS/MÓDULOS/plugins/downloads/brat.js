const sharp = require("sharp");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");

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

        const webp = await sharp(result.buffer)
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 90 })
          .toBuffer();

        await conn.sendMessage(from, {
          sticker: webp,
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[BRAT]", info.status || "-", info.message);

        await conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível gerar o Brat."),
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
