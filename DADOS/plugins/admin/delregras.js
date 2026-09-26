// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "delregras",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "delregras",
  "description": "Uso: .delregras",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
