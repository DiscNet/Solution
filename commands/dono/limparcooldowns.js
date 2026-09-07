// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "limparcooldowns",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "limparcooldowns",
  "description": "Uso: .limparcooldowns",
  "permissions": {
    "owner": true
  }
}, run);
