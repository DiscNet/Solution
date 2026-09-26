// Menu: Grupos - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "configgrupo",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "configgrupo",
  "description": "Uso: .configgrupo",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
