// Menu: Downloads - YouTube | Comando: ytmp3
const { createStatusQuoted } = require("../../functions/statusCard");
const { sendYoutubeAudio } = require("../../functions/youtubeResult");

module.exports = {
  name: "ytmp3",
  aliases: ["ytaudio"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytmp3 link ou pesquisa",
  description: "Baixa áudio do YouTube pela API",

  async execute(conn, msg, args, from) {
    const target = args.join(" ").trim();

    if (!target) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .ytmp3 <link ou pesquisa>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎵", key: msg.key },
      }).catch(() => {});

      await sendYoutubeAudio(conn, msg, from, target);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTMP3]", error?.message || error);
      await conn.sendMessage(from, {
        text: "❌ Não foi possível baixar o áudio pela API.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
