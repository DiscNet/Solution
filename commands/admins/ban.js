// Menu: Grupos - Membros
const h = require("../../functions/adminHelpers");
const { sameIdentity, isOwner } = require("../../functions/permissions");

function actionJid(participant) {
  return (
    participant?.phoneNumber ||
    participant?.jid ||
    participant?.id ||
    participant?.lid ||
    ""
  );
}

function removalConfirmed(results) {
  if (results == null) return true;
  if (!Array.isArray(results)) return true;
  if (!results.length) return true;

  return results.every(item => {
    const status = String(item?.status ?? "");
    return status === "" || status === "200";
  });
}

module.exports = h.factory(
  {
    name: "ban",
    aliases: ["kick", "remover"],
    permissions: { group: true, admin: true, botAdmin: true },
    menuCategory: "Grupos",
    menuSection: "Membros",
    usage: "ban @usuario",
    description: "Uso: .ban @usuario",
  },
  async ({ conn, msg, args, from }) => {
    const { p } = await h.resolveMember(conn, from, msg, args);

    h.need(
      p.admin !== "superadmin",
      "O criador do grupo não pode ser removido."
    );

    h.need(
      !h.values(p).some(v =>
        [conn.user?.id, conn.user?.lid].some(bot => sameIdentity(v, bot))
      ),
      "Não é permitido remover o próprio bot."
    );

    h.need(
      !h.values(p).some(v => isOwner({ key: { remoteJid: v } })),
      "Não é permitido remover o dono do bot."
    );

    const jid = actionJid(p);
    h.need(jid, "Não foi possível identificar o membro para remover.");

    const results = await conn.groupParticipantsUpdate(from, [jid], "remove");

    h.need(
      removalConfirmed(results),
      "O WhatsApp não confirmou a remoção. Confira se o bot ainda é administrador e tente novamente."
    );

    return "✅ Membro removido do grupo.";
  }
);

module.exports._internals = {
  actionJid,
  removalConfirmed,
};
