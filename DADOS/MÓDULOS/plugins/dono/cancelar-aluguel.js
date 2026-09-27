const h = require("../../functions/adminHelpers");
const ui = require("../../functions/ui");
const aluguel = require("../../functions/aluguel");
const { normalizeGroupId } = require("../../functions/ownerGroupManager");
const config = require("../../../config/config");

module.exports = h.factory({
  name: "cancelar-aluguel",
  aliases: ["cancelaluguel", "remover-aluguel", "desativar-aluguel"],
  permissions: { owner: true },
  menuCategory: "Dono",
  menuSection: "Aluguel",
  usage: "cancelar-aluguel [id@g.us]",
  description: "Cancela o aluguel do grupo atual ou do ID informado",
}, async ({ conn, args, from }) => {
  const raw = args[0] || (from.endsWith("@g.us") ? from : "");
  const groupId = normalizeGroupId(raw);
  h.need(groupId, `Informe o ID do grupo. Uso: ${config.prefix || "."}cancelar-aluguel id@g.us`);

  const previous = aluguel.getInfoAluguel(groupId);
  h.need(previous, "Este grupo não possui um aluguel cadastrado.");
  aluguel.removerGrupo(groupId);

  const groupNotice = ui.adminCard("Aluguel cancelado", [
    ui.adminRow("🛑", "Estado", ui.smallcaps("atendimento desativado")),
    ui.adminRow("🗓️", "Plano anterior", ui.smallcaps(previous.plano || "não informado")),
    ui.adminRow("📌", "Aviso", ui.smallcaps("o bot não responderá mais neste grupo")),
  ]);
  if (from === groupId) return groupNotice;

  let notified = false;
  try {
    await conn.sendMessage(groupId, { text: groupNotice });
    notified = true;
  } catch (error) {
    console.error("Não foi possível avisar o grupo sobre o cancelamento:", error);
  }
  return ui.adminCard("Aluguel cancelado", [
    ui.adminRow("🆔", "Grupo", `\`${groupId}\``),
    ui.adminRow("🛑", "Estado", ui.smallcaps("cadastro removido")),
    ui.adminRow(notified ? "✅" : "⚠️", "Aviso no grupo",
      ui.smallcaps(notified ? "enviado" : "não pôde ser enviado")),
  ]);
});
