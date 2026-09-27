// Menu: Grupos - Proteção | Comando: antispam
const h = require("../../functions/adminHelpers");
const ui = require("../../functions/ui");
const { isAntispamAtivo, toggleAntispam } = require("../../functions/antispam");
const config = require("../../../config/config");

module.exports = h.factory({
  name: "antispam",
  aliases: ["anti-spam"],
  permissions: { group: true, admin: true, botAdmin: true },
  menuCategory: "Grupos",
  menuSection: "Proteção",
  usage: "antispam 1|0",
  description: "Controla a proteção contra mensagens repetidas",
}, async ({ args, from }) => {
  const option = String(args[0] || "").toLowerCase();
  if (["1", "on", "ativar"].includes(option)) toggleAntispam(from, true);
  else if (["0", "off", "desativar"].includes(option)) toggleAntispam(from, false);
  else if (option) h.need(false, `Use ${(config.prefix || ".")}antispam 1 ou 0.`);

  return ui.adminCard("Proteção contra spam", [
    ui.adminRow("🛡️", "Status", isAntispamAtivo(from) ? "ativo" : "inativo"),
    ui.adminRow("⏱️", "Limite", "5 mensagens em 5 segundos"),
    ui.adminRow("💎", "Uso", `${config.prefix || "."}antispam 1|0`),
  ]);
});
