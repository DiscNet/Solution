const store = require("../../functions/tokitoPlaylistSystem");
const tokitoApi = require("../../functions/tokitoApi");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");
const { normalizeYoutubeList, sendYoutubeAudio } = require("../../functions/youtubeResult");

function ownerId(msg, from) {
  return String(kit.senderId(msg, from) || from);
}

function splitPipe(value) {
  return String(value || "").split("|").map(x => x.trim());
}

function trackFromSearch(data) {
  return normalizeYoutubeList(data, tokitoApi.list)[0] || null;
}

async function sendTrack(conn, msg, from, item, index, total) {
  if (!item?.url) throw new Error("Faixa sem URL.");
  const caption = "🎶 *" + item.title + "*\n" +
    (item.channel ? "👤 " + item.channel + "\n" : "") +
    (item.duration ? "⏱️ " + item.duration + "\n" : "") +
    "📀 Faixa " + (index + 1) + "/" + total;
  if (item.thumbnail) {
    await conn.sendMessage(from, { image: { url: item.thumbnail }, caption }, { quoted: createStatusQuoted(msg) }).catch(() => {});
  }
  return sendYoutubeAudio(conn, msg, from, item.url);
}

module.exports = {
  name: "playlist",
  aliases: ["playlists", "pl", "radio"],
  menuCategory: "Downloads",
  menuSection: "Playlist / Rádio",
  usage: "playlist criar nome",
  description: "Cria playlists e toca faixas usando a API",
  async execute(conn, msg, args, from) {
    const owner = ownerId(msg, from);
    const commandText = String(args.join(" ") || "").trim();
    const action = String(args[0] || "").toLowerCase();
    const rest = args.slice(1).join(" ").trim();
    try {
      if (!action || ["ajuda", "help"].includes(action)) {
        return kit.reply(conn, msg, from,
          "🎶 *PLAYLIST / RÁDIO*\n\n" +
          "• .playlist criar nome\n" +
          "• .playlist add nome | música\n" +
          "• .playlist listar\n" +
          "• .playlist ver nome\n" +
          "• .playlist tocar nome\n" +
          "• .playlist proxima\n" +
          "• .playlist anterior\n" +
          "• .playlist status\n" +
          "• .playlist remover nome | índice\n" +
          "• .playlist apagar nome\n" +
          "• .playlist parar" );
      }

      if (action === "criar") {
        const result = store.create(owner, rest);
        if (!result.ok) return kit.reply(conn, msg, from, result.reason === "exists" ? "❌ Essa playlist já existe." : "❌ Nome inválido ou limite atingido.");
        return kit.reply(conn, msg, from, "✅ Playlist *" + result.playlist.name + "* criada.");
      }

      if (["listar", "lista"].includes(action)) {
        const all = store.list(owner);
        if (!all.length) return kit.reply(conn, msg, from, "🎶 Você ainda não criou playlists.");
        const lines = all.map((p, i) => (i + 1) + ". *" + p.name + "* — " + p.tracks.length + " faixa(s)");
        return kit.reply(conn, msg, from, "🎶 *SUAS PLAYLISTS*\n\n" + lines.join("\n"));
      }

      if (action === "add" || action === "adicionar") {
        const [name, query] = splitPipe(rest);
        if (!name || !query) return kit.reply(conn, msg, from, "❌ Uso: .playlist add nome | música");
        const playlist = store.get(owner, name);
        if (!playlist) return kit.reply(conn, msg, from, "❌ Playlist não encontrada.");
        const data = await tokitoApi.get("/api/youtube-search", { query });
        const track = trackFromSearch(data);
        if (!track) return kit.reply(conn, msg, from, "❌ Música não encontrada.");
        const result = store.addTrack(owner, name, track);
        if (!result.ok) return kit.reply(conn, msg, from, result.reason === "duplicate" ? "❌ Essa música já está na playlist." : "❌ Não foi possível adicionar.");
        return kit.reply(conn, msg, from, "✅ *" + track.title + "* adicionada em *" + result.playlist.name + "*.");
      }

      if (action === "ver") {
        const playlist = store.get(owner, rest);
        if (!playlist) return kit.reply(conn, msg, from, "❌ Playlist não encontrada.");
        const tracks = playlist.tracks.length ? playlist.tracks.map((x, i) => (i + 1) + ". " + x.title + (x.duration ? " • " + x.duration : "")).join("\n") : "Vazia";
        return kit.reply(conn, msg, from, "🎶 *" + playlist.name + "*\n\n" + tracks);
      }

      if (action === "remover") {
        const [name, index] = splitPipe(rest);
        const result = store.removeTrack(owner, name, index);
        if (!result.ok) return kit.reply(conn, msg, from, "❌ Playlist ou índice inválido.");
        return kit.reply(conn, msg, from, "🗑️ Removida: *" + result.track.title + "*.");
      }

      if (["apagar", "deletar"].includes(action)) {
        if (!store.removePlaylist(owner, rest)) return kit.reply(conn, msg, from, "❌ Playlist não encontrada.");
        return kit.reply(conn, msg, from, "🗑️ Playlist apagada.");
      }

      if (["tocar", "play"].includes(action)) {
        const playlist = store.get(owner, rest);
        if (!playlist) return kit.reply(conn, msg, from, "❌ Playlist não encontrada.");
        if (!playlist.tracks.length) return kit.reply(conn, msg, from, "❌ Essa playlist está vazia.");
        const s = store.startSession(from, owner, playlist);
        await sendTrack(conn, msg, from, s.tracks[s.index], s.index, s.tracks.length);
        return;
      }

      if (["proxima", "next"].includes(action)) {
        const s = store.move(from, 1);
        if (!s) return kit.reply(conn, msg, from, "❌ Não há próxima faixa.");
        await sendTrack(conn, msg, from, s.tracks[s.index], s.index, s.tracks.length);
        return;
      }

      if (["anterior", "prev"].includes(action)) {
        const s = store.move(from, -1);
        if (!s) return kit.reply(conn, msg, from, "❌ Não há faixa anterior.");
        await sendTrack(conn, msg, from, s.tracks[s.index], s.index, s.tracks.length);
        return;
      }

      if (action === "status") {
        const current = store.current(from);
        if (!current) return kit.reply(conn, msg, from, "🎶 Nenhuma playlist tocando.");
        return kit.reply(conn, msg, from, "🎶 *" + current.session.playlistName + "*\n▶️ " + current.track.title + "\n📀 " + (current.session.index + 1) + "/" + current.session.tracks.length);
      }

      if (["parar", "stop"].includes(action)) {
        store.stop(from);
        return kit.reply(conn, msg, from, "⏹️ Rádio/playlist encerrada.");
      }

      if (msg?.message && String(msg?.message?.conversation || "").toLowerCase().includes("radio")) {
        const playlist = store.get(owner, commandText);
        if (playlist?.tracks?.length) {
          const s = store.startSession(from, owner, playlist);
          await sendTrack(conn, msg, from, s.tracks[0], 0, s.tracks.length);
          return;
        }
      }

      return kit.reply(conn, msg, from, "❌ Ação desconhecida. Use .playlist ajuda.");
    } catch (error) {
      console.error("[PLAYLIST]", error);
      return kit.fail(conn, msg, from, error, "Não foi possível executar a playlist.");
    }
  },
  _internals: { splitPipe, trackFromSearch, sendTrack },
};
