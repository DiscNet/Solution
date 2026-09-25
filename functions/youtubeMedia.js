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

async function directAudioEndpoint(target) {
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
      contentType.includes("octet-stream")
    )
  ) {
    return {
      type: "buffer",
      value: result.buffer,
      mimetype: contentType.includes("audio/")
        ? contentType.split(";")[0]
        : "audio/mpeg",
      target,
    };
  }

  if (result.buffer?.length) {
    let parsed;
    try {
      parsed = JSON.parse(result.buffer.toString("utf8"));
    } catch {
      parsed = result.buffer.toString("utf8");
    }

    const url = firstMediaUrl(parsed);
    if (url) {
      return {
        type: "url",
        value: url,
        target,
      };
    }
  }

  throw new Error("A API não retornou um áudio utilizável.");
}

async function resolveAudioSource(input) {
  const target = await resolveYoutubeTarget(input);
  if (!target) throw new Error("Áudio sem alvo.");

  try {
    const data = await tokitoApi.get("/api/youtube-play", {
      query: target,
      q: target,
    }, { timeout: 90000 });

    const url = firstMediaUrl(data);
    if (url) {
      return {
        type: "url",
        value: url,
        target,
      };
    }
  } catch (error) {
    console.warn("[YOUTUBE PLAY API]", error?.message || error);
  }

  return directAudioEndpoint(target);
}

async function downloadAudioUrl(url) {
  const response = await tokitoApi.axios.get(url, {
    responseType: "arraybuffer",
    timeout: 120000,
    maxContentLength: 80 * 1024 * 1024,
    maxBodyLength: 80 * 1024 * 1024,
    headers: {
      "user-agent": "Mozilla/5.0",
      accept: "audio/mpeg,audio/*,application/octet-stream,*/*",
    },
    validateStatus: status => status >= 200 && status < 400,
  });

  const buffer = Buffer.from(response.data || []);
  if (!buffer.length) throw new Error("O link do áudio retornou um arquivo vazio.");

  const contentType = String(response.headers?.["content-type"] || "").toLowerCase();

  if (
    contentType &&
    !contentType.includes("audio/") &&
    !contentType.includes("octet-stream") &&
    !contentType.includes("mpeg")
  ) {
    throw new Error("O link retornado não é um arquivo de áudio.");
  }

  return {
    buffer,
    mimetype: contentType.includes("audio/")
      ? contentType.split(";")[0]
      : "audio/mpeg",
  };
}

async function materializeAudioSource(source) {
  if (source.type === "buffer") {
    return {
      buffer: source.value,
      mimetype: source.mimetype || "audio/mpeg",
    };
  }

  try {
    return await downloadAudioUrl(source.value);
  } catch (error) {
    console.warn("[YOUTUBE AUDIO URL]", error?.message || error);

    const direct = await directAudioEndpoint(source.target);

    if (direct.type === "buffer") {
      return {
        buffer: direct.value,
        mimetype: direct.mimetype || "audio/mpeg",
      };
    }

    return downloadAudioUrl(direct.value);
  }
}

async function sendYoutubeAudio(conn, msg, from, input) {
  const source = await resolveAudioSource(input);
  const audio = await materializeAudioSource(source);

  return conn.sendMessage(from, {
    audio: audio.buffer,
    mimetype: audio.mimetype || "audio/mpeg",
    fileName: "audio.mp3",
    ptt: false,
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  firstMediaUrl,
  resolveYoutubeTarget,
  directAudioEndpoint,
  resolveAudioSource,
  downloadAudioUrl,
  materializeAudioSource,
  sendYoutubeAudio,
};
