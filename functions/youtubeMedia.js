const tokitoApi = require("./tokitoApi");
const { normalizeYoutubeList } = require("./youtubeResult");
const { createStatusQuoted } = require("./statusCard");

function firstMediaUrl(value, depth = 0) {
  if (depth > 7 || value == null) return "";

  if (typeof value === "string") {
    const text = value.trim();
    return /^https?:\/\//i.test(text) ? text : "";
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstMediaUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }

  if (typeof value === "object") {
    for (const key of [
      "download",
      "downloadUrl",
      "download_url",
      "audio",
      "audioUrl",
      "audio_url",
      "mp3",
      "play",
      "media",
      "file",
      "src",
      "url",
    ]) {
      const found = firstMediaUrl(value[key], depth + 1);
      if (found) return found;
    }

    for (const key of ["resultado", "result", "data"]) {
      const found = firstMediaUrl(value[key], depth + 1);
      if (found) return found;
    }
  }

  return "";
}

async function resolveYoutubeTarget(input) {
  const query = String(input || "").trim();
  if (!query) return "";

  if (/^https?:\/\//i.test(query)) return query;

  try {
    const data = await tokitoApi.get("/api/youtube-search", {
      query,
      q: query,
      text: query,
    }, { timeout: 30000 });

    const [video] = normalizeYoutubeList(data, tokitoApi.list);
    if (video?.url) return video.url;
  } catch (error) {
    console.warn("[YOUTUBE TARGET]", error?.message || error);
  }

  return query;
}

async function fetchAudioBuffer(url) {
  const response = await tokitoApi.axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxRedirects: 8,
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
    headers: {
      accept: "audio/*,application/octet-stream,*/*",
      "user-agent": "Mozilla/5.0",
    },
    validateStatus: status => status >= 200 && status < 400,
  });

  const buffer = Buffer.from(response.data || []);
  const contentType = String(response.headers?.["content-type"] || "").toLowerCase();

  if (!buffer.length) throw new Error("O arquivo de áudio veio vazio.");
  if (/text\/html|application\/json/i.test(contentType)) {
    throw new Error("O link resolvido não retornou um arquivo de áudio.");
  }

  return {
    buffer,
    mimetype: contentType.includes("audio/")
      ? contentType.split(";")[0]
      : "audio/mpeg",
  };
}

async function resolveAudioSource(input) {
  const target = await resolveYoutubeTarget(input);

  try {
    const data = await tokitoApi.get("/api/youtube-play", {
      query: target,
      q: target,
    }, { timeout: 90000 });

    const url = firstMediaUrl(data);
    if (url) {
      try {
        const fetched = await fetchAudioBuffer(url);
        return { ...fetched, target };
      } catch (error) {
        console.warn("[YOUTUBE PLAY FILE]", error?.message || error);
      }
    }
  } catch (error) {
    console.warn("[YOUTUBE PLAY API]", error?.message || error);
  }

  const result = await tokitoApi.buffer("/api/youtube-audio", {
    q: target,
    query: target,
  }, {
    timeout: 120000,
    headers: {
      accept: "audio/mpeg,audio/*,application/octet-stream,application/json,*/*",
    },
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
  });

  const contentType = String(result.contentType || "").toLowerCase();

  if (
    result.buffer?.length &&
    (
      contentType.includes("audio/") ||
      contentType.includes("application/octet-stream")
    )
  ) {
    return {
      buffer: result.buffer,
      mimetype: contentType.includes("audio/")
        ? contentType.split(";")[0]
        : "audio/mpeg",
      target,
    };
  }

  if (result.buffer?.length) {
    const raw = result.buffer.toString("utf8").trim();
    let parsed = raw;

    try {
      parsed = JSON.parse(raw);
    } catch {}

    const url = firstMediaUrl(parsed);
    if (url) {
      const fetched = await fetchAudioBuffer(url);
      return { ...fetched, target };
    }
  }

  throw new Error("A API não retornou um áudio reproduzível.");
}

async function sendYoutubeAudio(conn, msg, from, input) {
  const source = await resolveAudioSource(input);

  return conn.sendMessage(from, {
    audio: source.buffer,
    mimetype: source.mimetype || "audio/mpeg",
    fileName: "audio.mp3",
    ptt: false,
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  firstMediaUrl,
  resolveYoutubeTarget,
  fetchAudioBuffer,
  resolveAudioSource,
  sendYoutubeAudio,
};
