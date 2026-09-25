// Menu: Downloads - Pinterest | Comando: pin
const { createStatusQuoted } = require("../../functions/statusCard");
const { generateWAMessageFromContent, prepareWAMessageMedia } = require("@whiskeysockets/baileys");
const tokitoApi = require("../../functions/tokitoApi");

function imageUrls(data) {
  const items = tokitoApi.list(data);
  const urls = [];
  for (const item of items) {
    if (typeof item === "string" && /^https?:\/\//i.test(item) && !urls.includes(item)) urls.push(item);
    const candidates = [
      item?.image, item?.imagem, item?.url, item?.link, item?.src,
      item?.thumbnail, item?.thumb, item?.media?.url, item?.images?.[0]?.url,
    ];
    for (const value of candidates) {
      if (typeof value === "string" && /^https?:\/\//i.test(value) && !urls.includes(value)) urls.push(value);
    }
  }
  return urls.slice(0, 5);
}

module.exports = {
  name: "pin",
  aliases: ["pinterest"],
  menuCategory: "Downloads",
  menuSection: "Pinterest",
  usage: "pin termo",
  description: "Pesquisa imagens no Pinterest pela Tokito API",
  async execute(conn, msg, args, from) {
    const q = args.join(" ").trim();
    if (!q) return conn.sendMessage(from, { text: "❌ Uso: .pin <termo>" }, { quoted: createStatusQuoted(msg) });
    try {
      await conn.sendMessage(from, { react: { text: "📷", key: msg.key } }).catch(() => {});
      const data = await tokitoApi.get("/api/pinterest-search", { text: q });
      const urls = imageUrls(data);
      if (!urls.length) throw new Error("Nenhuma imagem retornada.");
      const cards = [];
      for (let i = 0; i < urls.length; i++) {
        try {
          const media = await prepareWAMessageMedia({ image: { url: urls[i] } }, { upload: conn.waUploadToServer });
          cards.push({
            header: { hasMediaAttachment: true, imageMessage: media.imageMessage },
            body: { text: "📌 " + (i + 1) + "/" + urls.length + " — " + q },
            footer: { text: "Solution • Tokito API" },
            nativeFlowMessage: { buttons: [] },
          });
        } catch {}
      }
      if (!cards.length) throw new Error("Falha ao preparar imagens.");
      const out = generateWAMessageFromContent(from, {
        interactiveMessage: { carouselMessage: { cards, messageVersion: 1, carouselCardType: 1 } },
      }, { quoted: createStatusQuoted(msg) });
      await conn.relayMessage(from, out.message, { messageId: out.key.id });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO PINTEREST]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível pesquisar no Pinterest pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { imageUrls },
};
