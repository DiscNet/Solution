// Menu: Utilidades - Perfil | Comando: afk
const afk = require("../../functions/afk");
const { createStatusQuoted } = require("../../functions/statusCard");

module.exports = {
  name: "afk",
  aliases: ["off", "ausente", "away", "on", "ativo", "voltei"],
  description: "ativa ou encerra seu estado AFK no grupo",
  menuCategory: "Utilidades",
  menuSection: "Perfil",
  usage: "afk [motivo] | voltei",
  permissions: { group: true },

  async execute(conn, msg, args, from, axiosInstance, requestedName) {
    try {
      const command = String(requestedName || "afk").toLowerCase();
      const ids = afk.senderIds(msg, from);
      const sender = ids[0];

      if (["afk", "off", "ausente", "away"].includes(command)) {
        const motivo = args.join(" ").trim() || "Sem motivo especificado";
        afk.setAfk(from, ids, motivo);
        return conn.sendMessage(from, {
          text:
            `💤 *@${sender.split("@")[0].split(":")[0]} ficou AFK*\n\n` +
            `📌 Motivo: *${motivo}*\n\n` +
            `> Se alguém mencionar ou responder você, o bot avisará que está ausente. Ao mandar uma mensagem normal, o AFK será removido automaticamente.`,
          mentions: [sender],
        }, { quoted: createStatusQuoted(msg) });
      }

      const item = afk.removeAfk(from, ids);
      if (!item) {
        return conn.sendMessage(from, {
          text: "ℹ️ Você não está AFK neste grupo."
        }, { quoted: createStatusQuoted(msg) });
      }

      const duration = afk.tempo(Date.now() - Number(item.data || Date.now()));
      return conn.sendMessage(from, {
        text:
          `👋 *@${sender.split("@")[0].split(":")[0]} voltou!*\n\n` +
          `⏳ Tempo ausente: *${duration}*`,
        mentions: [sender],
      }, { quoted: createStatusQuoted(msg) });
    } catch (error) {
      console.error("[AFK]", error);
      return conn.sendMessage(from, {
        text: "❌ Não foi possível atualizar seu estado AFK."
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
