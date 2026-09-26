const path = require("path");
const config = require("../../config/config");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");

function firstUrl(value, depth = 0) {
  if (depth > 5 || value == null) return "";
  if (typeof value === "string" && /^https?:\/\//i.test(value)) return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstUrl(item, depth + 1);
      if (found) return found;
    }
    return "";
  }
  if (typeof value === "object") {
    const preferred = [
      "download_url", "download", "url", "link", "video", "audio", "play",
      "media", "arquivo", "file", "src"
    ];
    for (const key of preferred) {
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

function label(item) {
  return String(
    item?.titulo || item?.title || item?.nome || item?.name ||
    item?.track || item?.artist || item?.autor || item?.description || "Resultado"
  ).replace(/\s+/g, " ").trim().slice(0, 100);
}

function summary(data, query) {
  const items = tokitoApi.list(data).slice(0, 6);
  if (!items.length) return "";
  return items.map((item, index) => {
    const title = label(item);
    const extra = item?.artista || item?.artist || item?.author || item?.canal || item?.channel || item?.duracao || item?.duration || "";
    const link = firstUrl(item);
    return `${index + 1}. *${title}*${extra ? ` — ${String(extra).slice(0, 70)}` : ""}${link ? `\n   ${link}` : ""}`;
  }).join("\n\n");
}

function displayBotName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function tiktokDirectVideoUrl(item) {
  const candidates = [
    item?.video_sem_marca,
    item?.videoSemMarca,
    item?.no_watermark,
    item?.noWatermark,
    item?.nowm,
    item?.nwm_video_url,
    item?.download,
    item?.download_url,
    item?.play,
    item?.play_url,
    item?.play_addr?.url_list,
    item?.play_addr,
    item?.download_addr?.url_list,
    item?.download_addr,
    item?.video?.play_addr?.url_list,
    item?.video?.play_addr,
    item?.video?.download_addr?.url_list,
    item?.video?.download_addr,
    item?.video?.playAddr?.urlList,
    item?.video?.downloadAddr?.urlList,
    item?.video?.url,
    item?.media?.video?.url,
    item?.media?.video,
  ];

  for (const candidate of candidates) {
    const found = firstUrl(candidate);
    if (found) return found;
  }

  const bitRates = item?.video?.bit_rate || item?.video?.bitRate || [];
  if (Array.isArray(bitRates)) {
    for (const rate of bitRates) {
      const found = firstUrl(
        rate?.play_addr?.url_list ||
        rate?.play_addr ||
        rate?.playAddr?.urlList ||
        rate?.playAddr
      );
      if (found) return found;
    }
  }

  if (typeof item?.video === "string") {
    return firstUrl(item.video);
  }

  return "";
}

function isTikTokUrl(value) {
  try {
    const parsed = new URL(String(value || ""));
    return /(^|\.)tiktok\.com$/i.test(parsed.hostname);
  } catch {
    return false;
  }
}

function tiktokPageUrl(item) {
  const candidates = [
    item?.url,
    item?.link,
    item?.share_url,
    item?.shareUrl,
    item?.web_url,
    item?.webUrl,
    item?.share_info?.share_url,
    item?.shareInfo?.shareUrl,
  ];

  for (const candidate of candidates) {
    const found = firstUrl(candidate);
    if (found && isTikTokUrl(found)) return found;
  }

  const id = String(
    item?.aweme_id ||
    item?.awemeId ||
    item?.video_id ||
    item?.videoId ||
    item?.id ||
    ""
  ).trim();

  const username = String(
    item?.author?.unique_id ||
    item?.author?.uniqueId ||
    item?.author?.username ||
    item?.unique_id ||
    item?.uniqueId ||
    item?.username ||
    ""
  ).replace(/^@/, "").trim();

  if (/^\d{8,}$/.test(id) && username) {
    return "https://www.tiktok.com/@" + encodeURIComponent(username) + "/video/" + id;
  }

  return "";
}

function tiktokVideoUrl(item) {
  return tiktokDirectVideoUrl(item) || tiktokPageUrl(item);
}

function collectTikTokItems(value, out = [], depth = 0, seen = new WeakSet()) {
  if (depth > 9 || value == null) return out;

  if (Array.isArray(value)) {
    for (const item of value) collectTikTokItems(item, out, depth + 1, seen);
    return out;
  }

  if (typeof value !== "object") return out;
  if (seen.has(value)) return out;
  seen.add(value);

  if (tiktokDirectVideoUrl(value) || tiktokPageUrl(value)) out.push(value);

  for (const nested of Object.values(value)) {
    if (nested && typeof nested === "object") {
      collectTikTokItems(nested, out, depth + 1, seen);
    }
  }

  return out;
}

function responseShape(value, depth = 0, seen = new WeakSet()) {
  if (depth > 4) return "...";
  if (value === null) return "null";
  if (Array.isArray(value)) {
    return ["array", value.slice(0, 2).map(item => responseShape(item, depth + 1, seen))];
  }
  if (typeof value !== "object") return typeof value;
  if (seen.has(value)) return "circular";
  seen.add(value);

  const shape = {};
  for (const [key, nested] of Object.entries(value).slice(0, 30)) {
    shape[key] = responseShape(nested, depth + 1, seen);
  }
  return shape;
}

function tiktokItems(data) {
  const found = collectTikTokItems(data, []);
  const unique = [];
  const seen = new Set();

  for (const item of found) {
    const url = tiktokVideoUrl(item);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    unique.push(item);
  }

  return unique;
}

function tiktokSearchCommand() {
  return {
    name: "tiktoksearch",
    aliases: ["ttsearch"],
    menuCategory: "Downloads",
    menuSection: "TikTok",
    usage: "tiktoksearch termo",
    description: "Pesquisa vídeos no TikTok e envia um resultado",
    async execute(conn, msg, args, from) {
      const query = args.join(" ").trim();

      if (!query) {
        return conn.sendMessage(from, {
          text: "❌ Uso: .tiktoksearch <termo>\nEx.: .tiktoksearch edit anime",
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, {
          react: { text: "🔎", key: msg.key },
        }).catch(() => {});

        const data = await tokitoApi.get("/api/tiktok-search", {
          query,
          q: query,
          text: query,
        });

        const items = tiktokItems(data);
        if (!items.length) {
          console.warn("[TIKTOK SEARCH SHAPE]", JSON.stringify(responseShape(data)));
          const apiMessage = tokitoApi.text(data);
          throw new Error(apiMessage || "Nenhum vídeo foi encontrado para essa pesquisa.");
        }

        const item = items[Math.floor(Math.random() * items.length)];
        const directVideo = tiktokDirectVideoUrl(item);
        const pageUrl = tiktokPageUrl(item);
        if (!directVideo && !pageUrl) {
          throw new Error("O resultado não possui vídeo nem link utilizável.");
        }

        const videoUrl = directVideo || tokitoApi.url("/api/tiktok-video", {
          url: pageUrl,
        });

        const title = String(
          item?.titulo || item?.title || item?.desc || item?.description || query
        ).replace(/\s+/g, " ").trim().slice(0, 220);

        const author = String(
          item?.autor || item?.author || item?.username || item?.nickname || item?.user?.nickname || ""
        ).replace(/\s+/g, " ").trim().slice(0, 80);

        const caption = [
          "🎬 *TIKTOK SEARCH*",
          "",
          "🔎 *Busca:* " + query,
          title ? "📝 *Título:* " + title : "",
          author ? "👤 *Autor:* " + author : "",
          "",
          "> " + displayBotName(),
        ].filter(Boolean).join("\n");

        await conn.sendMessage(from, {
          video: { url: videoUrl },
          mimetype: "video/mp4",
          caption,
        }, { quoted: createStatusQuoted(msg) });

        await conn.sendMessage(from, {
          react: { text: "✅", key: msg.key },
        }).catch(() => {});
      } catch (error) {
        console.error("[TIKTOK SEARCH]", error.message);
        await conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível pesquisar vídeos no TikTok."),
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

function searchCommand({ name, aliases = [], route, params, section, description }) {
  return {
    name,
    aliases,
    menuCategory: "Downloads",
    menuSection: section || "Pesquisas",
    usage: name + " termo",
    description,
    async execute(conn, msg, args, from) {
      const query = args.join(" ").trim();
      if (!query) {
        return conn.sendMessage(from, {
          text: `❌ Uso: .${name} <termo>`
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "🔎", key: msg.key } }).catch(() => {});
        const data = await tokitoApi.get(route, params(query));
        const text = summary(data, query);
        if (!text) throw new Error("Nenhum resultado.");
        await conn.sendMessage(from, {
          text: `🔎 *${name.toUpperCase()} — ${query}*\n\n${text}`
        }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[TOKITO SEARCH]", name, error.message);
        await conn.sendMessage(from, {
          text: "❌ Não foi possível fazer essa pesquisa pela API."
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

function mediaCommand({ name, aliases = [], route, type = "video", section, description, param = "url" }) {
  return {
    name,
    aliases,
    menuCategory: "Downloads",
    menuSection: section || "Redes sociais",
    usage: name + " link",
    description,
    async execute(conn, msg, args, from) {
      const input = args.join(" ").trim();
      if (!input) {
        return conn.sendMessage(from, {
          text: `❌ Uso: .${name} <link>`
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "📥", key: msg.key } }).catch(() => {});
        const mediaUrl = tokitoApi.url(route, { [param]: input });
        const payload = type === "audio"
          ? { audio: { url: mediaUrl }, mimetype: "audio/mpeg", ptt: false }
          : type === "image"
            ? { image: { url: mediaUrl } }
            : { video: { url: mediaUrl }, mimetype: "video/mp4" };
        await conn.sendMessage(from, payload, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[TOKITO MEDIA]", name, error.message);
        await conn.sendMessage(from, {
          text: "❌ Não foi possível baixar essa mídia pela API."
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

function jsonDownloadCommand({ name, aliases = [], route, param = "url", section, description, asDocument = false }) {
  return {
    name,
    aliases,
    menuCategory: "Downloads",
    menuSection: section || "Arquivos",
    usage: name + " link",
    description,
    async execute(conn, msg, args, from) {
      const input = args.join(" ").trim();
      if (!input) {
        return conn.sendMessage(from, { text: `❌ Uso: .${name} <link>` }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "📥", key: msg.key } }).catch(() => {});
        const data = await tokitoApi.get(route, { [param]: input });
        const root = tokitoApi.firstObject(data) || data;
        const fileUrl = firstUrl(root);
        if (!fileUrl) {
          const text = tokitoApi.text(data) || JSON.stringify(root).slice(0, 2500);
          await conn.sendMessage(from, { text: `📦 *${name.toUpperCase()}*\n\n${text}` }, { quoted: createStatusQuoted(msg) });
          return;
        }

        if (asDocument) {
          const fileName = String(root?.nome || root?.name || root?.filename || path.basename(new URL(fileUrl).pathname) || name)
            .replace(/[\\/:*?"<>|]/g, "_").slice(0, 100);
          await conn.sendMessage(from, {
            document: { url: fileUrl },
            fileName: fileName || name,
            mimetype: root?.mimetype || root?.mime || "application/octet-stream",
          }, { quoted: createStatusQuoted(msg) });
        } else {
          await conn.sendMessage(from, {
            text: `📥 *${name.toUpperCase()}*\n\n🔗 ${fileUrl}`
          }, { quoted: createStatusQuoted(msg) });
        }
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[TOKITO DOWNLOAD]", name, error.message);
        await conn.sendMessage(from, {
          text: "❌ Não foi possível processar esse link pela API."
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = [
  tiktokSearchCommand(),
  searchCommand({ name: "spotifysearch", aliases: ["spsearch"], route: "/api/spotify-search", params: q => ({ q, query: q }), section: "Spotify", description: "Pesquisa músicas no Spotify pela API" }),
  searchCommand({ name: "soundcloudsearch", aliases: ["scsearch"], route: "/api/soundcloud-search", params: q => ({ q, query: q }), section: "SoundCloud", description: "Pesquisa faixas no SoundCloud pela API" }),
  searchCommand({ name: "appstore", route: "/api/appstore-search", params: q => ({ q }), section: "Apps", description: "Pesquisa apps na App Store pela API" }),
  searchCommand({ name: "lyrics", aliases: ["letra"], route: "/api/lyrics-search", params: q => ({ q, query: q }), section: "Pesquisas", description: "Pesquisa letras de músicas pela API" }),
  searchCommand({ name: "animesearch", aliases: ["anime"], route: "/api/anime-search", params: q => ({ q, query: q }), section: "Pesquisas", description: "Pesquisa animes pela API" }),
  searchCommand({ name: "mangasearch", aliases: ["manga"], route: "/api/manga-search", params: q => ({ q, query: q }), section: "Pesquisas", description: "Pesquisa mangás pela API" }),
  searchCommand({ name: "playstore", route: "/api/playstore", params: q => ({ query: q }), section: "Apps", description: "Pesquisa apps na Play Store pela API" }),
  searchCommand({ name: "aptoide", route: "/api/aptoide", params: q => ({ query: q }), section: "Apps", description: "Pesquisa apps no Aptoide pela API" }),
  searchCommand({ name: "happymod", route: "/api/happymod-search", params: q => ({ q }), section: "Apps", description: "Pesquisa resultados no HappyMod pela API" }),
  searchCommand({ name: "applemusic", aliases: ["appleplay"], route: "/api/applemusic-play", params: q => ({ text: q }), section: "Música", description: "Pesquisa Apple Music pela API" }),
  searchCommand({ name: "deezer", route: "/api/deezer-play", params: q => ({ q, query: q }), section: "Música", description: "Pesquisa Deezer pela API" }),
  searchCommand({ name: "soundcloud", route: "/api/soundcloud", params: q => ({ q, query: q }), section: "SoundCloud", description: "Pesquisa SoundCloud pela API" }),

  mediaCommand({ name: "facebook", aliases: ["fb"], route: "/api/facebook", type: "video", section: "Facebook", description: "Baixa vídeo do Facebook pela API" }),
  mediaCommand({ name: "faceaudio", aliases: ["fbaudio", "face_audio"], route: "/api/facebook", type: "audio", section: "Facebook", description: "Baixa áudio do Facebook pela API" }),
  mediaCommand({ name: "twitter", aliases: ["xvideo"], route: "/api/twitter-video", type: "video", section: "X/Twitter", description: "Baixa vídeo do X/Twitter pela API" }),
  mediaCommand({ name: "twitteraudio", aliases: ["xaudio", "twitter_audio"], route: "/api/twitter-video", type: "audio", section: "X/Twitter", description: "Baixa áudio do X/Twitter pela API" }),
  mediaCommand({ name: "kwai", route: "/api/kwai-video", type: "video", section: "Kwai", description: "Baixa vídeo do Kwai pela API" }),
  mediaCommand({ name: "kwaiaudio", aliases: ["kwai_audio"], route: "/api/kwai-audio", type: "audio", section: "Kwai", description: "Baixa áudio do Kwai pela API" }),
  mediaCommand({ name: "pinterestvideo", aliases: ["pinvideo"], route: "/api/pinterest-video", type: "video", section: "Pinterest", description: "Baixa vídeo do Pinterest pela API" }),
  mediaCommand({ name: "appleaudio", aliases: ["applemp3", "apple_audio"], route: "/api/applemusic-audio", type: "audio", section: "Música", description: "Baixa áudio de link Apple Music pela API" }),
  mediaCommand({ name: "soundaudio", aliases: ["soundcloudaudio", "sound_audio"], route: "/api/soundcloud-audio", type: "audio", section: "SoundCloud", description: "Baixa áudio do SoundCloud pela API" }),

  jsonDownloadCommand({ name: "capcut", route: "/api/capcut-download", section: "Arquivos", description: "Processa link do CapCut pela API" }),
  jsonDownloadCommand({ name: "mediafire", route: "/api/mediafire", section: "Arquivos", description: "Baixa arquivo do MediaFire pela API", asDocument: true }),
  jsonDownloadCommand({ name: "mega", route: "/api/mega", section: "Arquivos", description: "Baixa arquivo do MEGA pela API", asDocument: true }),
];

module.exports = commands;
module.exports._test = {
  firstUrl,
  label,
  summary,
  tiktokDirectVideoUrl,
  isTikTokUrl,
  tiktokPageUrl,
  tiktokVideoUrl,
  tiktokItems,
  collectTikTokItems,
  responseShape,
};
