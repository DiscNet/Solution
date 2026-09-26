// Menu: Downloads - Spotify | Comando: spotify
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/apiClient");

function isSpotifyUrl(value) {
  return /^https?:\/\/(?:open\.)?spotify\.com\//i.test(String(value || ""));
}

module.exports = {
  name: "spotify",
  aliases: ["sp", "spotify_audio", "spotifymp3"],
  menuCategory: "Downloads",
  menuSection: "Spotify",
  usage: "spotify música ou link",
  description: "Pesquisa ou baixa Spotify por link usando a Tokito API",
  async execute(conn, msg, args, from) {
    const input = args.join(" ").trim();
    if (!input) return conn.sendMessage(from, { text: "❌ Uso: .spotify <música ou link do Spotify>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🎧", key: msg.key } }).catch(() => {});

      if (isSpotifyUrl(input)) {
        await conn.sendMessage(from, {
          audio: { url: tokitoApi.url("/api/downloads/spotify-mp3", { url: input }) },
          mimetype: "audio/mpeg",
          ptt: false,
        }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
        return;
      }

      const data = await tokitoApi.get("/api/spotify-play", { query: input, q: input });
      const m = tokitoApi.firstObject(data) || {};
      const title = m?.titulo || m?.title || input;
      const artist = m?.artista || m?.artist || "";
      const album = m?.album || "";
      const cover = m?.capa || m?.cover || m?.thumbnail || "";
      const spotifyLink = m?.link || m?.url || "";
      const direct = m?.download_url || m?.download || "";

      const caption = `🎧 *SPOTIFY*\n\n🎵 *${title}*${artist ? `\n👤 ${artist}` : ""}${album ? `\n💿 ${album}` : ""}${spotifyLink ? `\n🔗 ${spotifyLink}` : ""}`;
      if (cover) await conn.sendMessage(from, { image: { url: cover }, caption }, { quoted: createStatusQuoted(msg) }).catch(() => {});
      else await conn.sendMessage(from, { text: caption }, { quoted: createStatusQuoted(msg) });

      const audioUrl = direct || (spotifyLink ? tokitoApi.url("/api/downloads/spotify-mp3", { url: spotifyLink }) : "");
      if (!audioUrl) throw new Error("A API não retornou link de áudio.");

      await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[TOKITO SPOTIFY]", error.message);
      await conn.sendMessage(from, { text: "❌ Não foi possível obter essa música pela Tokito API." }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { isSpotifyUrl },
};