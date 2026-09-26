// Menu: Menus - Navegação
const { createMenu } = require("../../functions/menuRenderer");

const command = createMenu("menugeral", null, ["menug", "menuall"]);
command.usage = "menugeral [categoria/seção]";
command.description = "Uso: .menugeral [categoria/seção]";

module.exports = command;
