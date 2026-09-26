const config = require("../../config/config");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");

function likeToken() { return String(config.tokitoLikeToken || config.tokitoApi || "").trim(); }
function salaToken() { return String(config.tokitoSalaToken || config.tokitoApi || "").trim(); }
function baseUrl() { return tokitoApi.settings().baseUrl; }
function errText(data, fallback = "Não foi possível concluir.") {
  return String(data?.mensagem || data?.message || data?.error || data?.msg || fallback);
}

async function roomGet(route, params = {}) {
  const response = await tokitoApi.axios.get(baseUrl() + "/api/salas/" + route, {
    params: { ...params, apikey: salaToken() },
    timeout: 60000,
    validateStatus: () => true,
  });
  if (response.status < 200 || response.status >= 300 || response.data?.success === false) {
    throw new Error(errText(response.data, "Falha na API de salas."));
  }
  return response.data;
}

function roomCommand(name, aliases, description, handler) {
  return {
    name, aliases, menuCategory: "Free Fire", menuSection: "Salas",
    usage: name, description,
    async execute(conn, msg, args, from) {
      try {
        await conn.sendMessage(from, { react: { text: "🎮", key: msg.key } }).catch(() => {});
        await handler(conn, msg, args, from);
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[API FF ROOM]", name, error.message);
        await conn.sendMessage(from, { text: "❌ " + String(error.message || "Falha na API de salas.").slice(0, 500) }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = [
  {
    name: "likes", aliases: ["fflikes"],
    menuCategory: "Free Fire", menuSection: "API",
    usage: "likes UID", description: "Envia likes para um UID de Free Fire pela API",
    async execute(conn, msg, args, from) {
      const playerId = String(args[0] || "").replace(/\D/g, "");
      if (!playerId) return conn.sendMessage(from, { text: "❌ Uso: .likes <UID>" }, { quoted: createStatusQuoted(msg) });
      try {
        await conn.sendMessage(from, { react: { text: "❤️", key: msg.key } }).catch(() => {});
        const response = await tokitoApi.axios.post(baseUrl() + "/api/v1/likes", { player_id: playerId }, {
          headers: { "x-api-key": likeToken(), "Content-Type": "application/json" },
          timeout: 90000,
          validateStatus: () => true,
        });
        const data = response.data || {};
        if (response.status < 200 || response.status >= 300 || data?.success === false) throw new Error(errText(data, "Não foi possível enviar likes."));
        const before = data?.likes_before ?? data?.before ?? data?.player?.likes_before;
        const after = data?.likes_after ?? data?.after ?? data?.player?.likes_after;
        const added = data?.likes_added ?? data?.added ?? (Number.isFinite(Number(after)) && Number.isFinite(Number(before)) ? Number(after) - Number(before) : null);
        const lines = ["❤️ *FREE FIRE LIKES*", "", "🆔 UID: " + playerId];
        if (added != null) lines.push("➕ Likes enviados: " + added);
        if (after != null) lines.push("👍 Total atual: " + after);
        if (data?.nickname || data?.player?.nickname) lines.push("👤 " + (data.nickname || data.player.nickname));
        await conn.sendMessage(from, { text: lines.join("\n") }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[API FF LIKES]", error.message);
        await conn.sendMessage(from, { text: "❌ " + String(error.message || "Falha no envio de likes.").slice(0, 500) }, { quoted: createStatusQuoted(msg) });
      }
    },
  },

  roomCommand("criarsala", ["ffroom"], "Cria sala de Free Fire pela API", async (conn, msg, args, from) => {
    const parts = args.join(" ").split("|").map(x => x.trim());
    const roomName = parts[0], roomPassword = parts[1], maxPlayers = parts[2] || 12, mode = parts[3] || 1, region = parts[4] || "BR";
    if (!roomName || !roomPassword) throw new Error("Uso: .criarsala NOME | SENHA | JOGADORES | MODO | REGIÃO");
    const data = await roomGet("criar", { roomName, roomPassword, maxPlayers, mode, region });
    const room = data.room || {};
    const id = room.sessionId || data.sessionId || "N/A";
    await conn.sendMessage(from, { text: "🎮 *SALA CRIADA*\n\n🆔 Sessão: " + id + "\n🏷️ " + roomName + "\n🔐 " + roomPassword + "\n👥 Máx.: " + maxPlayers + "\n🌎 " + region }, { quoted: createStatusQuoted(msg) });
  }),

  roomCommand("versala", ["ffroominfo"], "Mostra informações da sala Free Fire", async (conn, msg, args, from) => {
    const sessionId = String(args[0] || "").trim(); if (!sessionId) throw new Error("Uso: .versala SESSION_ID");
    const data = await roomGet("info", { sessionId }); const room = data.room || {};
    await conn.sendMessage(from, { text: "🎮 *SALA*\n\n🆔 " + sessionId + "\n🏷️ " + (room.roomName || room.name || "N/A") + "\n👥 " + (room.currentPlayers ?? room.players?.length ?? 0) + "/" + (room.maxPlayers ?? "?") + "\n📊 " + (room.status || "N/A") }, { quoted: createStatusQuoted(msg) });
  }),

  roomCommand("jogadoressala", ["ffplayers"], "Lista jogadores da sala Free Fire", async (conn, msg, args, from) => {
    const sessionId = String(args[0] || "").trim(); if (!sessionId) throw new Error("Uso: .jogadoressala SESSION_ID");
    const data = await roomGet("jogadores", { sessionId }); const players = Array.isArray(data.players) ? data.players : [];
    const lines = players.map((p, i) => (i + 1) + ". " + (p.nickname || p.name || p.uid || p.playerId || "Jogador"));
    await conn.sendMessage(from, { text: "👥 *JOGADORES DA SALA*\n\n" + (lines.join("\n") || "Nenhum jogador.") }, { quoted: createStatusQuoted(msg) });
  }),

  roomCommand("expulsarsala", ["ffkick"], "Expulsa jogador de sala Free Fire", async (conn, msg, args, from) => {
    const [sessionId, targetUid] = args.join(" ").split("|").map(x => x.trim());
    if (!sessionId || !targetUid) throw new Error("Uso: .expulsarsala SESSION_ID | UID");
    const data = await roomGet("expulsar", { sessionId, targetUid });
    await conn.sendMessage(from, { text: "🚫 Jogador " + targetUid + " removido.\n" + (data.message || "") }, { quoted: createStatusQuoted(msg) });
  }),

  roomCommand("iniciarsala", ["ffstart"], "Inicia uma sala Free Fire", async (conn, msg, args, from) => {
    const sessionId = String(args[0] || "").trim(); if (!sessionId) throw new Error("Uso: .iniciarsala SESSION_ID");
    const data = await roomGet("iniciar", { sessionId });
    await conn.sendMessage(from, { text: "🚀 Sala iniciada.\n" + (data.message || "") }, { quoted: createStatusQuoted(msg) });
  }),

  roomCommand("pararsala", ["ffstop"], "Encerra uma sala Free Fire", async (conn, msg, args, from) => {
    const sessionId = String(args[0] || "").trim(); if (!sessionId) throw new Error("Uso: .pararsala SESSION_ID");
    const data = await roomGet("parar", { sessionId });
    await conn.sendMessage(from, { text: "⛔ Sala encerrada.\n" + (data.message || "") }, { quoted: createStatusQuoted(msg) });
  }),

  roomCommand("statussalas", ["ffstatus"], "Mostra status da API de salas Free Fire", async (conn, msg, args, from) => {
    const data = await roomGet("status", {});
    await conn.sendMessage(from, { text: "📊 *STATUS DAS SALAS*\n\n" + JSON.stringify(data, null, 2).slice(0, 3500) }, { quoted: createStatusQuoted(msg) });
  }),
];

module.exports = commands;
module.exports._test = { likeToken, salaToken, errText };
