// Menu: Grupos - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "revogarlink",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "revogarlink",
  "description": "Uso: .revogarlink",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
