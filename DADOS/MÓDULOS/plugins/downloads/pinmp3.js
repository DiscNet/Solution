// Menu: Downloads - Pinterest | Comando: pinmp3
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/apiClient");

module.exports = {
  name: "pinmp3",
  aliases: ["pinterestmp3"],
  menuCategory: "Downloads",
  menuSection: "Pinterest",
  usage: "pinmp3 link",
  description: "Extrai áudio de vídeo do Pinterest pela Tokito API",
  async execute(conn, msg, args, from) {
    const link = String(args[0] || "").trim();
    if (!link) return conn.sendMessage(from, { text: "❌ Uso: .pinmp3 <link>" }, { quoted: createStatusQuoted(msg) });
    try {
      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        audio: { url: tokitoApi.url("/api/pinterest-video", { url: link }) },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO PIN MP3]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível extrair o áudio do Pinterest." }, { quoted: createStatusQuoted(msg) });
    }
  },
};
