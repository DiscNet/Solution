// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "nota",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "nota nome",
  "description": "Uso: .nota nome",
  "permissions": {
    "group": true,
    "admin": false
  }
}, run);
