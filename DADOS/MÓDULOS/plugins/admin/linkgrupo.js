// Menu: Grupos - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "linkgrupo",
  "aliases": ["linkgp", "linkg"],
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "linkgrupo",
  "description": "Uso: .linkgrupo",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
