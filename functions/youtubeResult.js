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


function singleSelectButton(title, sections) {
  return {
    name: "single_select",
    buttonParamsJson: JSON.stringify({ title, sections }),
  };
}

function findMediaUrl(value, depth = 0) {
  if (depth > 7 || value == null) return "";

  if (typeof value === "string") {
    const text = value.trim();
    return /^https?:\/\//i.test(text) ? text : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findMediaUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of [
      "download", "downloadUrl", "download_url", "audio", "video",
      "url", "link", "play", "media", "file", "src"
    ]) {
      const found = findMediaUrl(value[key], depth + 1);
      if (found) return found;
    }

    for (const item of Object.values(value)) {
      const found = findMediaUrl(item, depth + 1);
      if (found) return found;
    }
  }

  return "";
}

async function youtubePlayAudioUrl(query) {
  const data = await tokitoApi.get("/api/youtube-play", {
    query,
    q: query,
  }, { timeout: 60000 });

  return findMediaUrl(
    data?.resultado ||
    data?.result ||
    data?.data ||
    data
  );
}

async function sendYoutubeAudio(conn, msg, from, target) {
  let resolved = String(target || "").trim();
  if (!resolved) throw new Error("Áudio sem alvo.");

  try {
    const playUrl = await youtubePlayAudioUrl(resolved);
    if (playUrl) {
      return conn.sendMessage(from, {
        audio: { url: playUrl },
        mimetype: "audio/mpeg",
        fileName: "audio.mp3",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
    }
  } catch (error) {
    console.warn("[YOUTUBE PLAY AUDIO]", error?.message || error);
  }

  const response = await tokitoApi.buffer("/api/youtube-audio", {
    q: resolved,
    query: resolved,
  }, {
    timeout: 120000,
    maxContentLength: 60 * 1024 * 1024,
    maxBodyLength: 60 * 1024 * 1024,
    headers: { accept: "audio/*,application/json,*/*" },
  });

  const type = String(response.contentType || "").toLowerCase();

  if (type.includes("audio/") && response.buffer?.length) {
    return conn.sendMessage(from, {
      audio: response.buffer,
      mimetype: type.split(";")[0] || "audio/mpeg",
      fileName: "audio.mp3",
      ptt: false,
    }, { quoted: createStatusQuoted(msg) });
  }

  if (response.buffer?.length) {
    const raw = response.buffer.toString("utf8").trim();
    try {
      const parsed = JSON.parse(raw);
      const url = findMediaUrl(parsed);
      if (url) {
        return conn.sendMessage(from, {
          audio: { url },
          mimetype: "audio/mpeg",
          fileName: "audio.mp3",
          ptt: false,
        }, { quoted: createStatusQuoted(msg) });
      }
    } catch {}
  }

  throw new Error("A API não retornou um áudio reproduzível.");
}

async function sendYoutubeVideo(conn, msg, from, target) {
  const response = await tokitoApi.buffer("/api/youtube-video", {
    q: target,
    query: target,
  }, {
    timeout: 120000,
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
    headers: { accept: "video/*,application/json,*/*" },
  });

  const type = String(response.contentType || "").toLowerCase();

  if (type.includes("video/") && response.buffer?.length) {
    return conn.sendMessage(from, {
      video: response.buffer,
      mimetype: type.split(";")[0] || "video/mp4",
      fileName: "video.mp4",
    }, { quoted: createStatusQuoted(msg) });
  }

  if (response.buffer?.length) {
    const raw = response.buffer.toString("utf8").trim();
    try {
      const parsed = JSON.parse(raw);
      const url = findMediaUrl(parsed);
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

function quickReplyButton(text, id) {
  return {
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({
      display_text: text,
      id,
    }),
  };
}

async function sendYoutubeList(conn, msg, from, results, query) {
  const prefix = config.prefix || ".";
  const rows = results.slice(0, 10).map((video, index) => ({
    id: prefix + "ytplay " + video.url,
    title: "🎬 " + (index + 1) + ". " + textValue(video.title, "Sem título").slice(0, 55),
    description: [
      video.duration ? "⏱️ " + textValue(video.duration) : "",
      video.channel ? "👤 " + textValue(video.channel) : "",
    ].filter(Boolean).join(" · ").slice(0, 90) || "Abrir opções",
  }));

  if (!rows.length) throw new Error("Nenhum resultado para montar a lista.");

  const interactiveMessage = {
    body: {
      text:
        "🔎 *YOUTUBE SEARCH*\n\n" +
        "Busca: *" + query + "*\n" +
        "Resultados: *" + rows.length + "*\n\n" +
        "Toque em *Resultados* para escolher um vídeo.",
    },
    footer: { text: botName() },
    nativeFlowMessage: {
      buttons: [
        singleSelectButton("🎬 Resultados", [
          {
            title: "📹 Vídeos encontrados",
            rows,
          },
        ]),
        quickReplyButton("🎵 Áudio do 1º", prefix + "play " + results[0].url),
      ],
    },
  };

  const out = generateWAMessageFromContent(from, {
    interactiveMessage,
  }, { quoted: createStatusQuoted(msg) });

  return conn.relayMessage(from, out.message, {
    messageId: out.key.id,
  });
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

function audioUrlFromData(data) {
  const roots = [
    data?.resultado,
    data?.result,
    data?.data,
    data,
  ].filter(Boolean);

  const preferredKeys = [
    "download",
    "downloadUrl",
    "download_url",
    "audio",
    "audioUrl",
    "audio_url",
    "mp3",
    "file",
    "url",
  ];

  for (const root of roots) {
    if (!root) continue;

    if (Array.isArray(root)) {
      for (const item of root) {
        const found = audioUrlFromData(item);
        if (found) return found;
      }
      continue;
    }

    if (typeof root === "object") {
      for (const key of preferredKeys) {
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
    }, { timeout: 45000 });

    const url = audioUrlFromData(data);
    if (url) {
      const root = tokitoApi.firstObject(data) || data;
      return {
        url,
        title: textValue(root?.title || root?.titulo, "audio"),
      };
    }
  } catch (error) {
    console.warn("[YOUTUBE PLAY API]", error?.message || error);
  }

  const result = await tokitoApi.buffer("/api/youtube-audio", {
    q: input,
    query: input,
  }, {
    timeout: 120000,
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
    headers: { accept: "audio/mpeg,audio/*,application/octet-stream,application/json,*/*" },
  });

  if (!result.buffer?.length) {
    throw new Error("A API não retornou áudio.");
  }

  if (
    /audio\//i.test(result.contentType) ||
    /application\/octet-stream/i.test(result.contentType)
  ) {
    return {
      buffer: result.buffer,
      mimetype: /audio\//i.test(result.contentType)
        ? result.contentType.split(";")[0]
        : "audio/mpeg",
      title: "audio",
    };
  }

  if (/json|text/i.test(result.contentType)) {
    try {
      const parsed = JSON.parse(result.buffer.toString("utf8"));
      const url = audioUrlFromData(parsed);
      if (url) return { url, title: "audio" };
    } catch {}
  }

  throw new Error("A API não retornou um MP3 válido.");
}

async function sendYoutubeAudio(conn, msg, from, query) {
  const audio = await resolveYoutubeAudio(query);
  const source = audio.buffer ? audio.buffer : { url: audio.url };

  return conn.sendMessage(from, {
    audio: source,
    mimetype: audio.mimetype || "audio/mpeg",
    fileName: (textValue(audio.title, "audio").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "audio") + ".mp3",
    ptt: false,
  }, { quoted: createStatusQuoted(msg) });
}

async function sendYoutubeSearchList(conn, msg, from, results, query) {
  const prefix = config.prefix || ".";
  const rows = results.slice(0, 10).map((video, index) => ({
    header: "Resultado " + (index + 1),
    title: textValue(video?.title, "Sem título").slice(0, 70),
    description: [
      video?.duration ? "⏱️ " + textValue(video.duration) : "",
      video?.channel ? "👤 " + textValue(video.channel) : "",
    ].filter(Boolean).join(" · ").slice(0, 100),
    id: prefix + "ytplay " + video.url,
  }));

  if (!rows.length) throw new Error("Nenhum resultado para montar a lista.");

  const out = generateWAMessageFromContent(from, {
    interactiveMessage: {
      header: {
        title: "🔎 YouTube Search",
        hasMediaAttachment: false,
      },
      body: {
        text:
          "🔎 *Busca:* " + query + "\n" +
          "📊 *Resultados:* " + rows.length + "\n\n" +
          "Toque no botão abaixo para escolher um vídeo.",
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
          quickReply("🎵 Áudio do 1º", prefix + "play " + results[0].url),
        ],
      },
    },
  }, { quoted: createStatusQuoted(msg) });

  return conn.relayMessage(from, out.message, {
    messageId: out.key.id,
  });
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
  sendYoutubeList,
  quickReplyButton,
  singleSelectButton,
  findMediaUrl,
  youtubePlayAudioUrl,
  sendYoutubeAudio,
  sendYoutubeVideo,
};
