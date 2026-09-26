// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cooldowncmd",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cooldowncmd comando segundos",
  "description": "Uso: .cooldowncmd comando segundos",
  "permissions": {
    "owner": true
  }
}, run);
