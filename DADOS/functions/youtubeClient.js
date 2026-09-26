const fs = require("fs");
const path = require("path");
const { finished } = require("stream/promises");
const axios = require("axios");
const vreden = require("@vreden/youtube_scraper");

let modulePromise = null;
let clientPromise = null;

const AUDIO_QUALITY = [92, 128, 256, 320].includes(Number(process.env.YOUTUBE_AUDIO_QUALITY))
  ? Number(process.env.YOUTUBE_AUDIO_QUALITY)
  : 128;
const VIDEO_QUALITY = [144, 360, 480, 720, 1080].includes(Number(process.env.YOUTUBE_VIDEO_QUALITY))
  ? Number(process.env.YOUTUBE_VIDEO_QUALITY)
  : 360;

async function loadYoutubeModule() {
  if (!modulePromise) {
    modulePromise = import("youtubei.js").catch((error) => {
      modulePromise = null;
      throw error;
    });
  }
  return modulePromise;
}

async function getYoutubeClient() {
  if (!clientPromise) {
    clientPromise = loadYoutubeModule()
      .then(({ Innertube }) => Innertube.create({ generate_session_locally: true }))
      .catch((error) => {
        clientPromise = null;
        throw error;
      });
  }
  return clientPromise;
}

function textOf(value, fallback = "") {
  if (value == null) return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (typeof value.text === "string") return value.text;
  if (typeof value.simple_text === "string") return value.simple_text;
  if (typeof value.simpleText === "string") return value.simpleText;
  if (Array.isArray(value.runs)) {
    const text = value.runs.map((run) => run?.text || "").join("").trim();
    if (text) return text;
  }
  try {
    const converted = String(value);
    if (converted && converted !== "[object Object]") return converted;
  } catch {}
  return fallback;
}

function formatDuration(seconds) {
  const total = Number(seconds);
  if (!Number.isFinite(total) || total < 0) return "n/a";
  const rounded = Math.floor(total);
  const h = Math.floor(rounded / 3600);
  const m = Math.floor((rounded % 3600) / 60);
  const s = rounded % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

function formatViews(value) {
  if (value == null || value === "") return "n/a";
  if (typeof value === "string" && !/^\d+$/.test(value)) return value;
  const n = Number(value);
  if (!Number.isFinite(n)) return textOf(value, "n/a");
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(1)}b`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}m`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function thumbnailOf(value) {
  const candidates = value?.thumbnails || value?.thumbnail || value?.thumbnail_data || [];
  const list = Array.isArray(candidates) ? candidates : Array.from(candidates || []);
  for (let i = list.length - 1; i >= 0; i -= 1) {
    const url = list[i]?.url;
    if (typeof url === "string" && url) return url;
  }
  return "";
}

function extractVideoId(input) {
  const raw = String(input || "").trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(id || "")) return id;
    }
    if (host.endsWith("youtube.com")) {
      const byQuery = url.searchParams.get("v");
      if (/^[a-zA-Z0-9_-]{11}$/.test(byQuery || "")) return byQuery;
      const parts = url.pathname.split("/").filter(Boolean);
      if (["shorts", "embed", "live"].includes(parts[0]) && /^[a-zA-Z0-9_-]{11}$/.test(parts[1] || "")) {
        return parts[1];
      }
    }
  } catch {}

  const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/))([a-zA-Z0-9_-]{11})/i);
  return match?.[1] || null;
}

function youtubeUrl(videoId) {
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function ensureVideoId(target) {
  const id = extractVideoId(target) || String(target || "").trim();
  if (!/^[a-zA-Z0-9_-]{11}$/.test(id)) throw new Error("ERR_YOUTUBE_INVALID_ID");
  return id;
}

function normalizeSearchVideo(video) {
  if (!video?.id) return null;
  const durationText = textOf(video.duration, "") || textOf(video.length_text, "");
  const author = textOf(video.author?.name, "") || textOf(video.author, "") || "desconhecido";
  const views = textOf(video.view_count, "") || textOf(video.short_view_count, "") || "n/a";

  return {
    id: video.id,
    title: textOf(video.title, "sem título"),
    channel: author,
    duration: durationText || "n/a",
    views,
    thumbnail: thumbnailOf(video),
    url: youtubeUrl(video.id)
  };
}

function normalizeBasicInfo(videoId, basic = {}) {
  const durationValue = basic.duration_seconds ?? basic.duration;
  return {
    id: videoId,
    title: textOf(basic.title, "vídeo do youtube"),
    channel: textOf(basic.author, "") || textOf(basic.channel?.name, "") || "desconhecido",
    duration: typeof durationValue === "number" ? formatDuration(durationValue) : textOf(durationValue, "n/a"),
    views: formatViews(basic.view_count),
    thumbnail: thumbnailOf(basic) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    url: youtubeUrl(videoId)
  };
}

function normalizeVredenMetadata(videoId, data = {}) {
  const metadata = data?.metadata || data;
  const thumbnails = Array.isArray(metadata?.thumbnails) ? metadata.thumbnails : [];
  const thumbnail = metadata?.thumbnail || metadata?.image || thumbnails.at(-1)?.url;
  const seconds = metadata?.seconds ?? metadata?.duration?.seconds;
  const author = metadata?.author?.name || metadata?.channel_title || metadata?.channelTitle;
  const views = metadata?.views ?? metadata?.statistics?.view;

  return {
    id: metadata?.videoId || metadata?.id || videoId,
    title: metadata?.title || "vídeo do youtube",
    channel: author || "desconhecido",
    duration: metadata?.timestamp || metadata?.duration?.timestamp || (seconds != null ? formatDuration(seconds) : "n/a"),
    views: formatViews(views),
    thumbnail: thumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    url: metadata?.url || youtubeUrl(videoId)
  };
}

async function searchVideos(query, limit = 5) {
  const youtube = await getYoutubeClient();
  const result = await youtube.search(String(query || "").trim(), { type: "video" });
  const source = result?.videos || result?.results || [];
  return Array.from(source)
    .map(normalizeSearchVideo)
    .filter(Boolean)
    .slice(0, Math.max(1, limit));
}

async function getVideo(target) {
  const raw = String(target || "").trim();
  const videoId = extractVideoId(raw);

  if (!videoId) {
    const [first] = await searchVideos(raw, 1);
    return first || null;
  }

  try {
    const youtube = await getYoutubeClient();
    const info = await youtube.getBasicInfo(videoId, { client: "WEB" });
    if (info?.basic_info?.title) return normalizeBasicInfo(videoId, info.basic_info);
  } catch {}

  try {
    const data = await vreden.metadata(youtubeUrl(videoId));
    if (data?.status !== false) return normalizeVredenMetadata(videoId, data);
  } catch {}

  return {
    id: videoId,
    title: "vídeo do youtube",
    channel: "desconhecido",
    duration: "n/a",
    views: "n/a",
    thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    url: youtubeUrl(videoId)
  };
}

function resolveVredenDownload(result, errorCode) {
  if (!result || result.status === false || result.download?.status === false) {
    const detail = result?.message || result?.error || result?.download?.message;
    const error = new Error(errorCode);
    if (detail) error.cause = new Error(String(detail));
    throw error;
  }

  const url = result?.download?.url || result?.downloadUrl || result?.url;
  if (!url || !/^https?:\/\//i.test(url)) throw new Error(errorCode);
  return { url, result };
}

async function downloadRemoteFile(url, outputPath, errorCode) {
  await fs.promises.mkdir(path.dirname(outputPath), { recursive: true });
  try { await fs.promises.unlink(outputPath); } catch {}

  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 120000,
    maxContentLength: Infinity,
    maxBodyLength: Infinity,
    headers: {
      "user-agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36"
    },
    validateStatus: (status) => status >= 200 && status < 400
  });

  const writer = fs.createWriteStream(outputPath);
  response.data.pipe(writer);

  try {
    await finished(writer);
    const stat = await fs.promises.stat(outputPath);
    if (!stat.size) throw new Error(errorCode);
    return outputPath;
  } catch (error) {
    try { writer.destroy(); } catch {}
    try { await fs.promises.unlink(outputPath); } catch {}
    throw error;
  }
}

async function downloadAudioMp3(target, outputPath) {
  const videoId = ensureVideoId(target);
  const response = await vreden.ytmp3(youtubeUrl(videoId), AUDIO_QUALITY);
  const { url } = resolveVredenDownload(response, "ERR_YOUTUBE_AUDIO_DOWNLOAD");
  return downloadRemoteFile(url, outputPath, "ERR_YOUTUBE_EMPTY_MP3");
}

async function downloadAudioSource(target, outputPath) {
  return downloadAudioMp3(target, outputPath);
}

async function downloadVideo(target, outputPath) {
  const videoId = ensureVideoId(target);
  const response = await vreden.ytmp4(youtubeUrl(videoId), VIDEO_QUALITY);
  const { url } = resolveVredenDownload(response, "ERR_YOUTUBE_VIDEO_DOWNLOAD");
  return downloadRemoteFile(url, outputPath, "ERR_YOUTUBE_EMPTY_VIDEO");
}

function resetYoutubeClient() {
  clientPromise = null;
}

module.exports = {
  getYoutubeClient,
  searchVideos,
  getVideo,
  extractVideoId,
  downloadAudioSource,
  downloadAudioMp3,
  downloadVideo,
  resetYoutubeClient
};
