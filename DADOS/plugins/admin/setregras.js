// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "setregras",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "setregras texto",
  "description": "Uso: .setregras texto",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
