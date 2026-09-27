// Menu: Dono - Grupos | Comando: gerenciar
const config = require("../../../config/config");
const { sendInteractiveMessage } = require("../../functions/uiMode");
const { createStatusQuoted } = require("../../functions/statusCard");
const { isAdminParticipant } = require("../../functions/permissions");
const {
  newsletterContext,
  normalizeGroupId,
  groupStats,
  ownerParticipant,
  participantIdentity,
  findParticipant,
  ensureOwner,
  readableError,
} = require("../../functions/ownerGroupManager");

function userTarget(value) {
  const raw = String(value || "").trim();
  if (/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/.test(raw)) return raw;
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 15
    ? `${digits}@s.whatsapp.net`
    : null;
}

function usage(prefix, groupId, action) {
  const examples = {
    nome: `${prefix}gerenciar ${groupId} nome Novo nome do grupo`,
    descricao: `${prefix}gerenciar ${groupId} descricao Nova descrição`,
    aviso: `${prefix}gerenciar ${groupId} aviso Mensagem para o grupo`,
    promover: `${prefix}gerenciar ${groupId} promover 5511999999999`,
    rebaixar: `${prefix}gerenciar ${groupId} rebaixar 5511999999999`,
    editar: `${prefix}gerenciar ${groupId} editar admins|todos`,
    sair: `${prefix}gerenciar ${groupId} sair confirmar`,
  };
  return examples[action] || `${prefix}gerenciar ${groupId}`;
}

async function metadataOrThrow(conn, groupId) {
  const metadata = await conn.groupMetadata(groupId);
  if (!metadata?.id && !groupId) throw new Error("group not found");
  return metadata;
}

async function groupPicture(conn, groupId) {
  try {
    const url = await conn.profilePictureUrl(groupId, "image");
    return /^https?:\/\//i.test(String(url || "")) ? String(url) : null;
  } catch {
    return null;
  }
}

async function handleAction({ conn, from, msg, args, groupId, metadata, action, prefix }) {
  const quoted = createStatusQuoted(msg);
  const stats = groupStats(metadata, conn);
  const reply = (text) => conn.sendMessage(from, {
    text,
    contextInfo: newsletterContext(),
  }, { quoted });

  switch (action) {
    case "info": {
      const desc = String(metadata.desc || "Sem descrição").slice(0, 1200);
      return reply([
        `📛 *${metadata.subject || "Sem nome"}*`,
        `🆔 \`${groupId}\``,
        `👥 Membros: *${stats.members}*`,
        `👮 Admins: *${stats.admins}*`,
        `🤖 Bot: *${stats.botAdmin ? "admin" : "membro"}*`,
        `🔒 Mensagens: *${stats.closed ? "somente admins" : "todos"}*`,
        `🛠️ Edição: *${stats.restricted ? "somente admins" : "todos"}*`,
        `📝 Descrição: ${desc}`,
      ].join("\n"));
    }

    case "abrir":
      await conn.groupSettingUpdate(groupId, "not_announcement");
      return reply(`🔓 Grupo *${metadata.subject || groupId}* aberto para mensagens de todos.`);

    case "fechar":
      await conn.groupSettingUpdate(groupId, "announcement");
      return reply(`🔒 Grupo *${metadata.subject || groupId}* fechado para mensagens de membros.`);

    case "editar": {
      const mode = String(args[2] || "").toLowerCase();
      if (!["admins", "todos"].includes(mode)) {
        return reply(`ℹ️ Uso: ${usage(prefix, groupId, "editar")}`);
      }
      await conn.groupSettingUpdate(groupId, mode === "admins" ? "locked" : "unlocked");
      return reply(`🛠️ Edição de informações do grupo: *${mode}*.`);
    }

    case "link": {
      const code = await conn.groupInviteCode(groupId);
      return reply(`🔗 *Link do grupo*\nhttps://chat.whatsapp.com/${code}`);
    }

    case "revogarlink":
      await conn.groupRevokeInvite(groupId);
      return reply("🔁 Link anterior revogado. Use a ação *link* para consultar o novo.");

    case "addme": {
      const ownerNumber = String(config.ownerNumber || "").replace(/\D/g, "");
      if (!ownerNumber) return reply("❌ ownerNumber não está configurado no config.js.");
      if (ownerParticipant(metadata)) return reply("ℹ️ O dono já está nesse grupo.");

      const result = await conn.groupParticipantsUpdate(
        groupId,
        [`${ownerNumber}@s.whatsapp.net`],
        "add",
      );
      const status = Number(result?.[0]?.status || 200);
      if (![200, 201].includes(status)) {
        const error = new Error(`add participant status ${status}`);
        error.data = status;
        throw error;
      }
      return reply(`✅ Dono adicionado ao grupo *${metadata.subject || groupId}*.`);
    }

    case "nome": {
      const newName = args.slice(2).join(" ").trim();
      if (!newName) return reply(`ℹ️ Uso: ${usage(prefix, groupId, "nome")}`);
      if (newName.length > 100) return reply("❌ O nome deve ter no máximo 100 caracteres.");
      await conn.groupUpdateSubject(groupId, newName);
      return reply(`✏️ Nome alterado para *${newName}*.`);
    }

    case "descricao": {
      const description = args.slice(2).join(" ").trim();
      if (!description) return reply(`ℹ️ Uso: ${usage(prefix, groupId, "descricao")}`);
      if (description.length > 2048) return reply("❌ A descrição deve ter no máximo 2048 caracteres.");
      await conn.groupUpdateDescription(groupId, description === "-" ? "" : description);
      return reply(description === "-" ? "📝 Descrição removida." : "📝 Descrição atualizada.");
    }

    case "aviso": {
      const notice = args.slice(2).join(" ").trim();
      if (!notice) return reply(`ℹ️ Uso: ${usage(prefix, groupId, "aviso")}`);
      if (notice.length > 3500) return reply("❌ O aviso deve ter no máximo 3500 caracteres.");
      await conn.sendMessage(groupId, {
        text: `📣 *AVISO DO DONO*\n\n${notice}`,
        contextInfo: newsletterContext(),
      });
      return reply(`📣 Aviso enviado para *${metadata.subject || groupId}*.`);
    }

    case "promover":
    case "rebaixar": {
      const target = userTarget(args[2]);
      if (!target) return reply(`ℹ️ Uso: ${usage(prefix, groupId, action)}`);
      const participant = findParticipant(metadata, [target]);
      if (!participant) return reply("❌ Esse usuário não está no grupo.");
      if (action === "rebaixar" && participant.admin === "superadmin") {
        return reply("❌ O criador do grupo não pode ser rebaixado pelo bot.");
      }
      const alreadyAdmin = isAdminParticipant(participant);
      if (action === "promover" && alreadyAdmin) return reply("ℹ️ Esse usuário já é administrador.");
      if (action === "rebaixar" && !alreadyAdmin) return reply("ℹ️ Esse usuário já é membro comum.");
      await conn.groupParticipantsUpdate(
        groupId,
        [participantIdentity(participant)],
        action === "promover" ? "promote" : "demote",
      );
      return reply(action === "promover" ? "👑 Usuário promovido a administrador." : "🔻 Administrador rebaixado a membro.");
    }

    case "foto":
    case "removerfoto":
      await conn.removeProfilePicture(groupId);
      return reply("🖼️ Foto do grupo removida.");

    case "sair":
      if (String(args[2] || "").toLowerCase() !== "confirmar") {
        return reply(`⚠️ Esta ação remove o bot do grupo. Para confirmar:\n${usage(prefix, groupId, "sair")}`);
      }
      await conn.groupLeave(groupId);
      return reply(`🚪 O bot saiu de *${metadata.subject || groupId}*.`);

    default:
      return reply(`❌ Ação inválida. Use ${prefix}gerenciar ${groupId} para abrir o menu.`);
  }
}

module.exports = {
  permissions: { owner: true },
  name: "gerenciar",
  aliases: ["gerenciar-grupo", "gerirgrupo"],
  description: "Gerencia remotamente um grupo em que o bot participa",
  usage: "gerenciar id@g.us [ação]",
  menuCategory: "Dono",
  menuSection: "Grupos",

  async execute(conn, msg, args = [], from) {
    const quoted = createStatusQuoted(msg);
    const prefix = config.prefix || ".";
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
          text: `❌ Informe um ID de grupo válido.\nEx.: ${prefix}gerenciar 120363000000000000@g.us`,
          contextInfo: newsletterContext(),
        }, { quoted });
      }

      const metadata = await metadataOrThrow(conn, groupId);
      const action = String(args[1] || "").toLowerCase();
      if (action) {
        return await handleAction({ conn, from, msg, args, groupId, metadata, action, prefix });
      }

      const stats = groupStats(metadata, conn);
      const rows = [
        {
          title: "📊 Informações",
          rows: [
            { id: `${prefix}gerenciar ${groupId} info`, title: "📊 Ver informações", description: "Membros, admins e configurações" },
            { id: `${prefix}gerenciar ${groupId} link`, title: "🔗 Link do grupo", description: "Gerar/consultar convite" },
          ],
        },
        {
          title: "⚙️ Configurações",
          rows: [
            { id: `${prefix}gerenciar ${groupId} abrir`, title: "🔓 Abrir grupo", description: "Todos podem enviar mensagens" },
            { id: `${prefix}gerenciar ${groupId} fechar`, title: "🔒 Fechar grupo", description: "Somente admins enviam mensagens" },
            { id: `${prefix}gerenciar ${groupId} editar todos`, title: "🛠️ Edição para todos", description: "Todos editam informações" },
            { id: `${prefix}gerenciar ${groupId} editar admins`, title: "🛡️ Edição só admins", description: "Restringe edição do grupo" },
            { id: `${prefix}gerenciar ${groupId} revogarlink`, title: "🔁 Revogar link", description: "Invalida o convite anterior" },
          ],
        },
        {
          title: "👑 Dono e administração",
          rows: [
            { id: `${prefix}gerenciar ${groupId} addme`, title: "➕ Adicionar dono", description: "Usa ownerNumber do config.js" },
            { id: `${prefix}gerenciar ${groupId} promover`, title: "👑 Promover usuário", description: "Mostra como informar o número" },
            { id: `${prefix}gerenciar ${groupId} rebaixar`, title: "🔻 Rebaixar admin", description: "Mostra como informar o número" },
          ],
        },
        {
          title: "✏️ Conteúdo",
          rows: [
            { id: `${prefix}gerenciar ${groupId} nome`, title: "✏️ Trocar nome", description: "Mostra o comando para informar o nome" },
            { id: `${prefix}gerenciar ${groupId} descricao`, title: "📝 Trocar descrição", description: "Use - para apagar" },
            { id: `${prefix}gerenciar ${groupId} aviso`, title: "📣 Enviar aviso", description: "Mostra o comando para escrever o aviso" },
            { id: `${prefix}gerenciar ${groupId} removerfoto`, title: "🖼️ Remover foto", description: "Remove a foto atual do grupo" },
          ],
        },
        {
          title: "🚪 Saída",
          rows: [
            { id: `${prefix}gerenciar ${groupId} sair`, title: "🚪 Sair do grupo", description: "Exige confirmação antes de sair" },
          ],
        },
      ];

      const picture = await groupPicture(conn, groupId);

      return sendInteractiveMessage(conn, from, {
        ...(picture ? { image: { url: picture } } : {}),
        text: [
          "⚙️ *GERENCIAR GRUPO*",
          "",
          `📛 *${metadata.subject || "Sem nome"}*`,
          `🆔 \`${groupId}\``,
          `👥 ${stats.members} membros · 👮 ${stats.admins} admins`,
          `🤖 Bot: *${stats.botAdmin ? "administrador" : "membro"}*`,
          `🔒 Mensagens: *${stats.closed ? "somente admins" : "todos"}*`,
          `🛠️ Edição: *${stats.restricted ? "somente admins" : "todos"}*`,
          "",
          "Selecione uma ação:",
        ].join("\n"),
        footer: `${config.botName || "GrimmJow-WA"} · gerenciar`,
        contextInfo: newsletterContext(),
        interactiveButtons: [
          {
            name: "cta_copy",
            buttonParamsJson: JSON.stringify({
              display_text: "📋 Copiar ID/LID",
              copy_code: groupId,
            }),
          },
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "⚙️ Ações do grupo",
              sections: rows,
            }),
          },
        ],
      }, { quoted });
    } catch (error) {
      console.error("[GERENCIAR]", error);
      return conn.sendMessage(from, {
        text: readableError(error, "gerenciar o grupo"),
        contextInfo: newsletterContext(),
      }, { quoted });
    }
  },
};
