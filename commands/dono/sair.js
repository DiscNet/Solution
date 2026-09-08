// Menu: Dono - Grupos | Comando: sair
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  normalizeGroupId,
  ensureOwner,
  readableError,
} = require("../../functions/ownerGroupManager");

module.exports = {
  permissions: { owner: true },
  name: "sair",
  aliases: ["sairgrupo"],
  description: "Faz o bot sair de um grupo pelo ID",
  usage: "sair id@g.us",
  menuCategory: "Dono",
  menuSection: "Grupos",

  async execute(conn, msg, args = [], from) {
    const quoted = createStatusQuoted(msg);
    try {
      if (!ensureOwner(msg)) {
        return conn.sendMessage(from, {
          text: "❌ Apenas o dono pode usar este comando.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const groupId = normalizeGroupId(args[0]);
      if (!groupId) {
        return conn.sendMessage(from, {
          text: `❌ Informe o ID do grupo.\nEx.: ${config.prefix || "."}sair 120363000000000000@g.us`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      let metadata;
      try {
        metadata = await conn.groupMetadata(groupId);
      } catch (error) {
        return conn.sendMessage(from, {
          text: "❌ O bot não participa desse grupo ou o ID está incorreto.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      await conn.groupLeave(groupId);
      return conn.sendMessage(from, {
        text: `🚪 O bot saiu de *${metadata?.subject || "grupo"}*.\n🆔 \`${groupId}\``,
        contextInfo: newsletterContext(),
      }, { quoted });
    } catch (error) {
      console.error("[SAIR]", error);
      return conn.sendMessage(from, {
        text: readableError(error, "sair do grupo"),
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
