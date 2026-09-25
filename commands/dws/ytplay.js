// Menu: Downloads - YouTube | Comando: ytplay
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, sendYoutubeChoice } = require("../../functions/youtubeResult");

module.exports = {
  name: "ytplay",
  aliases: ["ytinfo"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytplay termo ou link",
  description: "Mostra informações do vídeo e botões para áudio ou vídeo",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: " + prefix + "ytplay <nome ou link do vídeo>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎬", key: msg.key },
      }).catch(() => {});

      const video = await resolveYoutubeVideo(query);
      if (!video?.url) throw new Error("Vídeo não encontrado.");

      await sendYoutubeChoice(conn, msg, from, video);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTPLAY]", error?.message || error);
      await conn.sendMessage(from, {
        text: "❌ Não foi possível abrir esse vídeo.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
