// Menu: Dono - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "dononome",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Configuração",
  "usage": "dononome nome",
  "description": "Uso: .dononome nome",
  "permissions": {
    "owner": true
  }
}, run);
