// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "salvarnota",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "salvarnota nome texto",
  "description": "Uso: .salvarnota nome texto",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
