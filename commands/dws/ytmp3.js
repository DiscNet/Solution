// Menu: Downloads - YouTube | Comando: ytmp3
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, sendYoutubeAudio } = require("../../functions/youtubeResult");

module.exports = {
  name: "ytmp3",
  aliases: ["ytaudio"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytmp3 link ou pesquisa",
  description: "Baixa áudio do YouTube",

  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .ytmp3 <link ou pesquisa>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎵", key: msg.key },
      }).catch(() => {});

      const video = await resolveYoutubeVideo(query);
      await sendYoutubeAudio(conn, msg, from, video?.url || query);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTMP3]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível baixar o áudio.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
