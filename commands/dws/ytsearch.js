// Menu: Downloads - YouTube | Comando: ytsearch
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeList } = require("../../functions/youtubeResult");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");

function botName() {
  return String(config.botName || "Bot").replace(/[\x00-\x1F\x7F]/g, "").trim() || "Bot";
}

function quickReply(text, id) {
  return {
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: text,
      id,
    }),
  };
}

async function sendCarousel(conn, msg, from, results, query) {
  const prefix = config.prefix || ".";
  const cards = [];

  for (let index = 0; index < results.length; index++) {
    const item = results[index];
    let header;

    if (item.thumbnail) {
      try {
        const media = await prepareWAMessageMedia(
          { image: { url: item.thumbnail } },
          { upload: conn.waUploadToServer }
        );
        header = {
          hasMediaAttachment: true,
          imageMessage: media.imageMessage,
        };
      } catch {}
    }

    const lines = [
      "🎬 *" + item.title + "*",
      "👤 " + item.channel,
      "⏱️ " + item.duration,
      item.views ? "👁️ " + item.views : "",
      "📌 " + (index + 1) + "/" + results.length,
    ].filter(Boolean);

    cards.push({
      ...(header ? { header } : {}),
      body: { text: lines.join("\n") },
      footer: { text: botName() },
      nativeFlowMessage: {
        buttons: [
          quickReply("🎵 Áudio", prefix + "ytmp3 " + item.url),
          quickReply("🎬 Vídeo", prefix + "ytmp4 " + item.url),
          quickReply("📄 Documento", prefix + "playdoc " + item.url),
        ],
      },
    });
  }

  if (!cards.length) throw new Error("Nenhum card foi preparado.");

  const out = generateWAMessageFromContent(from, {
    interactiveMessage: {
      body: {
        text: "🔎 *YOUTUBE — " + query + "*\n\nDeslize para escolher um resultado.",
      },
      footer: { text: botName() },
      carouselMessage: {
        cards,
        messageVersion: 1,
        carouselCardType: 1,
      },
    },
  }, { quoted: createStatusQuoted(msg) });

  return conn.relayMessage(from, out.message, { messageId: out.key.id });
}

async function sendTextFallback(conn, msg, from, results, query) {
  const prefix = config.prefix || ".";
  const text = results.map((item, index) => [
    (index + 1) + ". *" + item.title + "*",
    "👤 " + item.channel,
    "⏱️ " + item.duration,
    item.views ? "👁️ " + item.views : "",
    "🔗 " + item.url,
    "🎵 " + prefix + "ytmp3 " + item.url,
    "🎬 " + prefix + "ytmp4 " + item.url,
    "📄 " + prefix + "playdoc " + item.url,
  ].filter(Boolean).join("\n")).join("\n\n");

  return conn.sendMessage(from, {
    text: "🔎 *YOUTUBE — " + query + "*\n\n" + text,
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "ytsearch",
  aliases: ["yts"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytsearch termo",
  description: "Pesquisa vídeos no YouTube e mostra opções de download",
  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();
    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .ytsearch <termo>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const data = await tokitoApi.get("/api/youtube-search", { query });
      const results = normalizeYoutubeList(data, tokitoApi.list).slice(0, 5);

      if (!results.length) throw new Error("Nenhum resultado.");

      try {
        await sendCarousel(conn, msg, from, results, query);
      } catch (carouselError) {
        console.warn("[YTSEARCH CAROUSEL]", carouselError.message);
        await sendTextFallback(conn, msg, from, results, query);
      }

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTSEARCH]", error.message);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível pesquisar no YouTube."),
      }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { sendCarousel, sendTextFallback },
};
