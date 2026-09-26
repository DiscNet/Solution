const config = require("../../config/config");

function botName() {
  return String(config.botName || "Bot")
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim() || "Bot";
}

function generic() {
  return "❌ Ocorreu um erro ao executar esta ação.";
}

function commandExecution(code = "ERR_COMMAND_EXECUTION") {
  return [
    "❌ *Não foi possível executar o comando.*",
    "",
    "• Código: " + String(code || "ERR_COMMAND_EXECUTION"),
    "• Bot: " + botName(),
  ].join("\n");
}

function api() {
  return "❌ A API não respondeu corretamente. Tente novamente mais tarde.";
}

function groupOnly() {
  return "❌ Este comando só pode ser usado em grupos.";
}

function adminOnly() {
  return "❌ Este comando só pode ser usado por administradores do grupo.";
}

function ownerOnly() {
  return "❌ Este comando só pode ser usado pelo dono do bot.";
}

module.exports = {
  generic,
  commandExecution,
  api,
  groupOnly,
  adminOnly,
  ownerOnly,
};
