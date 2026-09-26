// Menu: Dono - Grupos | Comando: listg
const config = require("../../../config/config");
const { sendInteractiveMessage } = require("../../functions/uiMode");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  fetchGroups,
  groupStats,
  ensureOwner,
  readableError,
} = require("../../functions/ownerGroupManager");

const PAGE_SIZE = 40;
const ROWS_PER_SECTION = 10;

function sectionsFor(groups, startIndex, prefix, conn) {
  const sections = [];
  for (let i = 0; i < groups.length; i += ROWS_PER_SECTION) {
    const slice = groups.slice(i, i + ROWS_PER_SECTION);
    sections.push({
      title: `📋 Grupos ${startIndex + i + 1}-${startIndex + i + slice.length}`,
      rows: slice.map((group, localIndex) => {
        const index = startIndex + i + localIndex + 1;
        const stats = groupStats(group, conn);
        return {
          id: `${prefix}gerenciar ${group.id}`,
          title: `${index}. ${String(group.subject || "Sem nome").slice(0, 70)}`,
          description: `👥 ${stats.members} · ${stats.botAdmin ? "👮 Bot ADM" : "👤 Bot membro"} · ${stats.closed ? "🔒" : "🔓"}`,
        };
      }),
    });
  }
  return sections;
}

module.exports = {
  permissions: { owner: true },
  name: "listg",
  aliases: ["listagrupos"],
  description: "Lista os grupos em que o bot participa",
  usage: "listg [página]",
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

      const groups = await fetchGroups(conn);
      if (!groups.length) {
        return conn.sendMessage(from, {
          text: "📭 O bot não participa de nenhum grupo.",
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const pages = Math.ceil(groups.length / PAGE_SIZE);
      const requestedPage = args[0] == null ? 1 : Number(args[0]);
      if (!Number.isInteger(requestedPage) || requestedPage < 1 || requestedPage > pages) {
        return conn.sendMessage(from, {
          text: `❌ Página inválida. Use ${config.prefix || "."}listg 1 até ${pages}.`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const prefix = config.prefix || ".";
      const start = (requestedPage - 1) * PAGE_SIZE;
      const pageGroups = groups.slice(start, start + PAGE_SIZE);
      const interactiveButtons = [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "📋 Selecionar grupo",
            sections: sectionsFor(pageGroups, start, prefix, conn),
          }),
        },
      ];

      if (requestedPage > 1) {
        interactiveButtons.push({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "⬅️ Anterior",
            id: `${prefix}listg ${requestedPage - 1}`,
          }),
        });
      }
      if (requestedPage < pages) {
        interactiveButtons.push({
          name: "quick_reply",
          buttonParamsJson: JSON.stringify({
            display_text: "Próxima ➡️",
            id: `${prefix}listg ${requestedPage + 1}`,
          }),
        });
      }

      return sendInteractiveMessage(conn, from, {
        text: `📋 *GRUPOS DO BOT*\n\n📊 Total: *${groups.length}*\n📄 Página: *${requestedPage}/${pages}*\n\nSelecione um grupo para abrir o gerenciamento.`,
        footer: `${config.botName || "GrimmJow-WA"} · listg`,
        contextInfo: newsletterContext(),
        interactiveButtons,
      }, { quoted });
    } catch (error) {
      console.error("[LISTG]", error);
      return conn.sendMessage(from, {
        text: readableError(error, "listar os grupos"),
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
