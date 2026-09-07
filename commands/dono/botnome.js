// Menu: Dono - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botnome",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Configuração",
  "usage": "botnome nome",
  "description": "Uso: .botnome nome",
  "permissions": {
    "owner": true
  }
}, run);
