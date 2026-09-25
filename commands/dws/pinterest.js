// Menu: Downloads - Pinterest | Comando: pin
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");

function displayBotName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function addUrl(urls, value) {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return;
  if (!urls.includes(url)) urls.push(url);
}

function collectPinterestImages(value, urls, depth = 0) {
  if (depth > 6 || value == null || urls.length >= 10) return;

  if (typeof value === "string") {
    addUrl(urls, value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectPinterestImages(item, urls, depth + 1);
      if (urls.length >= 10) break;
    }
    return;
  }

  if (typeof value !== "object") return;

  const candidates = [
    value.image,
    value.imagem,
    value.src,
    value.thumbnail,
    value.thumb,
    value.media?.url,
    value.images?.orig?.url,
    value.images?.original?.url,
    value.images?.["736x"]?.url,
    value.images?.["564x"]?.url,
    value.images?.[0]?.url,
  ];

  for (const candidate of candidates) addUrl(urls, candidate);

  const containers = [
    value.pins,
    value.items,
    value.results,
    value.resultados,
    value.result,
    value.resultado,
    value.data,
    value.images,
  ];

  for (const container of containers) {
    collectPinterestImages(container, urls, depth + 1);
    if (urls.length >= 10) break;
  }
}

function imageUrls(data) {
  const urls = [];
  collectPinterestImages(data, urls);

  if (!urls.length) {
    for (const item of tokitoApi.list(data)) {
      collectPinterestImages(item, urls);
      if (urls.length >= 10) break;
    }
  }

  return urls.slice(0, 10);
}

function searchCaption(query, count) {
  return [
    "🖼️ *RESULTADO DA BUSCA*",
    "",
    "🔎 *Busca:* " + query,
    "📸 *Imagens:* " + count,
    "",
    "> " + displayBotName(),
  ].join("\n");
}

async function sendAlbum(conn, msg, from, urls, query) {
  const parent = await conn.sendMessage(from, {
    album: {
      expectedImageCount: urls.length,
      expectedVideoCount: 0,
    },
  }, { quoted: createStatusQuoted(msg) });

  for (let index = 0; index < urls.length; index++) {
    await conn.sendMessage(from, {
      image: { url: urls[index] },
      caption: index === 0 ? searchCaption(query, urls.length) : undefined,
      albumParentKey: parent.key,
    });
  }
}

async function sendSequentialFallback(conn, msg, from, urls, query) {
  for (let index = 0; index < urls.length; index++) {
    await conn.sendMessage(from, {
      image: { url: urls[index] },
      caption: index === 0 ? searchCaption(query, urls.length) : undefined,
    }, index === 0 ? { quoted: createStatusQuoted(msg) } : undefined);
  }
}

module.exports = {
  name: "pin",
  aliases: ["pinterest", "buscarimagem"],
  menuCategory: "Downloads",
  menuSection: "Pinterest",
  usage: "pin termo",
  description: "Pesquisa imagens no Pinterest e envia os resultados em álbum",
  async execute(conn, msg, args, from) {
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: .pin <termo>\nEx.: .pin wallpaper anime",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const data = await tokitoApi.get("/api/pinterest-search", {
        text: query,
        query,
        q: query,
      });

      const urls = imageUrls(data);
      if (!urls.length) {
        throw new Error("Nenhuma imagem encontrada para essa busca.");
      }

      try {
        await sendAlbum(conn, msg, from, urls, query);
      } catch (albumError) {
        console.warn("[PINTEREST ALBUM]", albumError.message);
        await sendSequentialFallback(conn, msg, from, urls.slice(0, 6), query);
      }

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[PINTEREST]", error.message);
      await conn.sendMessage(from, {
        text: tokitoApi.userError(error, "Não foi possível pesquisar no Pinterest."),
      }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: {
    imageUrls,
    collectPinterestImages,
    searchCaption,
  },
};
