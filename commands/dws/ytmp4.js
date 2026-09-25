// Menu: Downloads - YouTube | Comando: ytmp4
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "ytmp4",
  aliases: ["ytvideo", "playvideo", "play-video", "play_video"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytmp4 link ou pesquisa",
  description: "Baixa vídeo do YouTube pela API",
  async execute(conn, msg, args, from) {
    const target = args.join(" ").trim();
    if (!target) return conn.sendMessage(from, { text: "❌ Uso: .ytmp4 <link ou pesquisa>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "📹", key: msg.key } }).catch(() => {});
      await conn.sendMessage(from, {
        video: { url: tokitoApi.url("/api/youtube-video", { q: target }) },
        mimetype: "video/mp4",
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[YTMP4]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível baixar o vídeo pela API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};