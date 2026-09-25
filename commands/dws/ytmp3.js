// Menu: Downloads - YouTube | Comando: ytmp3
const { createStatusQuoted } = require("../../functions/statusCard");
const { sendYoutubeAudio } = require("../../functions/youtubeMedia");

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

      await sendYoutubeAudio(conn, msg, from, query);

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
