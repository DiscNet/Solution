// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdglobais",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cmdglobais",
  "description": "Uso: .cmdglobais",
  "permissions": {
    "owner": true
  }
}, run);
