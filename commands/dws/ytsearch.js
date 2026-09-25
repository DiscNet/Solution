// Menu: Downloads - YouTube | Comando: ytsearch
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeList } = require("../../functions/youtubeResult");
const { generateWAMessageFromContent } = require("@whiskeysockets/baileys");

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

async function sendNativeList(conn, msg, from, query, results) {
  const prefix = config.prefix || ".";
  const rows = buildRows(results, prefix);

  const interactiveMessage = {
    body: {
      text:
        "🔎 *YOUTUBE SEARCH — " + query + "*\n" +
        "📊 Resultados: " + results.length + "\n\n" +
        "Toque no botão abaixo para escolher um vídeo.",
    },
    footer: {
      text: botName(),
    },
    nativeFlowMessage: {
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "🎬 Ver resultados",
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
  };

  const out = generateWAMessageFromContent(from, {
    interactiveMessage,
  }, {
    quoted: createStatusQuoted(msg),
  });

  return conn.relayMessage(from, out.message, {
    messageId: out.key.id,
  });
}

module.exports = {
  name: "ytsearch",
  aliases: ["yts"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytsearch termo",
  description: "Pesquisa vídeos no YouTube e mostra uma lista interativa",

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
        return conn.sendMessage(from, {
          text: "❌ Nenhum resultado encontrado para *" + query + "*.",
        }, { quoted: createStatusQuoted(msg) });
      }

      await sendNativeList(conn, msg, from, query, results);

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
    sendNativeList,
  },
};
