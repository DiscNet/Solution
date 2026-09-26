// Menu: Utilidades - Produtividade
// Mantém a implementação original isolada do carregador de comandos para
// resolver a antiga colisão entre os dois comandos canônicos chamados "sorteio".
const commands = require("./util-produtividade-base.cjs");

const optionDraw = commands.find((command) => command?.name === "sorteio");
if (optionDraw) {
  optionDraw.name = "sorteioopcoes";
  optionDraw.aliases = [...new Set([...(optionDraw.aliases || []), "sortearopcoes"] )];
  optionDraw.usage = "sorteioopcoes [opção] | [opção] | ...";
  optionDraw.description = "Uso: .sorteioopcoes [opção] | [opção] | ...";
}

module.exports = commands;
