// Menu: Downloads - YouTube | Comando: play
const { createStatusQuoted } = require("../../functions/statusCard");
const { sendYoutubeAudio } = require("../../functions/youtubeMedia");

module.exports = {
  name: "play",
  aliases: ["yta"],
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

      await sendYoutubeAudio(conn, msg, from, query);

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
