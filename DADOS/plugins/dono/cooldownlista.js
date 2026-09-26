// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cooldownlista",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cooldownlista",
  "description": "Uso: .cooldownlista",
  "permissions": {
    "owner": true
  }
}, run);
