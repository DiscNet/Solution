// Menu: Downloads - YouTube | Comando: play
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, sendYoutubeChoice } = require("../../functions/youtubeResult");

module.exports = {
  name: "play",
  aliases: ["yta", "play_audio", "playaudio"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "play música ou link",
  description: "Pesquisa no YouTube e mostra botões para baixar áudio ou vídeo",
  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .play <música ou link>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const video = await resolveYoutubeVideo(query);

      if (!video?.url) {
        throw new Error("Nenhum vídeo encontrado.");
      }

      await sendYoutubeChoice(conn, msg, from, video);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YOUTUBE PLAY]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível pesquisar esse vídeo no YouTube.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
