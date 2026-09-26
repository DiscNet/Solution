// Menu: Downloads - TikTok | Comando: ttkmp3
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/apiClient");

module.exports = {
  name: "ttkmp3",
  aliases: ["tiktokaudio", "tiktok_audio", "ttaudio"],
  menuCategory: "Downloads",
  menuSection: "TikTok",
  usage: "ttkmp3 link",
  description: "Baixa áudio do TikTok pela Tokito API",
  async execute(conn, msg, args, from) {
    const link = String(args[0] || "").trim();
    if (!link) return conn.sendMessage(from, { text: "❌ Uso: .ttkmp3 <link>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        audio: { url: tokitoApi.url("/api/tiktok-video", { url: link }) },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO TIKTOK AUDIO]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível extrair o áudio pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};