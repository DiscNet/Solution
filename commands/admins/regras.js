// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "regras",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "regras",
  "description": "Uso: .regras",
  "permissions": {
    "group": true,
    "admin": false
  }
}, run);
