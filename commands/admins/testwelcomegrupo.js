// Menu: Grupos - Configuração | Comando: testwelcomegrupo
const h = require("../../functions/adminHelpers");
const { sendGroupWelcomeBanner } = require("../../functions/groupWelcomeBanner");
const contactNameCache = require("../../functions/contactNameCache");
const bemvindoFunctions = require("../../functions/bemvindo");

module.exports = h.factory(
  {
    name: "testwelcomegrupo",
    aliases: ["testbemvindo", "testboasvindas", "testgwelcome"],
    permissions: { group: true, admin: true },
    menuCategory: "Grupos",
    menuSection: "Configuração",
    usage: "testwelcomegrupo",
    description: "Testa o welcome real do grupo, incluindo resolução de nome, fotos e banner.",
  },
  async ({ conn, msg, from }) => {
    contactNameCache.rememberMessage(msg);

    const participant = {
      id: msg.key?.participant || msg.key?.remoteJid,
      phoneNumber: msg.key?.participantAlt || "",
      jid: msg.key?.participant || "",
      pushName: msg.pushName || msg.pushname || msg.notify || "",
      notify: msg.notify || "",
    };

    const currentName = contactNameCache.get([
      participant.id,
      participant.phoneNumber,
      participant.jid,
    ]);

    await sendGroupWelcomeBanner(conn, {
      groupJid: from,
      participant,
    });

    const enabled = bemvindoFunctions.isBemvindoAtivo(from);
    return (
      "✅ Teste de boas-vindas concluído.\n\n" +
      "• Sistema automático neste grupo: " + (enabled ? "ATIVADO" : "DESATIVADO") + "\n" +
      "• Nome detectado: " + (currentName || participant.pushName || "não disponível") + "\n" +
      "• O banner acima foi gerado pelo mesmo sistema usado quando um membro entra."
    );
  }
);
