// Menu: Grupos - Regras e notas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "delnota",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Regras e notas",
  "usage": "delnota nome",
  "description": "Uso: .delnota nome",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
