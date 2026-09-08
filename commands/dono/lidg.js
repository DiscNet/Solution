// Menu: Dono - Grupos | Comando: lidg
const config = require("../../config/config");
const { sendInteractiveMessage } = require("gifted-btns");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  fetchGroups,
  resolveGroup,
  groupStats,
  groupNumber,
  ensureOwner,
  readableError,
} = require("../../functions/ownerGroupManager");

module.exports = {
  permissions: { owner: true },
  name: "lidg",
  aliases: ["idgrupo"],
  description: "Obtém o ID de um grupo por posição, nome ou ID",
  usage: "lidg número|nome|id@g.us",
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

      const query = args.join(" ").trim();
      if (!query) {
        return conn.sendMessage(from, {
          text: `❌ Informe a posição, o nome ou o ID do grupo.\n\nEx.: ${config.prefix || "."}lidg 1\nEx.: ${config.prefix || "."}lidg Meu Grupo\nEx.: ${config.prefix || "."}lidg 120363000000000000@g.us`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const groups = await fetchGroups(conn);
      if (!groups.length) {
        return conn.sendMessage(from, {
          text: "📭 O bot não participa de nenhum grupo.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const resolved = resolveGroup(groups, query);
      if (!resolved.group) {
        if (resolved.reason === "ambiguous") {
          const rows = resolved.matches.slice(0, 10).map((group) => {
            const index = groups.findIndex((item) => item.id === group.id) + 1;
            return `${index}. ${group.subject || "Sem nome"} — ${group.id}`;
          });
          return conn.sendMessage(from, {
            text: `🔎 Encontrei mais de um grupo. Use o número da lista:\n\n${rows.join("\n")}`,
            contextInfo: newsletterContext(),
          }, { quoted });
        }
        return conn.sendMessage(from, {
          text: `❌ Grupo não encontrado. Use ${config.prefix || "."}listg para ver a lista atual.`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const group = resolved.group;
      let metadata = group;
      try {
        metadata = await conn.groupMetadata(group.id);
      } catch (_) {}

      const stats = groupStats(metadata, conn);
      const index = groups.findIndex((item) => item.id === group.id) + 1;
      const creation = Number(metadata?.creation);
      const createdAt = Number.isFinite(creation) && creation > 0
        ? new Date(creation * 1000).toLocaleDateString("pt-BR")
        : "indisponível";

      const text = [
        "🔎 *INFORMAÇÕES DO GRUPO*",
        "",
        `#️⃣ Posição: *${index}*`,
        `📛 Nome: *${metadata?.subject || group.subject || "Sem nome"}*`,
        `🆔 ID completo: \`${group.id}\``,
        `🔢 ID numérico: \`${groupNumber(group.id)}\``,
        `👥 Membros: *${stats.members}*`,
        `👮 Administradores: *${stats.admins}*`,
        `🤖 Bot: *${stats.botAdmin ? "administrador" : "membro"}*`,
        `🔒 Mensagens: *${stats.closed ? "somente admins" : "todos"}*`,
        `🛠️ Edição: *${stats.restricted ? "somente admins" : "todos"}*`,
        `📅 Criado em: *${createdAt}*`,
        "",
        `⚙️ Gerenciar: ${config.prefix || "."}gerenciar ${group.id}`,
      ].join("\n");

      return sendInteractiveMessage(conn, from, {
        text,
        footer: `${config.botName || "GrimmJow-WA"} · lidg`,
        contextInfo: newsletterContext(),
        interactiveButtons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copiar ID",
              copy_code: group.id,
            }),
          },
          {
            name: "quick_reply",
            buttonParamsJson: JSON.stringify({
              display_text: "⚙️ Gerenciar",
              id: `${config.prefix || "."}gerenciar ${group.id}`,
            }),
          },
        ],
      }, { quoted });
    } catch (error) {
      console.error("[LIDG]", error);
      return conn.sendMessage(from, {
        text: readableError(error, "consultar o grupo"),
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
