const h = require("../../functions/adminHelpers");
const state = require("../../functions/adminState");
const ui = require("../../functions/ui");
const { normalizeWords } = require("../../functions/groupProtection");
const { isAdminParticipant, participantMatches, botIdentityCandidates } = require("../../functions/permissions");
const config = require("../../../config/config");

const definitions = [
  ["antipalavra", "antipalavra 1|0", "Liga ou desliga o filtro de palavras"],
  ["addpalavra", "addpalavra palavra ou frase", "Adiciona uma palavra ou frase proibida"],
  ["delpalavra", "delpalavra palavra ou frase", "Remove uma palavra ou frase proibida"],
  ["listapalavra", "listapalavra", "Mostra as palavras proibidas"],
];

function word(args) {
  const value = h.text(args, 80).replace(/\s+/g, " ").trim();
  h.need(normalizeWords(value), "Informe uma palavra ou frase válida.");
  return value;
}

async function run(name, { conn, args, from, permission }) {
  const prefix = config.prefix || ".";
  if (name === "antipalavra") {
    const choice = String(args[0] || "").toLowerCase();
    if (choice) {
      h.need(["1", "0", "on", "off", "ativar", "desativar"].includes(choice),
        `Use ${prefix}antipalavra 1 ou 0.`);
      const enabled = ["1", "on", "ativar"].includes(choice);
      if (enabled) {
        const bot = (permission.metadata?.participants || []).find(item =>
          participantMatches(item, botIdentityCandidates(conn)));
        h.need(isAdminParticipant(bot), ui.permissionMessage("BOT_ADMIN_REQUIRED"));
      }
      state.update(data => { (state.group(data, from).filters ||= {}).palavra = enabled; });
    }
    const settings = state.groupSettings(from);
    return ui.adminCard("Anti palavra", [
      ui.adminRow("🛡️", "Estado", ui.smallcaps(settings.filters?.palavra ? "ativo" : "inativo")),
      ui.adminRow("📝", "Palavras", (settings.words || []).length),
      ui.adminRow("💎", "Uso", `${prefix}antipalavra 1|0`),
    ]);
  }
  if (name === "listapalavra") {
    const words = state.groupSettings(from).words || [];
    return ui.adminCard("Palavras proibidas", words.length
      ? words.map((value, index) => ui.adminRow("🧊", String(index + 1), value))
      : [ui.adminRow("📝", "Lista", ui.smallcaps("vazia"))]);
  }
  const value = word(args);
  if (name === "addpalavra") {
    state.update(data => {
      const group = state.group(data, from);
      group.words ||= [];
      h.need(group.words.length < 50, "O limite de 50 palavras foi atingido.");
      h.need(!group.words.some(existing => normalizeWords(existing) === normalizeWords(value)),
        "Essa palavra ou frase já foi cadastrada.");
      group.words.push(value);
    });
    return ui.adminCard("Palavra adicionada", [ui.adminRow("📝", "Filtro", value)]);
  }
  state.update(data => {
    const group = state.group(data, from);
    group.words ||= [];
    const index = group.words.findIndex(existing => normalizeWords(existing) === normalizeWords(value));
    h.need(index !== -1, "Essa palavra ou frase não está na lista.");
    group.words.splice(index, 1);
  });
  return ui.adminCard("Palavra removida", [ui.adminRow("📝", "Filtro", value)]);
}

module.exports = { commands: definitions.map(([name, usage, description]) =>
  h.factory({
    name, aliases: [], usage, description,
    permissions: { group: true, admin: true },
    menuCategory: "Grupos", menuSection: "Proteção",
  }, context => run(name, context))) };
