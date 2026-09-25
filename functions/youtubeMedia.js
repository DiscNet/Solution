const tokitoApi = require("./tokitoApi");
const { normalizeYoutubeList } = require("./youtubeResult");

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
      "play",
      "media",
      "file",
      "src",
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

async function resolveAudioSource(input) {
  const target = await resolveYoutubeTarget(input);

  try {
    const data = await tokitoApi.get("/api/youtube-play", {
      query: target,
      q: target,
    }, { timeout: 90000 });

    const url = firstMediaUrl(data);
    if (url) return { type: "url", value: url, target };
  } catch (error) {
    console.warn("[YOUTUBE PLAY API]", error?.message || error);
  }

  const result = await tokitoApi.buffer("/api/youtube-audio", {
    q: target,
    query: target,
  }, {
    timeout: 120000,
    headers: { accept: "audio/*,application/json,*/*" },
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
  });

  const contentType = String(result.contentType || "").toLowerCase();

  if (contentType.includes("audio/") || contentType.includes("octet-stream")) {
    if (!result.buffer?.length) throw new Error("Áudio vazio retornado pela API.");
    return { type: "buffer", value: result.buffer, target };
  }

  if (contentType.includes("json") || contentType.includes("text")) {
    let parsed;
    try {
      parsed = JSON.parse(result.buffer.toString("utf8"));
    } catch {
      parsed = result.buffer.toString("utf8");
    }

    const url = firstMediaUrl(parsed);
    if (url) return { type: "url", value: url, target };
  }

  throw new Error("A API não retornou um áudio utilizável.");
}

async function sendYoutubeAudio(conn, msg, from, input) {
  const source = await resolveAudioSource(input);

  const audio = source.type === "buffer"
    ? source.value
    : { url: source.value };

  return conn.sendMessage(from, {
    audio,
    mimetype: "audio/mpeg",
    fileName: "audio.mp3",
    ptt: false,
  }, { quoted: msg });
}

module.exports = {
  firstMediaUrl,
  resolveYoutubeTarget,
  resolveAudioSource,
  sendYoutubeAudio,
};
