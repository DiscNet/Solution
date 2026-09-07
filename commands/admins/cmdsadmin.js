// Menu: Grupos - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "cmdsadmin",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Comandos",
  "usage": "cmdsadmin on|off",
  "description": "Uso: .cmdsadmin on|off",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
