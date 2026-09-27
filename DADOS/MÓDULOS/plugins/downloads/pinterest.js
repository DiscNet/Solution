// Menu: Downloads - Pinterest | Comando: pin
const config = require("../../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const { proto, generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");
const axios = require("axios");
const tokitoApi = require("../../functions/apiClient");

function displayBotName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function addUrl(urls, value) {
  const url = String(value || "").trim();
  if (!/^https?:\/\//i.test(url)) return;
  if (/^https?:\/\/(?:www\.)?pinterest\.[^/]+\/(?:pin|search)\//i.test(url)) return;
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
    value.images?.orig?.url,
    value.images?.original?.url,
    value.images?.["736x"]?.url,
    value.images?.["564x"]?.url,
    value.images?.[0]?.url,
    value.image_url,
    value.imageUrl,
    value.image?.url,
    value.imagem?.url,
    value.image,
    value.imagem,
    value.media?.image?.url,
    value.media?.url,
    value.src,
    value.thumbnail,
    value.thumb,
    value.url,
  ];

  // Um resultado é um card. Evita repetir o mesmo pin em resoluções distintas.
  const candidate = candidates.find(item => typeof item === "string" && /^https?:\/\//i.test(item));
  if (candidate) addUrl(urls, candidate);

  const containers = [
    value.pins,
    value.items,
    value.results,
    value.resultados,
    value.result,
    value.resultado,
    value.data,
    ...(candidate ? [] : [value.images, value.image, value.imagem, value.media]),
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

async function searchPinterestDirect(query) {
  const userAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/124.0 Safari/537.36";
  const home = await axios.get("https://www.pinterest.com/", {
    timeout: 15000,
    headers: { "user-agent": userAgent },
  });
  const cookie = (home.headers?.["set-cookie"] || [])
    .map(value => String(value).split(";")[0])
    .join("; ");

  const response = await axios.get("https://www.pinterest.com/resource/BaseSearchResource/get/", {
    timeout: 30000,
    headers: {
      "user-agent": userAgent,
      referer: "https://www.pinterest.com/",
      "x-requested-with": "XMLHttpRequest",
      ...(cookie ? { cookie } : {}),
    },
    params: {
      source_url: "/search/pins/?q=" + encodeURIComponent(query),
      data: JSON.stringify({ options: {
        isPrefetch: false, query, scope: "pins", bookmarks: [""], page_size: 25,
      }, context: {} }),
    },
  });
  return imageUrls(response.data?.resource_response?.data?.results || []);
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

async function sendCarousel(conn, msg, from, urls, query) {
  const cards = [];

  for (let index = 0; index < urls.length; index++) {
    try {
      const media = await prepareWAMessageMedia(
        { image: { url: urls[index] } },
        { upload: conn.waUploadToServer }
      );

      cards.push(proto.Message.InteractiveMessage.fromObject({
        header: { hasMediaAttachment: true, ...media },
        body: { text: "📌 Pinterest · " + (cards.length + 1) + "/" + urls.length },
        footer: { text: displayBotName() },
        nativeFlowMessage: {
          buttons: [{
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "Abrir imagem",
              url: urls[index],
              merchant_url: urls[index],
            }),
          }],
          messageVersion: 1,
        },
      }));
    } catch (error) {
      console.warn("[PINTEREST CARD]", index + 1, error.message);
    }
  }

  if (cards.length < 2) throw new Error("Não foi possível preparar o carrossel.");

  const generated = generateWAMessageFromContent(from, {
    viewOnceMessage: {
      message: {
        messageContextInfo: {
          deviceListMetadata: {},
          deviceListMetadataVersion: 2,
        },
        interactiveMessage: proto.Message.InteractiveMessage.fromObject({
          header: { hasMediaAttachment: false },
          body: { text: "🖼️ *RESULTADOS DO PINTEREST*\n\n🔎 " + query + "\nDeslize para ver as imagens." },
          footer: { text: displayBotName() },
          carouselMessage: { cards, messageVersion: 1 },
        }),
      },
    },
  }, {
    quoted: createStatusQuoted(msg),
  });

  return conn.relayMessage(from, generated.message, {
    messageId: generated.key.id,
  });
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
  description: "Pesquisa imagens no Pinterest e envia os resultados em carrossel",
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

      let urls = [];
      try {
        const data = await tokitoApi.get("/api/pinterest-search", {
          text: query,
          query,
          q: query,
        });
        urls = imageUrls(data);
      } catch (error) {
        console.warn("[PINTEREST API]", tokitoApi.errorInfo(error).message);
      }

      if (urls.length < 2) {
        try {
          const directUrls = await searchPinterestDirect(query);
          urls = [...new Set([...urls, ...directUrls])].slice(0, 10);
        } catch (error) {
          if (!urls.length) throw error;
          console.warn("[PINTEREST DIRETO]", error.message);
        }
      }
      if (!urls.length) {
        throw new Error("Nenhuma imagem encontrada para essa busca.");
      }

      try {
        await sendCarousel(conn, msg, from, urls, query);
      } catch (carouselError) {
        console.warn("[PINTEREST CAROUSEL]", carouselError.message);

        try {
          await sendAlbum(conn, msg, from, urls, query);
        } catch (albumError) {
          console.warn("[PINTEREST ALBUM]", albumError.message);
          await sendSequentialFallback(conn, msg, from, urls.slice(0, 6), query);
        }
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
    sendCarousel,
    searchPinterestDirect,
  },
};
