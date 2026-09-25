// Menu: Downloads - Instagram | Comando: igaudio
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "igaudio",
  aliases: ["instagramaudio", "instagram_audio"],
  menuCategory: "Downloads",
  menuSection: "Instagram",
  usage: "igaudio link",
  description: "Baixa áudio do Instagram pela Tokito API",
  async execute(conn, msg, args, from) {
    const link = String(args[0] || "").trim();
    if (!link) return conn.sendMessage(from, { text: "❌ Uso: .igaudio <link>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        audio: { url: tokitoApi.url("/api/insta-video", { url: link }) },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO INSTAGRAM AUDIO]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível extrair o áudio pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};