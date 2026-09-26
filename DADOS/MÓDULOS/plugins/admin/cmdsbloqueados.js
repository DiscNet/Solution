// Menu: Grupos - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "cmdsbloqueados",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Comandos",
  "usage": "cmdsbloqueados",
  "description": "Uso: .cmdsbloqueados",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
