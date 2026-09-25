// Menu: Downloads - TikTok | Comando: ttkmp4
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "ttkmp4",
  aliases: ["tiktok"],
  menuCategory: "Downloads",
  menuSection: "TikTok",
  usage: "ttkmp4 link",
  description: "Baixa vídeo do TikTok pela Tokito API",
  async execute(conn, msg, args, from) {
    const link = String(args[0] || "").trim();
    if (!link) return conn.sendMessage(from, { text: "❌ Uso: .tiktok <link>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "📥", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        video: { url: tokitoApi.url("/api/tiktok-video", { url: link }) },
        mimetype: "video/mp4",
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO TIKTOK]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível baixar o TikTok pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};