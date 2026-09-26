// Menu: Utilidades - Estatísticas | Comando: rankativo
const activity = require("../../functions/activitySystem");
const { createStatusQuoted } = require("../../functions/statusCard");

function keys(participant) {
  if (!participant) return [];
  return [...new Set([
    participant.phoneNumber,
    participant.id,
    participant.jid,
    participant.participant,
    typeof participant === "string" ? participant : null,
  ].filter(Boolean).map(String))];
}

function tag(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

async function currentRows(conn, from) {
  const metadata = await conn.groupMetadata(from);
  return (metadata?.participants || []).map((participant) => {
    const ids = keys(participant);
    const stats = activity.statsFor(from, ids);
    return {
      jid: ids[0] || "",
      ids,
      admin: Boolean(participant?.admin),
      ...stats,
    };
  });
}

module.exports = {
  name: "rankativo",
  aliases: ["rankatv", "rankingativo"],
  description: "mostra os membros realmente mais ativos do grupo",
  menuCategory: "Utilidades",
  menuSection: "Estatísticas",
  usage: "rankativo",
  permissions: { group: true },

  async execute(conn, msg, args, from) {
    try {
      const rows = await currentRows(conn, from);
      const ranking = rows
        .filter((item) => item.jid)
        .sort((a, b) => b.pontos - a.pontos || b.total - a.total || b.ultima - a.ultima)
        .slice(0, 10);

      if (!ranking.length) {
        return conn.sendMessage(from, {
          text: "⚡ Ainda não há atividade registrada neste grupo."
        }, { quoted: createStatusQuoted(msg) });
      }

      const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
      const mentions = ranking.map((item) => item.jid);
      const lines = ranking.map((item, index) =>
        `${medals[index]} *${tag(item.jid)}*\n` +
        `   ⚡ ${item.pontos} pontos • 💬 ${item.total} mensagens\n` +
        `   🤖 ${item.comandos} cmd • 🖼️ ${item.fotos} foto • 🎞️ ${item.videos} vídeo\n` +
        `   🎵 ${item.audios} áudio • 🧩 ${item.figurinhas} sticker\n` +
        `   🕒 ${activity.formatLast(item.ultima)}`
      );

      return conn.sendMessage(from, {
        text:
          `⚡ *ʀᴀɴᴋ ᴅᴇ ᴀᴛɪᴠɪᴅᴀᴅᴇ*\n\n` +
          `${lines.join("\n\n━━━━━━━━━━━━━━━━━━━━\n\n")}\n\n` +
          `> Pontos = comandos + áudios + stickers + documentos + fotos + vídeos.`,
        mentions,
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[RANKATIVO]", error);
      return conn.sendMessage(from, {
        text: "❌ Não foi possível gerar o ranking de atividade."
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _internals: { keys, currentRows },
};
