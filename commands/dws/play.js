// Menu: Downloads - YouTube | Comando: play
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

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

      const audioUrl = tokitoApi.url("/api/youtube-audio", {
        q: query,
        query,
      });

      await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: "audio.mp3",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YOUTUBE PLAY]", error?.message || error);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível enviar o áudio."),
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
