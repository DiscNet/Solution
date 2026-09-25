// Menu: Downloads - YouTube | Comando: ytsearch
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeList } = require("../../functions/youtubeResult");
const { sendInteractiveMessage } = require("gifted-btns");

function botName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function buildRows(results, prefix) {
  return results.map((video, index) => {
    const title = String(video.title || "Sem título");
    const shortTitle = title.length > 48 ? title.slice(0, 45) + "..." : title;
    const details = [
      video.duration ? "⏱️ " + video.duration : "",
      video.channel ? "👤 " + video.channel : "",
    ].filter(Boolean).join(" · ");

    return {
      id: prefix + "ytplay " + video.url,
      title: "🎬 " + (index + 1) + ". " + shortTitle,
      description: details || "Abrir opções de download",
      header: "Resultado " + (index + 1),
    };
  });
}

async function searchYoutube(query) {
  const data = await tokitoApi.get("/api/youtube-search", {
    query,
    q: query,
    text: query,
  }, { timeout: 30000 });

  return normalizeYoutubeList(data, tokitoApi.list).slice(0, 10);
}

async function sendSearchList(conn, msg, from, query, results) {
  const prefix = config.prefix || ".";
  const rows = buildRows(results, prefix);

  return sendInteractiveMessage(
    conn,
    from,
    {
      text:
        "🔎 *YOUTUBE SEARCH — " + query + "*\n" +
        "📊 Resultados: " + results.length + "\n\n" +
        "📌 Toque em *Resultados* para escolher um vídeo.",
      footer: botName(),
      image: results[0]?.thumbnail ? { url: results[0].thumbnail } : undefined,
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
      if (!results.length) throw new Error("Nenhum resultado encontrado.");

      await sendSearchList(conn, msg, from, query, results);

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
    buildRows,
    searchYoutube,
    sendSearchList,
  },
};
