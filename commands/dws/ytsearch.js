// Menu: Downloads - YouTube | Comando: ytsearch
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeList } = require("../../functions/youtubeResult");
const { searchVideos } = require("../../functions/youtubeClient");
const { sendInteractiveMessage } = require("gifted-btns");

function botName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function buildRows(results, prefix) {
  return results.slice(0, 10).map((video, index) => {
    const title = String(video.title || "Sem título").trim();
    const channel = String(video.channel || "").trim();
    const duration = String(video.duration || "").trim();

    return {
      id: prefix + "ytplay " + video.url,
      title: "🎬 " + (index + 1) + ". " + title.slice(0, 55),
      description: [
        duration ? "⏱️ " + duration : "",
        channel ? "👤 " + channel : "",
      ].filter(Boolean).join(" · ").slice(0, 90) || "Abrir opções",
      header: "Resultado " + (index + 1),
    };
  });
}

async function searchYoutube(query) {
  try {
    const data = await tokitoApi.get("/api/youtube-search", {
      query,
      q: query,
      text: query,
    }, { timeout: 30000 });

    const results = normalizeYoutubeList(data, tokitoApi.list);
    if (results.length) return results.slice(0, 10);
  } catch (error) {
    console.warn("[YTSEARCH API]", error?.message || error);
  }

  return searchVideos(query, 10).catch(() => []);
}

async function sendFallback(conn, msg, from, query, results) {
  const prefix = config.prefix || ".";
  const lines = results.slice(0, 6).map((video, index) => [
    (index + 1) + ". *" + String(video.title || "Sem título") + "*",
    video.channel ? "👤 " + video.channel : "",
    video.duration ? "⏱️ " + video.duration : "",
    "▶️ " + prefix + "ytplay " + video.url,
  ].filter(Boolean).join("\n"));

  return conn.sendMessage(from, {
    text:
      "🔎 *YOUTUBE SEARCH — " + query + "*\n\n" +
      lines.join("\n\n"),
  }, { quoted: createStatusQuoted(msg) });
}

async function sendSearchList(conn, msg, from, query, results) {
  const prefix = config.prefix || ".";
  const rows = buildRows(results, prefix);

  if (!rows.length) throw new Error("Nenhum resultado para montar a lista.");

  try {
    return await sendInteractiveMessage(
      conn,
      from,
      {
        text:
          "🔎 *YOUTUBE SEARCH — " + query + "*\n" +
          "📊 Resultados: " + rows.length + "\n\n" +
          "📌 Toque em *Resultados* para escolher um vídeo.",
        footer: botName(),
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
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🎬 Resultados",
              sections: [
                {
                  title: "📹 Vídeos encontrados",
                  highlight_label: "YouTube",
                  rows,
                },
              ],
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "🎵 Áudio do 1º",
              id: prefix + "play " + results[0].url,
            }),
          },
        ],
      },
      { quoted: createStatusQuoted(msg) },
    );
  } catch (error) {
    console.warn("[YTSEARCH LIST]", error?.message || error);
    return sendFallback(conn, msg, from, query, results);
  }
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

      await sendSearchList(conn, msg, from, query, results);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTSEARCH]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível pesquisar no YouTube.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _internals: {
    buildRows,
    searchYoutube,
    sendSearchList,
    sendFallback,
  },
};
