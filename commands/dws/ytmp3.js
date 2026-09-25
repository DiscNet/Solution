// Menu: Downloads - YouTube | Comando: ytmp3
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "ytmp3",
  aliases: ["ytaudio"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytmp3 link ou pesquisa",
  description: "Baixa áudio do YouTube pela Tokito API",
  async execute(conn, msg, args, from) {
    const target = args.join(" ").trim();
    if (!target) return conn.sendMessage(from, { text: "❌ Uso: .ytmp3 <link ou pesquisa>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🎵", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        audio: { url: tokitoApi.url("/api/youtube-audio", { q: target }) },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO YTMP3]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível baixar o áudio pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};