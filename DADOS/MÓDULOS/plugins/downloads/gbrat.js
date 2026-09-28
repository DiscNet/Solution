const axios = require("axios");
const config = require("../../../config/config");
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
      const base = String(config.tokitoApiUrl || "https://tokito-apis.com.br").replace(/\/+$/, "");
      const url = `${base}/api/stickers/brat-vid?text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(config.tokitoApi || "")}`;

      await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } });

      const response = await axios.get(url, { responseType: "arraybuffer" });
      const videoBuffer = Buffer.from(response.data);

      await conn.sendMessage(from, {
        video: videoBuffer,
        gifPlayback: true,
        caption: `🎨 *ʙʀᴀᴛ ɢɪғ*\n📝 ${text}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: bot,
            serverMessageId: 116
          }
        }
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
    } catch (error) {
      console.error("[GBRAT]", error?.response?.status || "-", error.message);
      await conn.sendMessage(from, {
        text: `❌ API${error?.response?.status ? ` (${error.response.status})` : ""}: falha ao criar o gbrat.`
      }, { quoted: msg });
    }
  }
};
