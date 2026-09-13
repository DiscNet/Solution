// Menu: Dono - Grupos
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  newsletterContext,
  ensureOwner,
  fetchGroups,
  resolveGroup,
  groupStats,
  readableError,
} = require("../../functions/ownerGroupManager");

function ownerOnly() {
  return { owner: true };
}

function send(conn, msg, from, text) {
  return conn.sendMessage(from, {
    text,
    contextInfo: newsletterContext(),
  }, { quoted: createStatusQuoted(msg) });
}

function groupLine(group, index = null) {
  const prefix = index == null ? "" : `${index}. `;
  return `${prefix}*${group.subject || "Sem nome"}*\n   ID: ${group.id}`;
}

const commands = [
  {
    permissions: ownerOnly(),
    name: "buscargrupo",
    aliases: ["procurargrupo", "findgrupo"],
    description: "Busca um grupo pelo nome ou ID",
    usage: "buscargrupo <nome|id>",
    menuCategory: "Dono",
    menuSection: "Grupos",
    async execute(conn, msg, args = [], from) {
      try {
        if (!ensureOwner(msg)) return send(conn, msg, from, "❌ Apenas o dono pode usar este comando.");
        const query = args.join(" ").trim();
        if (!query) return send(conn, msg, from, "❌ Uso: .buscargrupo <nome ou ID>");

        const groups = await fetchGroups(conn);
        const normalized = query.toLocaleLowerCase("pt-BR");
        const matches = groups.filter((group) =>
          String(group.id || "").includes(query) ||
          String(group.subject || "").toLocaleLowerCase("pt-BR").includes(normalized)
        );

        if (!matches.length) return send(conn, msg, from, "🔎 Nenhum grupo encontrado com essa busca.");

        const shown = matches.slice(0, 15);
        const body = shown.map((group, i) => groupLine(group, i + 1)).join("\n\n");
        const extra = matches.length > shown.length ? `\n\n… e mais ${matches.length - shown.length} resultado(s).` : "";
        return send(conn, msg, from,
          `🔎 *GRUPOS ENCONTRADOS* — ${matches.length}\n\n${body}${extra}\n\nUse *.consultargrupo <ID>* para ver detalhes.`);
      } catch (error) {
        console.error("[BUSCARGRUPO]", error);
        return send(conn, msg, from, readableError(error, "buscar os grupos"));
      }
    },
  },

  {
    permissions: ownerOnly(),
    name: "consultargrupo",
    aliases: ["groupinfo", "detalhesgrupo"],
    description: "Mostra detalhes de um grupo em que o bot participa",
    usage: "consultargrupo <nome|id|índice>",
    menuCategory: "Dono",
    menuSection: "Grupos",
    async execute(conn, msg, args = [], from) {
      try {
        if (!ensureOwner(msg)) return send(conn, msg, from, "❌ Apenas o dono pode usar este comando.");
        const query = args.join(" ").trim();
        if (!query) return send(conn, msg, from, "❌ Uso: .consultargrupo <nome, ID ou número da .listg>");

        const groups = await fetchGroups(conn);
        const resolved = resolveGroup(groups, query);

        if (resolved.reason === "ambiguous") {
          const matches = resolved.matches.slice(0, 10);
          const body = matches.map((group, i) => groupLine(group, i + 1)).join("\n\n");
          return send(conn, msg, from, `⚠️ Encontrei vários grupos. Seja mais específico:\n\n${body}`);
        }
        if (!resolved.group) return send(conn, msg, from, "❌ Grupo não encontrado ou o bot não participa dele.");

        const group = resolved.group;
        const stats = groupStats(group, conn);
        const owner = group.owner ? String(group.owner).split("@")[0] : "Não informado";
        const created = group.creation
          ? new Date(Number(group.creation) * 1000).toLocaleString("pt-BR")
          : "Não informado";

        return send(conn, msg, from,
          `📋 *INFORMAÇÕES DO GRUPO*\n\n` +
          `• Nome: *${group.subject || "Sem nome"}*\n` +
          `• ID: ${group.id}\n` +
          `• Membros: *${stats.members}*\n` +
          `• Admins: *${stats.admins}*\n` +
          `• Bot é ADM: *${stats.botAdmin ? "Sim" : "Não"}*\n` +
          `• Grupo: *${stats.closed ? "Fechado" : "Aberto"}*\n` +
          `• Edição restrita: *${stats.restricted ? "Sim" : "Não"}*\n` +
          `• Dono: ${owner}\n` +
          `• Criado em: ${created}`);
      } catch (error) {
        console.error("[CONSULTARGRUPO]", error);
        return send(conn, msg, from, readableError(error, "consultar o grupo"));
      }
    },
  },

  {
    permissions: ownerOnly(),
    name: "gruposstats",
    aliases: ["statsgrupos", "resumogrupos"],
    description: "Mostra um resumo dos grupos em que o bot está",
    usage: "gruposstats",
    menuCategory: "Dono",
    menuSection: "Grupos",
    async execute(conn, msg, args = [], from) {
      try {
        if (!ensureOwner(msg)) return send(conn, msg, from, "❌ Apenas o dono pode usar este comando.");
        const groups = await fetchGroups(conn);
        let totalMembers = 0;
        let botAdmin = 0;
        let closed = 0;
        let restricted = 0;

        for (const group of groups) {
          const stats = groupStats(group, conn);
          totalMembers += stats.members;
          if (stats.botAdmin) botAdmin++;
          if (stats.closed) closed++;
          if (stats.restricted) restricted++;
        }

        return send(conn, msg, from,
          `📊 *RESUMO DOS GRUPOS*\n\n` +
          `• Grupos: *${groups.length}*\n` +
          `• Soma de participantes: *${totalMembers}*\n` +
          `• Bot é ADM em: *${botAdmin}*\n` +
          `• Grupos abertos: *${groups.length - closed}*\n` +
          `• Grupos fechados: *${closed}*\n` +
          `• Com edição restrita: *${restricted}*`);
      } catch (error) {
        console.error("[GRUPOSSTATS]", error);
        return send(conn, msg, from, readableError(error, "resumir os grupos"));
      }
    },
  },
];

module.exports = commands;
