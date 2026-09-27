// Menu: Grupos - Moderação | Comando: autoban
const h = require("../../functions/adminHelpers");
const state = require("../../functions/adminState");
const ui = require("../../functions/ui");
const { isEnabled } = require("../../functions/groupAutoban");
const { isAdminParticipant, participantMatches, botIdentityCandidates } = require("../../functions/permissions");
const config = require("../../../config/config");

module.exports = h.factory({
  name: "autoban",
  aliases: [],
  permissions: { group: true, admin: true },
  menuCategory: "Grupos",
  menuSection: "Moderação",
  usage: "autoban 1|0",
  description: "Remove membros ao atingir o limite de advertências ou violar um filtro anti",
}, async ({ args, from, conn, permission }) => {
  const choice = String(args[0] || "").toLowerCase();
  if (["1", "on", "ativar"].includes(choice)) {
    const bot = (permission.metadata?.participants || []).find(item =>
      participantMatches(item, botIdentityCandidates(conn)));
    h.need(isAdminParticipant(bot), ui.permissionMessage("BOT_ADMIN_REQUIRED"));
    state.update(data => { state.group(data, from).autoban = true; });
  } else if (["0", "off", "desativar"].includes(choice)) {
    state.update(data => { state.group(data, from).autoban = false; });
  } else if (choice) {
    h.need(false, `Use ${config.prefix || "."}autoban 1 ou 0.`);
  }
  return ui.adminCard("Autoban", [
    ui.adminRow("🛡️", "Estado", ui.smallcaps(isEnabled(from) ? "ativo" : "inativo")),
    ui.adminRow("⚠️", "Advertências", `${state.groupSettings(from).warnLimit || 3} ${ui.smallcaps("avisos")}`),
    ui.adminRow("🚫", "Filtros", ui.smallcaps("remove na primeira infração detectada")),
    ui.adminRow("💎", "Uso", `${config.prefix || "."}autoban 1|0`),
  ]);
});
