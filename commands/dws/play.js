// Menu: Downloads - YouTube | Comando: play
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeItem, normalizeYoutubeList } = require("../../functions/youtubeResult");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");

function botName() {
  return String(config.botName || "Bot").replace(/[\x00-\x1F\x7F]/g, "").trim() || "Bot";
}

function quickReply(text, id) {
  return {
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({ display_text: text, id }),
  };
}

async function resolveVideo(query) {
  try {
    const data = await tokitoApi.get("/api/youtube-search", { query });
    const results = normalizeYoutubeList(data, tokitoApi.list);
    if (results.length) return results[0];
  } catch (error) {
    if (!/^https?:\/\//i.test(query)) throw error;
  }

  if (/^https?:\/\//i.test(query)) {
    return normalizeYoutubeItem({
      url: query,
      title: "YouTube",
      channel: "Desconhecido",
      duration: "0:00",
    });
  }

  return null;
}

async function sendDownloadButtons(conn, msg, from, video) {
  const prefix = config.prefix || ".";
  let header;

  if (video.thumbnail) {
    try {
      const media = await prepareWAMessageMedia(
        { image: { url: video.thumbnail } },
        { upload: conn.waUploadToServer }
      );
      header = {
        hasMediaAttachment: true,
        imageMessage: media.imageMessage,
      };
    } catch {}
  }

  const lines = [
    "🎧 *MÍDIA ENCONTRADA*",
    "",
    "✏️ *Título:* " + video.title,
    "👤 *Canal:* " + video.channel,
    "⏱️ *Duração:* " + video.duration,
    video.views ? "👁️ *Views:* " + video.views : "",
    "🔗 " + video.url,
    "",
    "Escolha como deseja baixar:",
  ].filter(Boolean).join("\n");

  const interactiveMessage = {
    ...(header ? { header } : {}),
    body: { text: lines },
    footer: { text: botName() },
    nativeFlowMessage: {
      buttons: [
        quickReply("🎵 Áudio", prefix + "ytmp3 " + video.url),
        quickReply("🎬 Vídeo", prefix + "ytmp4 " + video.url),
        quickReply("📄 Documento", prefix + "playdoc " + video.url),
      ],
    },
  };

  const out = generateWAMessageFromContent(from, {
    interactiveMessage,
  }, { quoted: createStatusQuoted(msg) });

  return conn.relayMessage(from, out.message, { messageId: out.key.id });
}

async function sendFallback(conn, msg, from, video) {
  const prefix = config.prefix || ".";
  const text = [
    "🎧 *MÍDIA ENCONTRADA*",
    "",
    "✏️ *Título:* " + video.title,
    "👤 *Canal:* " + video.channel,
    "⏱️ *Duração:* " + video.duration,
    video.views ? "👁️ *Views:* " + video.views : "",
    "🔗 " + video.url,
    "",
    "🎵 " + prefix + "ytmp3 " + video.url,
    "🎬 " + prefix + "ytmp4 " + video.url,
    "📄 " + prefix + "playdoc " + video.url,
  ].filter(Boolean).join("\n");

  if (video.thumbnail) {
    return conn.sendMessage(from, {
      image: { url: video.thumbnail },
      caption: text,
    }, { quoted: createStatusQuoted(msg) });
  }

  return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "play",
  aliases: ["yta"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "play música ou link",
  description: "Pesquisa no YouTube e mostra botões de áudio, vídeo e documento",
  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();
    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .play <música ou link>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎧", key: msg.key },
      }).catch(() => {});

      const video = await resolveVideo(query);
      if (!video?.url) throw new Error("Nenhum vídeo encontrado.");

      try {
        await sendDownloadButtons(conn, msg, from, video);
      } catch (buttonError) {
        console.warn("[PLAY BUTTONS]", buttonError.message);
        await sendFallback(conn, msg, from, video);
      }

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[PLAY]", error.message);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível pesquisar no YouTube."),
      }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { resolveVideo, sendDownloadButtons, sendFallback },
};
