// Menu: Downloads - YouTube | Comando: play_audio
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

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

      await conn.sendMessage(from, {
        audio: { url: tokitoApi.url("/api/youtube-audio", { q: target }) },
        mimetype: "audio/mpeg",
        ptt: false,
        fileName: "audio.mp3",
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[PLAY AUDIO]", error.message);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível baixar o áudio."),
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
