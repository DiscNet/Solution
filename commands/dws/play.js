// Menu: Downloads - YouTube | Comando: play
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, sendYoutubeAudio } = require("../../functions/youtubeResult");

module.exports = {
  name: "play",
  aliases: ["yta", "play_audio", "playaudio"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "play música ou link",
  description: "Pesquisa e envia o áudio do YouTube diretamente",

  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .play <música ou link>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎧", key: msg.key },
      }).catch(() => {});

      const video = await resolveYoutubeVideo(query);
      const target = video?.url || query;

      await sendYoutubeAudio(conn, msg, from, target);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YOUTUBE PLAY]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível enviar o áudio desse vídeo.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
