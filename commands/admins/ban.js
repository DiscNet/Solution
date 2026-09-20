// Menu: Grupos - Membros
const h = require("../../functions/adminHelpers");
const { sameIdentity, isOwner } = require("../../functions/permissions");

function actionJids(participant) {
  const values = [
    participant?.phoneNumber,
    participant?.jid,
    participant?.id,
    participant?.lid,
  ].filter(Boolean);

  const unique = [...new Set(values)];
  return [
    ...unique.filter(jid => String(jid).endsWith("@s.whatsapp.net")),
    ...unique.filter(jid => String(jid).endsWith("@lid")),
    ...unique.filter(jid =>
      !String(jid).endsWith("@s.whatsapp.net") &&
      !String(jid).endsWith("@lid")
    ),
  ];
}

function actionJid(participant) {
  return actionJids(participant)[0] || "";
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

    const candidates = actionJids(p);
    h.need(candidates.length, "Não foi possível identificar o membro para remover.");

    let lastError = null;
    let confirmed = false;

    for (const jid of candidates) {
      try {
        const results = await conn.groupParticipantsUpdate(from, [jid], "remove");
        if (removalConfirmed(results)) {
          confirmed = true;
          break;
        }
        lastError = new Error("O WhatsApp não confirmou a remoção para " + jid);
      } catch (error) {
        lastError = error;
      }
    }

    h.need(
      confirmed,
      "Não foi possível remover o membro. Confira se o bot ainda é administrador e se o usuário continua no grupo."
    );

    return "✅ Membro removido do grupo.";
  }
);

module.exports._internals = {
  actionJid,
  actionJids,
  removalConfirmed,
};
