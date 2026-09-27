const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");
const { createMetadinhaPair } = require("../../functions/metadinha");

function firstYoutube(data) {
  return tokitoApi.list(data).find(item => item?.url || item?.link || item?.videoId) || tokitoApi.list(data)[0] || null;
}

function normalizeMetadinhaUrl(value) {
  const text = String(value || "").trim();
  if (!text) return "";

  if (/^https?:\/\//i.test(text)) return text;

  if (text.startsWith("/")) {
    try {
      return new URL(text, tokitoApi.settings().baseUrl + "/").toString();
    } catch {}
  }

  return "";
}

function extractMetadinhaMedia(value, output = [], seen = new Set(), depth = 0) {
  if (value === null || value === undefined || depth > 8) return output;

  if (typeof value === "string") {
    const text = value.trim();
    if (!text) return output;

    const dataImage = text.match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
    if (dataImage) {
      try {
        const buffer = Buffer.from(dataImage[2].replace(/\s+/g, ""), "base64");
        if (buffer.length) {
          output.push({
            type: "buffer",
            buffer,
            mimetype: dataImage[1].toLowerCase(),
          });
        }
      } catch {}
      return output;
    }

    const url = normalizeMetadinhaUrl(text);
    if (url) output.push({ type: "url", url });
    else if (/^[\[{]/.test(text)) {
      try {
        extractMetadinhaMedia(JSON.parse(text), output, seen, depth + 1);
      } catch {}
    }
    return output;
  }

  if (typeof value !== "object") return output;
  if (seen.has(value)) return output;
  seen.add(value);

  if (Array.isArray(value)) {
    for (const item of value) extractMetadinhaMedia(item, output, seen, depth + 1);
    return output;
  }

  const preferredKeys = [
    "url", "image", "imagem", "img", "foto", "photo", "src", "link",
    "media", "arquivo", "file", "download", "metadinha",
    "images", "imagens", "urls", "resultado", "result", "data",
  ];

  const visitedKeys = new Set();

  for (const key of preferredKeys) {
    if (!Object.prototype.hasOwnProperty.call(value, key)) continue;
    visitedKeys.add(key);
    extractMetadinhaMedia(value[key], output, seen, depth + 1);
  }

  for (const [key, item] of Object.entries(value)) {
    if (visitedKeys.has(key)) continue;
    extractMetadinhaMedia(item, output, seen, depth + 1);
  }

  return output;
}

function uniqueMetadinhaMedia(items) {
  const keys = new Set();
  const result = [];

  for (const item of items || []) {
    const key = item?.type === "url"
      ? "url:" + item.url
      : item?.type === "buffer"
        ? "buffer:" + item.mimetype + ":" + item.buffer?.length + ":" + item.buffer?.subarray(0, 24).toString("base64")
        : "";

    if (!key || keys.has(key)) continue;
    keys.add(key);
    result.push(item);
  }

  return result;
}

module.exports = [
  {
    name: "playdoc",
    aliases: ["ytdoc"],
    menuCategory: "Downloads",
    menuSection: "YouTube",
    usage: "playdoc música ou link",
    description: "Baixa áudio do YouTube como documento pela API",
    async execute(conn, msg, args, from) {
      const input = args.join(" ").trim();
      if (!input) return conn.sendMessage(from, { text: "❌ Uso: .playdoc <música ou link>" }, { quoted: createStatusQuoted(msg) });
      try {
        await conn.sendMessage(from, { react: { text: "📄", key: msg.key } }).catch(() => {});
        let target = input;
        let title = "musica";
        if (!/^https?:\/\//i.test(input)) {
          const data = await tokitoApi.get("/api/youtube-search", { query: input });
          const item = firstYoutube(data);
          if (!item) throw new Error("Nenhum vídeo encontrado.");
          target = item.url || item.link || (item.videoId ? "https://www.youtube.com/watch?v=" + item.videoId : input);
          title = item.title || item.titulo || title;
        }
        const safe = String(title).replace(/[\\/:*?"<>|]/g, "").trim().slice(0, 90) || "musica";
        await conn.sendMessage(from, {
          document: { url: tokitoApi.url("/api/youtube-audio", { q: target }) },
          mimetype: "audio/mpeg",
          fileName: safe + ".mp3",
        }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API PLAYDOC]", info.status || "-", info.message);
        await conn.sendMessage(from, { text: tokitoApi.userError(error, "Não foi possível gerar o documento de áudio.") }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "tiktokfoto",
    aliases: ["tiktok_foto", "ttfoto"],
    menuCategory: "Downloads",
    menuSection: "TikTok",
    usage: "tiktokfoto link",
    description: "Baixa fotos de publicação do TikTok pela API",
    async execute(conn, msg, args, from) {
      const input = String(args[0] || "").trim();
      if (!input) return conn.sendMessage(from, { text: "❌ Uso: .tiktokfoto <link>" }, { quoted: createStatusQuoted(msg) });
      try {
        await conn.sendMessage(from, { react: { text: "🖼️", key: msg.key } }).catch(() => {});
        const firstUrl = tokitoApi.url("/api/tiktok-foto", { url: input, index: 0 });
        const probe = await tokitoApi.axios.get(firstUrl, {
          responseType: "arraybuffer", timeout: 60000, validateStatus: () => true,
        });
        if (probe.status < 200 || probe.status >= 300) throw new Error("A API não encontrou fotos.");
        const total = Math.min(20, Math.max(1, Number(probe.headers?.["x-total-fotos"] || 1)));
        for (let i = 0; i < total; i++) {
          await conn.sendMessage(from, {
            image: { url: tokitoApi.url("/api/tiktok-foto", { url: input, index: i }) },
            caption: i === 0 ? "🖼️ *TIKTOK FOTO*\n📸 " + total + " imagem(ns)" : undefined,
          }, { quoted: i === 0 ? createStatusQuoted(msg) : undefined });
        }
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API TIKTOK FOTO]", info.status || "-", info.message);
        await conn.sendMessage(from, { text: tokitoApi.userError(error, "Não foi possível baixar as fotos desse TikTok.") }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "metadinha",
    aliases: ["metade"],
    menuCategory: "Brincadeiras",
    menuSection: "Imagens",
    usage: "metadinha",
    description: "Envia duas imagens combinando para usar como foto de perfil",
    async execute(conn, msg, args, from) {
      try {
        await conn.sendMessage(from, { react: { text: "💞", key: msg.key } }).catch(() => {});

        const result = await tokitoApi.buffer("/api/metadinha", {}, {
          timeout: 60000,
          headers: { accept: "image/*,application/json,*/*" },
        });

        if (result.buffer?.length && /^image\//i.test(result.contentType)) {
          await conn.sendMessage(from, {
            image: result.buffer,
            mimetype: result.contentType.split(";")[0] || undefined,
            caption: "💞 *METADINHA*",
          });
          await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
          return;
        }

        let parsed;
        try {
          parsed = JSON.parse(result.buffer.toString("utf8"));
        } catch {
          throw new Error(
            "A API retornou um formato inesperado (" +
            (result.contentType || "sem content-type") +
            ")."
          );
        }

        const media = uniqueMetadinhaMedia(extractMetadinhaMedia(parsed))
          .filter(item => item?.type === "buffer" || item?.type === "url")
          .slice(0, 2);

        if (!media.length) {
          const keys = parsed && typeof parsed === "object"
            ? Object.keys(parsed).slice(0, 12).join(", ")
            : typeof parsed;
          throw new Error("Imagem não retornada. Campos recebidos: " + (keys || "nenhum"));
        }

        for (let i = 0; i < media.length; i++) {
          const item = media[i];
          const image = item.type === "buffer" ? item.buffer : { url: item.url };
          await conn.sendMessage(from, {
            image,
            ...(item.mimetype ? { mimetype: item.mimetype } : {}),
            caption: i === 0 ? "💞 *METADINHA*" : undefined,
          });
        }

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.warn("[API METADINHA]", info.status || "-", info.message);
        try {
          const pair = await createMetadinhaPair();
          for (let index = 0; index < pair.length; index++) {
            await conn.sendMessage(from, {
              image: pair[index],
              caption: index === 0 ? "💞 *METADINHA* — parte 1/2" : "💞 *METADINHA* — parte 2/2",
            }, index === 0 ? { quoted: createStatusQuoted(msg) } : undefined);
          }
          await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
        } catch (fallbackError) {
          console.error("[METADINHA LOCAL]", fallbackError.message);
          await conn.sendMessage(from, {
            text: "❌ Não foi possível gerar a metadinha agora.",
          }, { quoted: createStatusQuoted(msg) });
        }
      }
    },
  },
];

module.exports._test = { firstYoutube, normalizeMetadinhaUrl, extractMetadinhaMedia, uniqueMetadinhaMedia };
