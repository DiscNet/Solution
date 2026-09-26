// Menu: Dono - Grupos | Comando: seradm
const h = require("../../functions/adminHelpers");
const { isAdminParticipant } = require("../../functions/permissions");
const {
  senderParticipant,
  participantIdentity,
  readableError,
} = require("../../functions/ownerGroupManager");

module.exports = h.factory({
  name: "seradm",
  aliases: ["meadm"],
  permissions: { owner: true, group: true, botAdmin: true },
  menuCategory: "Dono",
  menuSection: "Grupos",
  description: "Promove o dono do bot a administrador do grupo",
  usage: "seradm",
}, async ({ conn, msg, from, permission }) => {
  const participant = senderParticipant(permission.metadata, msg);
  h.need(participant, "Não consegui localizar sua identidade entre os participantes do grupo.");

  if (isAdminParticipant(participant)) {
    return participant.admin === "superadmin"
      ? "👑 Você é o criador deste grupo."
      : "👑 Você já é administrador deste grupo.";
  }

  try {
    await conn.groupParticipantsUpdate(from, [participantIdentity(participant)], "promote");
    return "👑 Você foi promovido a administrador do grupo.";
  } catch (error) {
    console.error("[SERADM]", error);
    return readableError(error, "promover o dono");
  }
});
