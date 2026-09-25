// Menu: Downloads - YouTube | Comando: ytsearch
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeList, sendYoutubeSearchList } = require("../../functions/youtubeResult");

async function searchYoutube(query) {
  const data = await tokitoApi.get("/api/youtube-search", {
    query,
    q: query,
    text: query,
  }, { timeout: 30000 });

  return normalizeYoutubeList(data, tokitoApi.list).slice(0, 10);
}

module.exports = {
  name: "ytsearch",
  aliases: ["yts"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytsearch termo",
  description: "Pesquisa vídeos no YouTube e mostra os resultados em lista interativa",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text:
          "❌ *Digite o nome do vídeo.*\n\n" +
          "📌 Exemplo: " + prefix + "ytsearch matue 1993",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const results = await searchYoutube(query);
      if (!results.length) {
        throw new Error("Nenhum resultado encontrado.");
      }

      await sendYoutubeSearchList(conn, msg, from, results, query);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTSEARCH]", error?.message || error);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível pesquisar no YouTube."),
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _internals: {
    searchYoutube,
  },
};
