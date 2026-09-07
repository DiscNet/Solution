// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cooldownpadrao",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cooldownpadrao segundos",
  "description": "Uso: .cooldownpadrao segundos",
  "permissions": {
    "owner": true
  }
}, run);
