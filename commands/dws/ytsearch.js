// Menu: Downloads - YouTube | Comando: ytsearch
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

module.exports = {
  name: "ytsearch",
  aliases: ["yts"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytsearch termo",
  description: "Pesquisa vídeos no YouTube pela Tokito API",
  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();
    if (!query) return conn.sendMessage(from, { text: "❌ Uso: .ytsearch <termo>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🔎", key: msg.key } }).catch(() => {});
      const data = await tokitoApi.get("/api/youtube-search", { query });
      const results = tokitoApi.list(data).slice(0, 8);
      if (!results.length) throw new Error("Nenhum resultado.");

      const text = results.map((v, i) => {
        const title = v?.title || v?.titulo || "Sem título";
        const url = v?.url || v?.link || v?.video_url || v?.videoUrl || "";
        const channel = v?.channel || v?.canal || v?.author || "";
        const duration = v?.duration || v?.duracao || "";
        return `${i + 1}. *${title}*${channel ? `\n👤 ${channel}` : ""}${duration ? ` • ⏱️ ${duration}` : ""}${url ? `\n🔗 ${url}\n🎵 .play ${url}\n📹 .ytmp4 ${url}` : ""}`;
      }).join("\n\n");

      await conn.sendMessage(from, { text: `🔎 *YOUTUBE — ${query}*\n\n${text}` }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO YTSEARCH]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível pesquisar no YouTube pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
};