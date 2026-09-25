const config = require("../config/config");
const tokitoApi = require("./tokitoApi");
const { createStatusQuoted } = require("./statusCard");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");

function textValue(value, fallback = "") {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "bigint") {
    const text = String(value).trim();
    return text || fallback;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const text = textValue(item, "");
      if (text) return text;
    }
    return fallback;
  }
  if (typeof value === "object") {
    for (const key of [
      "text", "name", "title", "label", "timestamp", "formatted",
      "short", "simpleText", "value", "channelTitle", "nickname"
    ]) {
      const text = textValue(value[key], "");
      if (text) return text;
    }
    if (Array.isArray(value.runs)) {
      const joined = value.runs.map(item => textValue(item?.text, "")).filter(Boolean).join("");
      if (joined) return joined;
    }
  }
  return fallback;
}

function firstUrl(value, depth = 0) {
  if (depth > 6 || value == null) return "";
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    for (const key of ["url", "link", "src", "href", "webpage_url", "webpageUrl"]) {
      const found = firstUrl(value[key], depth + 1);
      if (found) return found;
    }
    for (const item of Object.values(value)) {
      const found = firstUrl(item, depth + 1);
      if (found) return found;
    }
  }
  return "";
}

function thumbnailUrl(item) {
  const candidates = [
    item?.image,
    item?.thumbnail,
    item?.thumb,
    item?.capa,
    item?.thumbnails,
    item?.thumbnail?.url,
    item?.thumbnail?.thumbnails,
  ];
  for (const candidate of candidates) {
    const found = firstUrl(candidate);
    if (found) return found;
  }
  const videoId = textValue(item?.videoId || item?.id, "");
  return videoId ? "https://i.ytimg.com/vi/" + videoId + "/hq720.jpg" : "";
}

function normalizeYoutubeItem(item = {}) {
  const videoId = textValue(item?.videoId || item?.video_id || item?.id, "");
  const directUrl = firstUrl(
    item?.url ||
    item?.link ||
    item?.video_url ||
    item?.videoUrl ||
    item?.webpage_url ||
    item?.webpageUrl
  );
  const url = directUrl || (videoId ? "https://www.youtube.com/watch?v=" + videoId : "");

  return {
    raw: item,
    videoId,
    title: textValue(item?.title || item?.titulo || item?.name, "Sem título"),
    channel: textValue(
      item?.author?.name ||
      item?.author ||
      item?.channel?.name ||
      item?.channel ||
      item?.canal?.name ||
      item?.canal,
      "Desconhecido"
    ),
    duration: textValue(
      item?.timestamp ||
      item?.duration?.timestamp ||
      item?.duration?.text ||
      item?.duration ||
      item?.duracao,
      "0:00"
    ),
    views: textValue(
      item?.views?.text ||
      item?.views?.short ||
      item?.views ||
      item?.viewCount ||
      item?.visualizacoes,
      ""
    ),
    thumbnail: thumbnailUrl(item),
    url,
  };
}

function infoText(video = {}) {
  return [
    "🎬 *" + textValue(video.title, "Vídeo do YouTube") + "*",
    video.channel ? "👤 " + textValue(video.channel, "") : "",
    video.duration ? "⏱️ " + textValue(video.duration, "") : "",
    video.views ? "👁️ " + textValue(video.views, "") : "",
    video.url ? "🔗 " + String(video.url) : "",
  ].filter(Boolean).join("\n");
}

function normalizeYoutubeList(data, listFn) {
  const source = typeof listFn === "function" ? listFn(data) : [];
  return source.map(normalizeYoutubeItem).filter(item => item.url);
}


function botName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function infoText(video, title = "🎧 *MÍDIA ENCONTRADA*") {
  return [
    title,
    "",
    "✏️ *Título:* " + textValue(video?.title, "Sem título"),
    "👤 *Canal:* " + textValue(video?.channel, "Desconhecido"),
    "⏱️ *Duração:* " + textValue(video?.duration, "0:00"),
    video?.views ? "👁️ *Views:* " + textValue(video.views, "") : "",
    video?.url ? "🔗 " + video.url : "",
  ].filter(Boolean).join("\n");
}

async function resolveYoutubeVideo(query) {
  const input = String(query || "").trim();
  if (!input) return null;

  try {
    const data = await tokitoApi.get("/api/youtube-search", { query: input });
    const results = normalizeYoutubeList(data, tokitoApi.list);
    if (results.length) return results[0];
  } catch (error) {
    if (!/^https?:\/\//i.test(input)) throw error;
  }

  if (/^https?:\/\//i.test(input)) {
    return normalizeYoutubeItem({
      url: input,
      title: "YouTube",
      channel: "Desconhecido",
      duration: "0:00",
    });
  }

  return null;
}

function quickReply(text, id) {
  return {
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({ display_text: text, id }),
  };
}

async function sendYoutubeFallback(conn, msg, from, video) {
  const prefix = config.prefix || ".";
  const text = [
    infoText(video),
    "",
    "🎵 " + prefix + "ytmp3 " + video.url,
    "🎬 " + prefix + "ytmp4 " + video.url,
    "📄 " + prefix + "playdoc " + video.url,
  ].join("\n");

  if (video.thumbnail) {
    return conn.sendMessage(from, {
      image: { url: video.thumbnail },
      caption: text,
    }, { quoted: createStatusQuoted(msg) });
  }

  return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
}

async function sendYoutubeChoice(conn, msg, from, video) {
  const prefix = config.prefix || ".";
  let header;

  if (video?.thumbnail) {
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

  const interactiveMessage = {
    ...(header ? { header } : {}),
    body: {
      text: infoText(video) + "\n\nEscolha como deseja baixar:",
    },
    footer: { text: botName() },
    nativeFlowMessage: {
      buttons: [
        quickReply("🎵 Áudio", prefix + "ytmp3 " + video.url),
        quickReply("🎬 Vídeo", prefix + "ytmp4 " + video.url),
        quickReply("📄 Documento", prefix + "playdoc " + video.url),
      ],
    },
  };

  try {
    const out = generateWAMessageFromContent(from, {
      interactiveMessage,
    }, { quoted: createStatusQuoted(msg) });

    return await conn.relayMessage(from, out.message, { messageId: out.key.id });
  } catch (error) {
    console.warn("[YOUTUBE BUTTONS]", error?.message || error);
    return sendYoutubeFallback(conn, msg, from, video);
  }
}

module.exports = {
  textValue,
  firstUrl,
  thumbnailUrl,
  normalizeYoutubeItem,
  normalizeYoutubeList,
  infoText,
  resolveYoutubeVideo,
  sendYoutubeChoice,
  sendYoutubeFallback,
};
