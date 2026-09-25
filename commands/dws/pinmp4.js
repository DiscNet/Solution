// Menu: Downloads - Pinterest | Comando: pinmp4
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "pinmp4",
  aliases: ["pinterestmp4"],
  menuCategory: "Downloads",
  menuSection: "Pinterest",
  usage: "pinmp4 link",
  description: "Baixa vídeo do Pinterest pela Tokito API",
  async execute(conn, msg, args, from) {
    const link = String(args[0] || "").trim();
    if (!link) return conn.sendMessage(from, { text: "❌ Uso: .pinmp4 <link>" }, { quoted: createStatusQuoted(msg) });
    try {
      await conn.sendMessage(from, { react: { text: "📥", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        video: { url: tokitoApi.url("/api/pinterest-video", { url: link }) },
        mimetype: "video/mp4",
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO PIN MP4]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível baixar esse vídeo do Pinterest." }, { quoted: createStatusQuoted(msg) });
    }
  },
};
