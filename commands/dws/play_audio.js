// Menu: Downloads - YouTube | Comando: play_audio
const { createStatusQuoted } = require("../../functions/statusCard");
const { sendYoutubeAudio } = require("../../functions/youtubeResult");

module.exports = {
  name: "play_audio",
  aliases: ["playaudio"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "play_audio música ou link",
  description: "Baixa áudio do YouTube diretamente",
  async execute(conn, msg, args, from) {
    const target = args.join(" ").trim();

    if (!target) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .play_audio <música ou link>",
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
      console.error("[PLAY AUDIO]", error?.message || error);
      await conn.sendMessage(from, {
        text: "❌ Não foi possível baixar o áudio.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
