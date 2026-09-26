// Menu: Dono - Grupos | Comando: deladm
const h = require("../../functions/adminHelpers");
const { isAdminParticipant } = require("../../functions/permissions");
const {
  senderParticipant,
  participantIdentity,
  readableError,
} = require("../../functions/ownerGroupManager");

module.exports = h.factory({
  name: "deladm",
  aliases: ["tirarmeadm"],
  permissions: { owner: true, group: true, botAdmin: true },
  menuCategory: "Dono",
  menuSection: "Grupos",
  description: "Remove o cargo de administrador do dono do bot",
  usage: "deladm",
}, async ({ conn, msg, from, permission }) => {
  const participant = senderParticipant(permission.metadata, msg);
  h.need(participant, "Não consegui localizar sua identidade entre os participantes do grupo.");

  if (participant.admin === "superadmin") {
    return "⚠️ O criador do grupo não pode ser rebaixado pelo bot.";
  }
  if (!isAdminParticipant(participant)) {
    return "👤 Você já é membro comum deste grupo.";
  }

  try {
    await conn.groupParticipantsUpdate(from, [participantIdentity(participant)], "demote");
    return "🔻 Seu cargo de administrador foi removido.";
  } catch (error) {
    console.error("[DELADM]", error);
    return readableError(error, "rebaixar o dono");
  }
});
