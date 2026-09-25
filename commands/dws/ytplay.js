// Menu: Downloads - YouTube | Comando: ytplay
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { resolveYoutubeVideo, infoText } = require("../../functions/youtubeResult");
const { sendInteractiveMessage } = require("gifted-btns");

function botName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

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

      await sendInteractiveMessage(
        conn,
        from,
        {
          text: infoText(video) + "\n\nEscolha como deseja baixar:",
          footer: botName(),
          image: video.thumbnail ? { url: video.thumbnail } : undefined,
          aimode: true,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: botName(),
              serverMessageId: 116,
            },
          },
          interactiveButtons: [
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "🎵 Áudio",
                id: prefix + "play " + video.url,
              }),
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📹 Vídeo",
                id: prefix + "ytmp4 " + video.url,
              }),
            },
            {
              name: "quick_reply",
              buttonParamsJson: JSON.stringify({
                display_text: "📄 Documento",
                id: prefix + "playdoc " + video.url,
              }),
            },
          ],
        },
        { quoted: createStatusQuoted(msg) },
      );

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
