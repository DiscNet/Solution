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

function normalizeYoutubeList(data, listFn) {
  const source = typeof listFn === "function" ? listFn(data) : [];
  return source.map(normalizeYoutubeItem).filter(item => item.url);
}

module.exports = {
  textValue,
  firstUrl,
  thumbnailUrl,
  normalizeYoutubeItem,
  normalizeYoutubeList,
};
