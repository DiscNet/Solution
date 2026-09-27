// Menu: Downloads - Spotify | Comando: spotify
const axios = require("axios");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/apiClient");

function isSpotifyUrl(value) {
  return /^https?:\/\/(?:open\.)?spotify\.com\//i.test(String(value || ""));
}

function field(value, fallback = "") {
  if (Array.isArray(value)) return value.map(item => field(item)).filter(Boolean).join(", ") || fallback;
  if (value && typeof value === "object") return field(value.name || value.title || value.url, fallback);
  return String(value ?? fallback).trim() || fallback;
}

function imageUrl(value) {
  if (Array.isArray(value)) return imageUrl(value[0]);
  const text = field(value);
  return /^https?:\/\//i.test(text) ? text : "";
}

function duration(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const seconds = Math.floor(value > 10000 ? value / 1000 : value);
    return Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");
  }
  return field(value);
}

function trackInfo(data, input) {
  const track = tokitoApi.firstObject(data) || {};
  return {
    title: field(track.titulo || track.title || track.name, input),
    artist: field(track.artista || track.artist || track.artists, "Desconhecido"),
    album: field(track.album || track.album_name, "Não informado"),
    duration: duration(track.duracao || track.duration || track.duration_ms) || "Não informada",
    popularity: field(track.popularidade ?? track.popularity, "Não informada"),
    release: field(track.lancamento || track.release_date_formatado || track.release_date, "Não informado"),
    releaseAt: field(track.release_at || track.releaseAt),
    link: imageUrl(track.link || track.spotify_url || track.url) || (isSpotifyUrl(input) ? input : ""),
    cover: imageUrl(track.capa || track.cover || track.image || track.thumbnail),
    audio: imageUrl(track.download_url || track.downloadUrl || track.audio || track.url_audio || track.download),
  };
}

async function resolveTrack(input) {
  if (!isSpotifyUrl(input)) {
    const data = await tokitoApi.get("/api/spotify-search", { q: input, limit: 5 }, { timeout: 30000 });
    const item = tokitoApi.list(data).find(value => value?.url || value?.link);
    if (!item) throw new Error("Nenhuma música encontrada para essa busca.");
    return trackInfo(item, input);
  }

  // O oEmbed identifica a faixa por link. A busca online complementa o card
  // com álbum, duração e data quando encontra exatamente a mesma faixa.
  const response = await axios.get("https://open.spotify.com/oembed", {
    params: { url: input },
    timeout: 15000,
  }).catch(() => ({ data: {} }));
  const info = response.data || {};
  const fallback = {
    ...trackInfo(info, input),
    title: field(info.title, "Música do Spotify"),
    artist: field(info.author_name, "Desconhecido"),
    cover: imageUrl(info.thumbnail_url),
    link: input,
  };

  try {
    if (!info.title) return fallback;
    const data = await tokitoApi.get("/api/spotify-search", {
      q: [info.title, info.author_name].filter(Boolean).join(" "), limit: 10,
    }, { timeout: 30000 });
    const id = input.match(/\/track\/([a-zA-Z0-9]+)/)?.[1];
    const item = tokitoApi.list(data).find(value => {
      const link = String(value?.url || value?.link || "");
      return id && link.includes("/track/" + id);
    });
    if (!item) return fallback;
    return { ...trackInfo(item, input), link: input, cover: imageUrl(item.thumbnail) || fallback.cover };
  } catch (error) {
    console.warn("[SPOTIFY INFO]", tokitoApi.errorInfo(error).message);
    return fallback;
  }
}

function infoCaption(track) {
  return [
    "╭─〔 🎧 SPOTIFY 〕",
    "├̬⌑ؔ͟ 🎵 *Título:* " + track.title,
    "├̬⌑ؔ͟ 👤 *Artista:* " + track.artist,
    "├̬⌑ؔ͟ 💿 *Álbum:* " + track.album,
    "├̬⌑ؔ͟ ⏱️ *Duração:* " + track.duration,
    "├̬⌑ؔ͟ 🔥 *Popularidade:* " + track.popularity,
    "├̬⌑ؔ͟ 📆 *Lançamento:* " + track.release,
    ...(track.releaseAt ? ["├̬⌑ؔ͟ 🗓️ *Data:* " + track.releaseAt] : []),
    ...(track.link ? ["├̬⌑ؔ͟ 🔗 *Link:* " + track.link] : []),
    "╰─〔 🎼 Enviando o áudio 〕",
  ].join("\n");
}

async function sendTrackInfo(conn, msg, from, track) {
  const caption = infoCaption(track);
  if (track.cover) {
    try {
      return await conn.sendMessage(from, {
        image: { url: track.cover }, caption,
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.warn("[SPOTIFY CAPA]", error.message);
    }
  }
  return conn.sendMessage(from, { text: caption }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "spotify",
  aliases: ["sp", "spotify_audio", "spotifymp3"],
  menuCategory: "Downloads",
  menuSection: "Spotify",
  usage: "spotify música ou link",
  description: "Mostra as informações da música e envia o áudio",
  async execute(conn, msg, args, from) {
    const input = args.join(" ").trim();
    if (!input) return conn.sendMessage(from, { text: "❌ Uso: .spotify <música ou link do Spotify>" }, { quoted: createStatusQuoted(msg) });

    try {
      await conn.sendMessage(from, { react: { text: "🎧", key: msg.key } }).catch(() => {});
      const track = await resolveTrack(input);
      await sendTrackInfo(conn, msg, from, track);

      const audioUrl = track.audio || (track.link
        ? tokitoApi.url("/api/downloads/spotify-mp3", { url: track.link })
        : "");
      if (!audioUrl) throw new Error("A API não retornou link de áudio.");

      await conn.sendMessage(from, {
        audio: { url: audioUrl },
        mimetype: "audio/mpeg",
        fileName: (track.title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "spotify") + ".mp3",
        ptt: false,
      }, { quoted: createStatusQuoted(msg) });
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
    } catch (error) {
      console.error("[SPOTIFY]", tokitoApi.errorInfo(error).message);
      await conn.sendMessage(from, { text: tokitoApi.userError(error, "Não foi possível obter essa música.") }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { isSpotifyUrl, trackInfo, infoCaption, resolveTrack },
};
