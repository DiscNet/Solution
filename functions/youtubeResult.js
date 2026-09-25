const config = require("../config/config");
const tokitoApi = require("./tokitoApi");
const { getVideo } = require("./youtubeClient");
const { createStatusQuoted } = require("./statusCard");
const { sendButtons } = require("gifted-btns");

function textValue(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value).trim();
    return text && text !== "[object Object]" ? text : fallback;
  }

  if (typeof value === "object") {
    const candidates = [
      value.name,
      value.title,
      value.text,
      value.simpleText,
      value.simple_text,
      value.label,
      value.username,
      value.nickname,
      value.timestamp,
      value.formatted,
      value.value,
    ];

    for (const candidate of candidates) {
      const text = textValue(candidate, "");
      if (text) return text;
    }

    if (Array.isArray(value.runs)) {
      const joined = value.runs.map(item => textValue(item?.text, "")).filter(Boolean).join("").trim();
      if (joined) return joined;
    }
  }

  return fallback;
}

function urlValue(value) {
  if (!value) return "";
  if (typeof value === "string" && /^https?:\/\//i.test(value.trim())) return value.trim();

  if (Array.isArray(value)) {
    for (const item of value) {
      const url = urlValue(item);
      if (url) return url;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of ["url", "href", "link", "src"]) {
      const url = urlValue(value[key]);
      if (url) return url;
    }
  }

  return "";
}

function thumbnailValue(item) {
  const candidates = [
    item?.image,
    item?.thumbnail,
    item?.thumb,
    item?.capa,
    item?.thumbnailUrl,
    item?.thumbnail_url,
    item?.thumbnails,
  ];

  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      for (let index = candidate.length - 1; index >= 0; index--) {
        const url = urlValue(candidate[index]);
        if (url) return url;
      }
      continue;
    }

    const url = urlValue(candidate);
    if (url) return url;
  }

  return "";
}

function normalizeYoutubeItem(item = {}) {
  if (!item || typeof item !== "object") return null;

  const videoId = textValue(item.videoId || item.video_id || item.id, "");
  const url =
    urlValue(item.url) ||
    urlValue(item.link) ||
    urlValue(item.video_url) ||
    urlValue(item.videoUrl) ||
    (videoId ? "https://www.youtube.com/watch?v=" + videoId : "");

  if (!url) return null;

  return {
    id: videoId,
    title: textValue(item.title || item.titulo || item.name, "Vídeo do YouTube"),
    channel: textValue(
      item.author?.name ||
      item.author ||
      item.channel?.name ||
      item.channel ||
      item.canal ||
      item.uploader,
      ""
    ),
    duration: textValue(
      item.timestamp ||
      item.duration?.timestamp ||
      item.duration ||
      item.duracao ||
      item.length,
      ""
    ),
    views: textValue(
      item.views ||
      item.viewCount ||
      item.view_count ||
      item.visualizacoes,
      ""
    ),
    thumbnail: thumbnailValue(item),
    url,
  };
}

function youtubeItems(data) {
  const raw = tokitoApi.list(data);
  const normalized = [];

  for (const item of raw) {
    const video = normalizeYoutubeItem(item);
    if (!video) continue;

    if (
      item?.type &&
      String(item.type).toLowerCase() !== "video" &&
      !video.id
    ) continue;

    normalized.push(video);
  }

  return normalized;
}

async function resolveYoutubeVideo(query) {
  const input = String(query || "").trim();
  if (!input) return null;

  if (/^https?:\/\//i.test(input)) {
    const local = await getVideo(input).catch(() => null);
    return local || {
      id: "",
      title: "Vídeo do YouTube",
      channel: "",
      duration: "",
      views: "",
      thumbnail: "",
      url: input,
    };
  }

  try {
    const data = await tokitoApi.get("/api/youtube-search", {
      query: input,
      q: input,
      text: input,
    }, { timeout: 30000 });

    const [first] = youtubeItems(data);
    if (first) return first;
  } catch (error) {
    console.warn("[YOUTUBE SEARCH API]", error?.message || error);
  }

  return getVideo(input).catch(() => null);
}

function cleanBotName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function infoText(video) {
  return [
    "🎬 *" + textValue(video?.title, "Vídeo do YouTube") + "*",
    video?.channel ? "👤 " + textValue(video.channel) : "",
    video?.duration ? "⏱️ " + textValue(video.duration) : "",
    video?.views ? "👁️ " + textValue(video.views) : "",
    video?.url ? "🔗 " + video.url : "",
  ].filter(Boolean).join("\n");
}

async function sendYoutubeChoice(conn, msg, from, video) {
  if (!video?.url) throw new Error("Vídeo do YouTube sem URL.");

  const prefix = config.prefix || ".";
  return sendButtons(conn, from, {
    text: infoText(video),
    footer: cleanBotName(),
    image: video.thumbnail ? { url: video.thumbnail } : undefined,
    buttons: [
      { id: prefix + "ytmp3 " + video.url, text: "🎵 Áudio" },
      { id: prefix + "ytmp4 " + video.url, text: "📹 Vídeo" },
    ],
    contextInfo: {
      forwardingScore: 1,
      isForwarded: true,
      forwardedNewsletterMessageInfo: {
        newsletterJid: "120363426698503859@newsletter",
        newsletterName: cleanBotName(),
        serverMessageId: 116,
      },
    },
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  textValue,
  urlValue,
  thumbnailValue,
  normalizeYoutubeItem,
  youtubeItems,
  resolveYoutubeVideo,
  infoText,
  sendYoutubeChoice,
};
