// Menu: Grupos - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "editargrupo",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "editargrupo admins|todos",
  "description": "Uso: .editargrupo admins|todos",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
