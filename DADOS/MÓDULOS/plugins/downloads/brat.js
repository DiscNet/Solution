const axios = require("axios");
const sharp = require("sharp");
const config = require("../../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");

function apiUrl(route, params = {}) {
  const base = String(config.tokitoApiUrl || "https://tokito-apis.com.br").replace(/\/+$/, "");
  const query = new URLSearchParams({
    ...params,
    apikey: String(config.tokitoApi || ""),
  });
  return `${base}${route}?${query.toString()}`;
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
        const response = await axios.get(
          apiUrl("/api/stickers/brat-img", { text }),
          { responseType: "arraybuffer" }
        );

        const webp = await sharp(Buffer.from(response.data))
          .resize(512, 512, { fit: "inside", withoutEnlargement: true })
          .webp({ quality: 90 })
          .toBuffer();

        await conn.sendMessage(from, {
          sticker: webp,
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        console.error("[BRAT]", error?.response?.status || "-", error.message);
        await conn.sendMessage(from, {
          text: `❌ API${error?.response?.status ? ` (${error.response.status})` : ""}: falha ao gerar o Brat.`,
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
        const response = await axios.get(
          apiUrl("/api/stickers/brat-vid", { text }),
          { responseType: "arraybuffer" }
        );

        await conn.sendMessage(from, {
          video: Buffer.from(response.data),
          mimetype: response.headers?.["content-type"]?.split(";")[0] || "video/mp4",
          gifPlayback: true,
          caption: "🧊 Brat • Tokito API",
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        console.error("[BRATVID]", error?.response?.status || "-", error.message);
        await conn.sendMessage(from, {
          text: `❌ API${error?.response?.status ? ` (${error.response.status})` : ""}: falha ao gerar o Brat animado.`,
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports = commands;
