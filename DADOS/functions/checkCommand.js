const fs = require("fs");
const path = require("path");

// --- Importa prefix do config ---
const config = require("../config/config"); // pode ser .js ou .mjs

// --- Função checkCommand ---
function checkCommand(commands, input) {
  const prefix = config.prefix || "/"; // pega o prefixo definido no config
  if (!input.startsWith(prefix)) return { exists: false, message: `❌ Comando inválido. Use ${prefix}comando` };

  const cmdName = input.slice(prefix.length).trim().toLowerCase();
  if (commands[cmdName]) return { exists: true, command: commands[cmdName] };

  // Sugestão: procura comando que comece com a mesma letra
  const suggestion = Object.keys(commands).find(c => c.startsWith(cmdName[0]));
  const msg = suggestion
    ? `❌ Comando não encontrado. Você quis dizer: ${prefix}${suggestion}?`
    : "❌ Comando não encontrado.";

  return { exists: false, message: msg };
}

module.exports = { checkCommand };