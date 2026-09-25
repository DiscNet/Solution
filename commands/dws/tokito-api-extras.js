const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

function firstYoutube(data) {
  return tokitoApi.list(data).find(item => item?.url || item?.link || item?.videoId) || tokitoApi.list(data)[0] || null;
}

module.exports = [
  {
    name: "playdoc",
    aliases: ["ytdoc"],
    menuCategory: "Downloads",
    menuSection: "YouTube",
    usage: "playdoc música ou link",
    description: "Baixa áudio do YouTube como documento pela Tokito API",
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
        console.error("[TOKITO PLAYDOC]", error.message);
        await conn.sendMessage(from, { text: "❌ Não foi possível gerar o documento de áudio." }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "tiktokfoto",
    aliases: ["tiktok_foto", "ttfoto"],
    menuCategory: "Downloads",
    menuSection: "TikTok",
    usage: "tiktokfoto link",
    description: "Baixa fotos de publicação do TikTok pela Tokito API",
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
        console.error("[TOKITO TIKTOK FOTO]", error.message);
        await conn.sendMessage(from, { text: "❌ Não foi possível baixar as fotos desse TikTok." }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "metadinha",
    aliases: ["metade"],
    menuCategory: "Brincadeiras",
    menuSection: "Imagens",
    usage: "metadinha",
    description: "Obtém uma metadinha pela Tokito API",
    async execute(conn, msg, args, from) {
      try {
        const result = await tokitoApi.buffer("/api/metadinha", {}, { timeout: 60000 });
        if (/image\//i.test(result.contentType)) {
          await conn.sendMessage(from, { image: result.buffer, caption: "💞 *METADINHA*" }, { quoted: createStatusQuoted(msg) });
          return;
        }
        const parsed = JSON.parse(result.buffer.toString("utf8"));
        const item = tokitoApi.firstObject(parsed) || parsed;
        const image = item?.url || item?.image || item?.imagem || item?.link;
        if (!image) throw new Error("Imagem não retornada.");
        await conn.sendMessage(from, { image: { url: image }, caption: "💞 *METADINHA*" }, { quoted: createStatusQuoted(msg) });
      } catch (error) {
        console.error("[TOKITO METADINHA]", error.message);
        await conn.sendMessage(from, { text: "❌ Não foi possível gerar a metadinha." }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports._test = { firstYoutube };
