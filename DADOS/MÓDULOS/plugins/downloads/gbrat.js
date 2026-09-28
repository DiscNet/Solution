const config = require("../../../config/config");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");

module.exports = {
  name: "gbrat",
  menuCategory: "Downloads",
  menuSection: "Imagens",
  usage: "gbrat texto",
  description: "Uso: .gbrat texto",

  async execute(conn, msg, args, from) {
    try {
      const text = args.join(" ") || "brat";
      const bot = config.botName || "GrimmJow";

      await conn.sendMessage(from, {
        react: { text: "🎨", key: msg.key },
      });

      const result = await tokitoApi.buffer(
        "/api/stickers/brat-vid",
        { text },
        { timeout: 60000 }
      );

      if (!result.buffer.length) {
        throw new Error("A API não retornou vídeo.");
      }

      await conn.sendMessage(from, {
        video: result.buffer,
        mimetype: result.contentType.split(";")[0] || "video/mp4",
        gifPlayback: true,
        caption: `🎨 *ʙʀᴀᴛ ɢɪғ*\n📝 ${text}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116,
          },
        },
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      });
    } catch (error) {
      const info = tokitoApi.errorInfo(error);
      console.error("[GBRAT]", info.status || "-", info.message);

      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível criar o gbrat."),
      }, { quoted: msg });
    }
  },
};
