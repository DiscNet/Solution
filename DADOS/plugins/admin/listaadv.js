// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "listaadv",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "listaadv",
  "description": "Uso: .listaadv",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
