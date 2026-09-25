// Menu: Downloads - Instagram | Comando: insta
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "insta",
  aliases: ["instagram"],
  menuCategory: "Downloads",
  menuSection: "Instagram",
  usage: "insta link",
  description: "Baixa vídeo do Instagram pela Tokito API",
  async execute(conn, msg, args, from) {
    const link = String(args[0] || "").trim();
    if (!link) return conn.sendMessage(from, { text: "❌ Uso: .insta <link>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "📸", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        video: { url: tokitoApi.url("/api/insta-video", { url: link }) },
        mimetype: "video/mp4",
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO INSTAGRAM]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível baixar o Instagram pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};