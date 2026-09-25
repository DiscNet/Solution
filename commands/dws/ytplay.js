// Menu: Downloads - YouTube | Comando: ytplay
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { normalizeYoutubeList, normalizeYoutubeItem, sendYoutubeChoice } = require("../../functions/youtubeResult");
const { getVideo } = require("../../functions/youtubeClient");

async function resolveVideo(query) {
  const input = String(query || "").trim();

  if (!/^https?:\/\//i.test(input)) {
    try {
      const data = await tokitoApi.get("/api/youtube-search", {
        query: input,
        q: input,
        text: input,
      }, { timeout: 30000 });

      const [first] = normalizeYoutubeList(data, tokitoApi.list);
      if (first?.url) return first;
    } catch (error) {
      console.warn("[YTPLAY SEARCH API]", error?.message || error);
    }
  }

  const local = await getVideo(input).catch(() => null);
  if (local?.url) return normalizeYoutubeItem(local);

  if (/^https?:\/\//i.test(input)) {
    return normalizeYoutubeItem({
      url: input,
      title: "Vídeo do YouTube",
      channel: "",
      duration: "",
    });
  }

  return null;
}

module.exports = {
  name: "ytplay",
  aliases: ["ytinfo"],
  menuCategory: "Downloads",
  menuSection: "YouTube",
  usage: "ytplay termo ou link",
  description: "Mostra informações do vídeo e botões para áudio ou vídeo",

  async execute(conn, msg, args, from) {
    const prefix = config.prefix || ".";
    const query = args.join(" ").trim();

    if (!query) {
      return conn.sendMessage(from, {
        text: "❌ Uso: " + prefix + "ytplay <nome ou link do vídeo>",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🎬", key: msg.key },
      }).catch(() => {});

      const video = await resolveVideo(query);
      if (!video?.url) throw new Error("Vídeo não encontrado.");

      await sendYoutubeChoice(conn, msg, from, video);

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[YTPLAY]", error?.message || error);

      await conn.sendMessage(from, {
        text: "❌ Não foi possível abrir esse vídeo.",
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _internals: {
    resolveVideo,
  },
};
