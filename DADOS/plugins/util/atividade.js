// Menu: Utilidades - Estatísticas | Comando: atividade
const activity = require("../../functions/activitySystem");
const { messageContext } = require("../../functions/profilePicture");
const { createStatusQuoted } = require("../../functions/statusCard");

function senderIds(msg, from) {
  const ctx = messageContext(msg);
  const mentioned = Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid : [];
  if (mentioned.length) return mentioned;
  if (ctx?.quotedMessage) return [ctx.participantAlt, ctx.participant].filter(Boolean);
  return [
    msg?.key?.participantAlt,
    msg?.key?.participant,
    msg?.key?.remoteJidAlt,
    !String(from).endsWith("@g.us") ? msg?.key?.remoteJid : null,
  ].filter(Boolean);
}

module.exports = {
  name: "atividade",
  aliases: ["atv", "minhaatividade"],
  description: "mostra a atividade de um membro no grupo",
  menuCategory: "Utilidades",
  menuSection: "Estatísticas",
  usage: "atividade [@usuario]",
  permissions: { group: true },

  async execute(conn, msg, args, from) {
    try {
      const ids = senderIds(msg, from);
      const target = ids[0];
      const stats = activity.statsFor(from, ids);
      if (!target) {
        return conn.sendMessage(from, { text: "❌ Não consegui identificar o usuário." }, { quoted: msg });
      }

      return conn.sendMessage(from, {
        text:
          `📊 *ᴀᴛɪᴠɪᴅᴀᴅᴇ ᴅᴇ @${target.split("@")[0].split(":")[0]}*\n\n` +
          `⚡ Pontos: *${stats.pontos}*\n` +
          `💬 Mensagens: *${stats.total}*\n` +
          `🤖 Comandos: *${stats.comandos}*\n` +
          `🎵 Áudios: *${stats.audios}*\n` +
          `🧩 Figurinhas: *${stats.figurinhas}*\n` +
          `📄 Documentos: *${stats.documentos}*\n` +
          `🖼️ Fotos: *${stats.fotos}*\n` +
          `🎞️ Vídeos: *${stats.videos}*\n` +
          `⌨️ Textos: *${stats.textos}*\n` +
          `🕒 Última atividade: *${activity.formatLast(stats.ultima)}*\n\n` +
          `> Pontos seguem o modelo Tokito: comandos + mídias.`,
        mentions: [target],
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[ATIVIDADE]", error);
      return conn.sendMessage(from, { text: "❌ Não foi possível consultar a atividade." }, { quoted: msg });
    }
  },
};
