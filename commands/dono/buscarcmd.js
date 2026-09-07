// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "buscarcmd",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "buscarcmd termo",
  "description": "Uso: .buscarcmd termo",
  "permissions": {
    "owner": true
  }
}, run);
