// Menu: Downloads - YouTube | Comando: ytplay
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, sendYoutubeChoice } = require("../../functions/youtubeResult");

module.exports = {
  name: "ytplay",
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytplay termo ou link",
  description: "Pesquisa um vídeo do YouTube e mostra botões de áudio e vídeo",

  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .ytplay <nome ou link do vídeo>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎬", key: msg.key },
      }).catch(() => {});

      const video = await resolveYoutubeVideo(query);

      if (!video?.url) {
        throw new Error("Vídeo não encontrado.");
      }

      await sendYoutubeChoice(conn, msg, from, video);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YOUTUBE YTPLAY]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível encontrar esse vídeo.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
