const config = require("../../config/config");
const tokitoApi = require("./apiClient");
const { createStatusQuoted } = require("./statusCard");
const {
  generateWAMessageFromContent,
  prepareWAMessageMedia,
  proto,
} = require("@whiskeysockets/baileys");
const { getVideo } = require("./youtubeClient");

function textValue(value, fallback = "") {
  if (value === undefined || value === null) return fallback;

  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "bigint"
  ) {
    const text = String(value).trim();
    return text && text !== "[object Object]" ? text : fallback;
  }

  if (Array.isArray(value)) {
    const joined = value
      .map(item => textValue(item, ""))
      .filter(Boolean)
      .join(" ")
      .trim();
    return joined || fallback;
  }

  if (typeof value === "object") {
    for (const key of [
      "text", "name", "title", "label", "timestamp", "formatted",
      "short", "simpleText", "simple_text", "value", "channelTitle",
      "nickname", "username"
    ]) {
      const text = textValue(value[key], "");
      if (text) return text;
    }

    if (Array.isArray(value.runs)) {
      const joined = value.runs
        .map(item => textValue(item?.text, ""))
        .filter(Boolean)
        .join("")
        .trim();
      if (joined) return joined;
    }
  }

  return fallback;
}

function firstUrl(value, depth = 0) {
  if (depth > 6 || value == null) return "";

  if (typeof value === "string") {
    const text = value.trim();
    return /^https?:\/\//i.test(text) ? text : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of [
      "url", "link", "src", "href", "webpage_url", "webpageUrl",
    ]) {
      const found = firstUrl(value[key], depth + 1);
      if (found) return found;
    }
  }

  return "";
}

function thumbnailUrl(item = {}) {
  const candidates = [
    item.image,
    item.thumbnail,
    item.thumb,
    item.capa,
    item.thumbnails,
    item.thumbnail?.url,
    item.thumbnail?.thumbnails,
  ];

  for (const candidate of candidates) {
    const found = firstUrl(candidate);
    if (found) return found;
  }

  const videoId = textValue(item.videoId || item.video_id || item.id, "");
  return videoId
    ? "https://i.ytimg.com/vi/" + videoId + "/hq720.jpg"
    : "";
}

function normalizeYoutubeItem(item = {}) {
  if (!item || typeof item !== "object") return null;

  const videoId = textValue(item.videoId || item.video_id || item.id, "");

  const directUrl =
    firstUrl(item.url) ||
    firstUrl(item.link) ||
    firstUrl(item.video_url) ||
    firstUrl(item.videoUrl) ||
    firstUrl(item.webpage_url) ||
    firstUrl(item.webpageUrl);

  const url = directUrl ||
    (videoId ? "https://www.youtube.com/watch?v=" + videoId : "");

  if (!url) return null;

  return {
    raw: item,
    videoId,
    title: textValue(item.title || item.titulo || item.name, "Sem título"),
    channel: textValue(
      item.author?.name ||
      item.author ||
      item.channel?.name ||
      item.channel ||
      item.canal?.name ||
      item.canal ||
      item.uploader,
      "Desconhecido"
    ),
    duration: textValue(
      item.timestamp ||
      item.duration?.timestamp ||
      item.duration?.text ||
      item.duration ||
      item.duracao ||
      item.length,
      "0:00"
    ),
    views: textValue(
      item.views?.text ||
      item.views?.short ||
      item.views ||
      item.viewCount ||
      item.view_count ||
      item.visualizacoes,
      ""
    ),
    thumbnail: thumbnailUrl(item),
    url,
  };
}

function normalizeYoutubeList(data, listFn = tokitoApi.list) {
  const source = typeof listFn === "function" ? listFn(data) : [];
  return source
    .map(normalizeYoutubeItem)
    .filter(Boolean);
}

function botName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
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

async function resolveYoutubeVideo(query) {
  const input = String(query || "").trim();
  if (!input) return null;

  if (!/^https?:\/\//i.test(input)) {
    try {
      const data = await tokitoApi.get("/api/youtube-search", {
        query: input,
        q: input,
        text: input,
      }, { timeout: 30000 });

      const [first] = normalizeYoutubeList(data);
      if (first?.url) return first;
    } catch (error) {
      console.warn("[YOUTUBE SEARCH API]", error?.message || error);
    }
  }

  const local = await getVideo(input).catch(() => null);
  if (local?.url) return normalizeYoutubeItem(local);

  if (/^https?:\/\//i.test(input)) {
    return normalizeYoutubeItem({
      url: input,
      title: "YouTube",
      channel: "",
      duration: "",
    });
  }

  return null;
}

function mediaUrlFromData(data, type = "audio") {
  const roots = [
    data?.resultado,
    data?.result,
    data?.data,
    data,
  ].filter(Boolean);

  const audioKeys = [
    "download", "downloadUrl", "download_url",
    "audio", "audioUrl", "audio_url",
    "mp3", "file", "media", "url",
  ];

  const videoKeys = [
    "download", "downloadUrl", "download_url",
    "video", "videoUrl", "video_url",
    "mp4", "file", "media", "url",
  ];

  const keys = type === "video" ? videoKeys : audioKeys;

  for (const root of roots) {
    if (!root) continue;

    if (Array.isArray(root)) {
      for (const item of root) {
        const found = mediaUrlFromData(item, type);
        if (found) return found;
      }
      continue;
    }

    if (typeof root === "object") {
      for (const key of keys) {
        const found = firstUrl(root[key]);
        if (found) return found;
      }
    }
  }

  return "";
}

async function resolveYoutubeAudio(query) {
  const input = String(query || "").trim();
  if (!input) throw new Error("Pesquisa vazia.");

  try {
    const data = await tokitoApi.get("/api/youtube-play", {
      query: input,
      q: input,
    }, { timeout: 90000 });

    const url = mediaUrlFromData(data, "audio");
    if (url) {
      return {
        type: "url",
        value: url,
        title: textValue(
          data?.resultado?.title ||
          data?.resultado?.titulo ||
          data?.title ||
          data?.titulo,
          "audio"
        ),
      };
    }
  } catch (error) {
    console.warn("[YOUTUBE PLAY API]", error?.message || error);
  }

  const response = await tokitoApi.buffer("/api/youtube-audio", {
    q: input,
    query: input,
  }, {
    timeout: 120000,
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
    headers: {
      accept: "audio/mpeg,audio/*,application/octet-stream,application/json,*/*",
    },
  });

  const contentType = String(response.contentType || "").toLowerCase();

  if (
    response.buffer?.length &&
    (
      contentType.includes("audio/") ||
      contentType.includes("application/octet-stream")
    )
  ) {
    return {
      type: "buffer",
      value: response.buffer,
      mimetype: contentType.includes("audio/")
        ? contentType.split(";")[0]
        : "audio/mpeg",
      title: "audio",
    };
  }

  if (response.buffer?.length) {
    try {
      const parsed = JSON.parse(response.buffer.toString("utf8"));
      const url = mediaUrlFromData(parsed, "audio");
      if (url) return { type: "url", value: url, title: "audio" };
    } catch {}
  }

  throw new Error("A API não retornou um áudio reproduzível.");
}

async function sendYoutubeAudio(conn, msg, from, query) {
  const source = await resolveYoutubeAudio(query);
  const audio = source.type === "buffer"
    ? source.value
    : { url: source.value };

  return conn.sendMessage(from, {
    audio,
    mimetype: source.mimetype || "audio/mpeg",
    fileName:
      (textValue(source.title, "audio")
        .replace(/[\\/:*?"<>|]/g, "_")
        .slice(0, 80) || "audio") + ".mp3",
    ptt: false,
  }, { quoted: createStatusQuoted(msg) });
}

async function sendYoutubeVideo(conn, msg, from, query) {
  const input = String(query || "").trim();
  if (!input) throw new Error("Vídeo sem alvo.");

  const response = await tokitoApi.buffer("/api/youtube-video", {
    q: input,
    query: input,
  }, {
    timeout: 120000,
    maxContentLength: 100 * 1024 * 1024,
    maxBodyLength: 100 * 1024 * 1024,
    headers: {
      accept: "video/mp4,video/*,application/octet-stream,application/json,*/*",
    },
  });

  const contentType = String(response.contentType || "").toLowerCase();

  if (
    response.buffer?.length &&
    (
      contentType.includes("video/") ||
      contentType.includes("application/octet-stream")
    )
  ) {
    return conn.sendMessage(from, {
      video: response.buffer,
      mimetype: contentType.includes("video/")
        ? contentType.split(";")[0]
        : "video/mp4",
      fileName: "video.mp4",
    }, { quoted: createStatusQuoted(msg) });
  }

  if (response.buffer?.length) {
    try {
      const parsed = JSON.parse(response.buffer.toString("utf8"));
      const url = mediaUrlFromData(parsed, "video");
      if (url) {
        return conn.sendMessage(from, {
          video: { url },
          mimetype: "video/mp4",
          fileName: "video.mp4",
        }, { quoted: createStatusQuoted(msg) });
      }
    } catch {}
  }

  throw new Error("A API não retornou um vídeo reproduzível.");
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

function interactiveEnvelope(interactiveMessage) {
  return {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage:
          proto?.Message?.InteractiveMessage?.fromObject
            ? proto.Message.InteractiveMessage.fromObject(interactiveMessage)
            : interactiveMessage,
      },
    },
  };
}

async function sendYoutubeList(conn, msg, from, results, query) {
  const prefix = config.prefix || ".";

  const rows = results.slice(0, 10).map((video, index) => ({
    header: "Resultado " + (index + 1),
    title: textValue(video.title, "Sem título").slice(0, 70),
    description: [
      video.duration ? "⏱️ " + textValue(video.duration) : "",
      video.channel ? "👤 " + textValue(video.channel) : "",
    ].filter(Boolean).join(" · ").slice(0, 100),
    id: prefix + "ytplay " + video.url,
  }));

  if (!rows.length) {
    throw new Error("Nenhum resultado para montar a lista.");
  }

  const interactiveMessage = {
    header: {
      title: "🔎 YouTube Search",
      hasMediaAttachment: false,
    },
    body: {
      text:
        "🔎 *Busca:* " + query + "\n" +
        "📊 *Resultados:* " + rows.length + "\n\n" +
        "Escolha um vídeo na lista abaixo.",
    },
    footer: {
      text: botName(),
    },
    nativeFlowMessage: {
      messageParamsJson: "",
      buttons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "🎬 Ver resultados",
            sections: [
              {
                title: "📹 Vídeos encontrados",
                rows,
              },
            ],
          }),
        },
        quickReply(
          "🎵 Áudio do 1º",
          prefix + "play " + results[0].url
        ),
      ],
    },
  };

  const out = generateWAMessageFromContent(
    from,
    interactiveEnvelope(interactiveMessage),
    { quoted: createStatusQuoted(msg) }
  );

  return conn.relayMessage(from, out.message, {
    messageId: out.key.id,
  });
}

async function sendYoutubeFallback(conn, msg, from, video) {
  const prefix = config.prefix || ".";
  const text = [
    infoText(video),
    "",
    "🎵 " + prefix + "play " + video.url,
    "🎬 " + prefix + "ytmp4 " + video.url,
    "📄 " + prefix + "playdoc " + video.url,
  ].join("\n");

  if (video.thumbnail) {
    return conn.sendMessage(from, {
      image: { url: video.thumbnail },
      caption: text,
    }, { quoted: createStatusQuoted(msg) });
  }

  return conn.sendMessage(
    from,
    { text },
    { quoted: createStatusQuoted(msg) }
  );
}

async function sendYoutubeChoice(conn, msg, from, video) {
  const prefix = config.prefix || ".";
  let header = {
    title: "🎬 YouTube",
    hasMediaAttachment: false,
  };

  if (video?.thumbnail) {
    try {
      const media = await prepareWAMessageMedia(
        { image: { url: video.thumbnail } },
        { upload: conn.waUploadToServer }
      );

      header = {
        title: "🎬 YouTube",
        hasMediaAttachment: true,
        imageMessage: media.imageMessage,
      };
    } catch {}
  }

  const interactiveMessage = {
    header,
    body: {
      text: infoText(video) + "\n\nEscolha o formato:",
    },
    footer: {
      text: botName(),
    },
    nativeFlowMessage: {
      messageParamsJson: "",
      buttons: [
        quickReply("🎵 Áudio", prefix + "play " + video.url),
        quickReply("📹 Vídeo", prefix + "ytmp4 " + video.url),
        quickReply("📄 Documento", prefix + "playdoc " + video.url),
      ],
    },
  };

  try {
    const out = generateWAMessageFromContent(
      from,
      interactiveEnvelope(interactiveMessage),
      { quoted: createStatusQuoted(msg) }
    );

    return await conn.relayMessage(from, out.message, {
      messageId: out.key.id,
    });
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
  mediaUrlFromData,
  resolveYoutubeAudio,
  sendYoutubeAudio,
  sendYoutubeVideo,
  sendYoutubeList,
  sendYoutubeChoice,
  sendYoutubeFallback,
};
