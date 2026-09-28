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
  const normalized = String(code || "ERR_COMMAND_EXECUTION");

  if (normalized === "EACCES" || normalized === "ERR_EXEC_PERMISSION") {
    return [
      "❌ *O Android/Termux negou permissão para executar uma ferramenta do comando.*",
      "",
      "• Código: " + normalized,
      "• O bot já tenta usar os binários internos do Termux automaticamente.",
      "• Bot: " + botName(),
    ].join("\n");
  }

  if (normalized === "ENOENT" || normalized === "ERR_EXEC_MISSING") {
    return [
      "❌ *Uma ferramenta necessária ao comando não foi encontrada.*",
      "",
      "• Código: " + normalized,
      "• Bot: " + botName(),
    ].join("\n");
  }

  return [
    "❌ *Não foi possível executar o comando.*",
    "",
    "• Código: " + normalized,
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
