// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "notas",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "notas",
  "description": "Uso: .notas",
  "permissions": {
    "group": true,
    "admin": false
  }
}, run);
