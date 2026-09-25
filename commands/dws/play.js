// Menu: Downloads - YouTube | Comando: play
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

function first(data) {
  return tokitoApi.list(data)[0] || tokitoApi.firstObject(data) || {};
}

module.exports = {
  name: "play",
  aliases: ["yta"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "play música ou link",
  description: "Pesquisa e envia áudio do YouTube pela Tokito API",
  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();
    if (!query) return conn.sendMessage(from, { text: "❌ Uso: .play <música ou link>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🎧", key: msg.key } }).catch(() => {});
      let target = query;
      let meta = {};

      if (!/^https?:\/\//i.test(query)) {
        const data = await tokitoApi.get("/api/youtube-search", { query });
        meta = first(data);
        target = meta?.url || meta?.link || meta?.video_url || meta?.videoUrl || query;
      }

      const title = meta?.title || meta?.titulo || query;
      const channel = meta?.channel || meta?.canal || meta?.author || meta?.autor || "";
      const thumb = meta?.thumbnail || meta?.thumb || meta?.image || meta?.capa || "";

      if (thumb) {
        await conn.sendMessage(from, {
          image: { url: thumb },
          caption: `🎵 *${title}*${channel ? `\n👤 ${channel}` : ""}`,
        }, { quoted: createStatusQuoted(msg) }).catch(() => {});
      }

      await conn.sendMessage(from, {
        audio: { url: tokitoApi.url("/api/youtube-audio", { q: target }) },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO PLAY]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível pesquisar ou baixar pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};