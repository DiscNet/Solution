// Menu: Downloads - YouTube | Comando: ytmp4
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, sendYoutubeVideo } = require("../../functions/youtubeResult");

module.exports = {
  name: "ytmp4",
  aliases: ["ytvideo", "playvideo", "play-video", "play_video"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytmp4 link ou pesquisa",
  description: "Baixa vídeo do YouTube",

  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .ytmp4 <link ou pesquisa>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "📹", key: msg.key },
      }).catch(() => {});

      const video = await resolveYoutubeVideo(query);
      await sendYoutubeVideo(conn, msg, from, video?.url || query);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTMP4]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível baixar o vídeo.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
