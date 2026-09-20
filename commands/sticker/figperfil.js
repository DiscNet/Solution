// Menu: Figurinhas - Perfil | Comando: figperfil
const axios = require("axios");
const sharp = require("sharp");
const { createStatusQuoted } = require("../../functions/statusCard");
const { getMessageProfilePicture } = require("../../functions/profilePicture");

module.exports = {
  name: "figperfil",
  aliases: ["perfilfig", "stickerperfil"],
  menuCategory: "Figurinhas",
  menuSection: "Perfil",
  usage: "figperfil [@usuario]",
  description: "Transforma a foto de perfil acessível em figurinha",

  async execute(conn, msg, args, from) {
    try {
      await conn.sendMessage(from, { react: { text: "🖼️", key: msg.key } }).catch(() => {});

      const picture = await getMessageProfilePicture(conn, msg, from);
      if (!picture) {
        return conn.sendMessage(
          from,
          { text: "❌ A pessoa não possui foto de perfil acessível ou a privacidade impede a consulta." },
          { quoted: createStatusQuoted(msg) }
        );
      }

      const { data } = await axios.get(picture.url, {
        responseType: "arraybuffer",
        timeout: 20000,
        maxContentLength: 12 * 1024 * 1024,
      });

      const sticker = await sharp(Buffer.from(data), { failOn: "none" })
        .rotate()
        .resize(512, 512, {
          fit: "contain",
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .webp({ quality: 88, effort: 4 })
        .toBuffer();

      await conn.sendMessage(
        from,
        { sticker, mimetype: "image/webp" },
        { quoted: createStatusQuoted(msg) }
      );

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[FIGPERFIL]", error?.message || error);
      await conn.sendMessage(
        from,
        { text: "❌ Não foi possível gerar a figurinha da foto de perfil." },
        { quoted: createStatusQuoted(msg) }
      );
    }
  },
};
