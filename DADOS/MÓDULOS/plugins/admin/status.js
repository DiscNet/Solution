// Menu: Grupos - Configuração | Comando: status
const fs = require("fs");
const path = require("path");
const h = require("../../functions/adminHelpers");
const state = require("../../functions/adminState");
const antiManager = require("../../functions/antiManager");
const { isAntispamAtivo } = require("../../functions/antispam");
const { isBemvindoAtivo } = require("../../functions/bemvindo");
const ui = require("../../functions/ui");

const AUTOFIGU_FILE = path.join(__dirname, "..", "..", "..", "database", "autofigu.json");

function autofiguEnabled(groupId) {
  try {
    return JSON.parse(fs.readFileSync(AUTOFIGU_FILE, "utf8"))[groupId] === true;
  } catch (_) {
    return false;
  }
}

function activeLines(entries) {
  const names = entries.filter(([, enabled]) => enabled).map(([name]) => `.${name}`);
  return names.length ? names.join(", ") : ui.smallcaps("nenhum");
}

module.exports = h.factory({
  name: "status",
  aliases: ["statusgrupo"],
  permissions: { group: true, admin: true },
  menuCategory: "Grupos",
  menuSection: "Configuração",
  usage: "status",
  description: "Mostra quantos filtros anti e recursos automáticos estão ativos",
}, async ({ from }) => {
  const settings = state.groupSettings(from);
  const filters = settings.filters || {};
  const antis = [
    ...[["antilink", "link"], ["antidoc", "documento"], ["antiimagem", "imagem"],
      ["antivideo", "video"], ["antiaudio", "audio"]]
      .map(([name, type]) => [name, antiManager.isAntiAtivo(from, type)]),
    ["antispam", isAntispamAtivo(from)],
    ...[["antisticker", "sticker"], ["anticontato", "contato"],
      ["antilocalizacao", "localizacao"], ["antienquete", "enquete"],
      ["antiencaminhado", "encaminhado"], ["antimencao", "mencao"],
      ["antilongo", "longo"], ["antipalavra", "palavra"]]
      .map(([name, key]) => [name, Boolean(filters[key])]),
  ];
  const autos = [
    ["autofigu", autofiguEnabled(from)],
    ["bemvindo", Boolean(isBemvindoAtivo(from))],
    ["autoaprovacao", settings.autoApprove === true],
    ["autoban", settings.autoban === true],
  ];
  const count = entries => entries.filter(([, enabled]) => enabled).length;

  return ui.adminCard("Status do grupo", [
    ui.adminRow("🛡️", "Antis ativos", `${count(antis)}/${antis.length}`),
    ui.adminRow("🔹", "Filtros ligados", activeLines(antis)),
    ui.adminRow("🤖", "Autos ativos", `${count(autos)}/${autos.length}`),
    ui.adminRow("🔹", "Automações ligadas", activeLines(autos)),
    ui.adminRow("⚠️", "Limite de avisos", settings.warnLimit || 3),
    ui.adminRow("📝", "Palavras proibidas", (settings.words || []).length),
    ui.adminRow("🚫", "Lista negra", (settings.blacklist || []).length),
  ]);
});
