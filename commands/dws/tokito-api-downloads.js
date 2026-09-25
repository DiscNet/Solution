const path = require("path");
const tokitoApi = require("../../functions/tokitoApi");
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
          text: "❌ Não foi possível fazer essa pesquisa pela Tokito API."
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
          text: "❌ Não foi possível baixar essa mídia pela Tokito API."
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
          text: "❌ Não foi possível processar esse link pela Tokito API."
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = [
  searchCommand({ name: "tiktoksearch", aliases: ["ttsearch"], route: "/api/tiktok-search", params: q => ({ query: q }), section: "TikTok", description: "Pesquisa vídeos no TikTok pela Tokito API" }),
  searchCommand({ name: "spotifysearch", aliases: ["spsearch"], route: "/api/spotify-search", params: q => ({ q, query: q }), section: "Spotify", description: "Pesquisa músicas no Spotify pela Tokito API" }),
  searchCommand({ name: "soundcloudsearch", aliases: ["scsearch"], route: "/api/soundcloud-search", params: q => ({ q, query: q }), section: "SoundCloud", description: "Pesquisa faixas no SoundCloud pela Tokito API" }),
  searchCommand({ name: "appstore", route: "/api/appstore-search", params: q => ({ q }), section: "Apps", description: "Pesquisa apps na App Store pela Tokito API" }),
  searchCommand({ name: "lyrics", aliases: ["letra"], route: "/api/lyrics-search", params: q => ({ q, query: q }), section: "Pesquisas", description: "Pesquisa letras de músicas pela Tokito API" }),
  searchCommand({ name: "animesearch", aliases: ["anime"], route: "/api/anime-search", params: q => ({ q, query: q }), section: "Pesquisas", description: "Pesquisa animes pela Tokito API" }),
  searchCommand({ name: "mangasearch", aliases: ["manga"], route: "/api/manga-search", params: q => ({ q, query: q }), section: "Pesquisas", description: "Pesquisa mangás pela Tokito API" }),
  searchCommand({ name: "playstore", route: "/api/playstore", params: q => ({ query: q }), section: "Apps", description: "Pesquisa apps na Play Store pela Tokito API" }),
  searchCommand({ name: "aptoide", route: "/api/aptoide", params: q => ({ query: q }), section: "Apps", description: "Pesquisa apps no Aptoide pela Tokito API" }),
  searchCommand({ name: "happymod", route: "/api/happymod-search", params: q => ({ q }), section: "Apps", description: "Pesquisa resultados no HappyMod pela Tokito API" }),
  searchCommand({ name: "applemusic", aliases: ["appleplay"], route: "/api/applemusic-play", params: q => ({ text: q }), section: "Música", description: "Pesquisa Apple Music pela Tokito API" }),
  searchCommand({ name: "deezer", route: "/api/deezer-play", params: q => ({ q, query: q }), section: "Música", description: "Pesquisa Deezer pela Tokito API" }),
  searchCommand({ name: "soundcloud", route: "/api/soundcloud", params: q => ({ q, query: q }), section: "SoundCloud", description: "Pesquisa SoundCloud pela Tokito API" }),

  mediaCommand({ name: "facebook", aliases: ["fb"], route: "/api/facebook", type: "video", section: "Facebook", description: "Baixa vídeo do Facebook pela Tokito API" }),
  mediaCommand({ name: "faceaudio", aliases: ["fbaudio"], route: "/api/facebook", type: "audio", section: "Facebook", description: "Baixa áudio do Facebook pela Tokito API" }),
  mediaCommand({ name: "twitter", aliases: ["xvideo"], route: "/api/twitter-video", type: "video", section: "X/Twitter", description: "Baixa vídeo do X/Twitter pela Tokito API" }),
  mediaCommand({ name: "twitteraudio", aliases: ["xaudio"], route: "/api/twitter-video", type: "audio", section: "X/Twitter", description: "Baixa áudio do X/Twitter pela Tokito API" }),
  mediaCommand({ name: "kwai", route: "/api/kwai-video", type: "video", section: "Kwai", description: "Baixa vídeo do Kwai pela Tokito API" }),
  mediaCommand({ name: "kwaiaudio", route: "/api/kwai-audio", type: "audio", section: "Kwai", description: "Baixa áudio do Kwai pela Tokito API" }),
  mediaCommand({ name: "pinterestvideo", aliases: ["pinvideo"], route: "/api/pinterest-video", type: "video", section: "Pinterest", description: "Baixa vídeo do Pinterest pela Tokito API" }),
  mediaCommand({ name: "appleaudio", aliases: ["applemp3"], route: "/api/applemusic-audio", type: "audio", section: "Música", description: "Baixa áudio de link Apple Music pela Tokito API" }),
  mediaCommand({ name: "soundaudio", aliases: ["soundcloudaudio"], route: "/api/soundcloud-audio", type: "audio", section: "SoundCloud", description: "Baixa áudio do SoundCloud pela Tokito API" }),

  jsonDownloadCommand({ name: "capcut", route: "/api/capcut-download", section: "Arquivos", description: "Processa link do CapCut pela Tokito API" }),
  jsonDownloadCommand({ name: "mediafire", route: "/api/mediafire", section: "Arquivos", description: "Baixa arquivo do MediaFire pela Tokito API", asDocument: true }),
  jsonDownloadCommand({ name: "mega", route: "/api/mega", section: "Arquivos", description: "Baixa arquivo do MEGA pela Tokito API", asDocument: true }),

  {
    name: "printsite",
    aliases: ["screenshotsite"],
    menuCategory: "Downloads",
    menuSection: "Ferramentas",
    usage: "printsite url",
    description: "Gera screenshot de site pela Tokito API",
    async execute(conn, msg, args, from) {
      const target = args[0];
      if (!target) return conn.sendMessage(from, { text: "❌ Uso: .printsite https://exemplo.com" }, { quoted: createStatusQuoted(msg) });
      try {
        await conn.sendMessage(from, {
          image: { url: tokitoApi.url("/api/print-site", { url: target }) },
          caption: "🖼️ Screenshot gerado pela Tokito API",
        }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        await conn.sendMessage(from, { text: "❌ Não foi possível gerar o print." }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports = commands;
module.exports._test = { firstUrl, label, summary };
