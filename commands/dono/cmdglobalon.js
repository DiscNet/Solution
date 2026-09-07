// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdglobalon",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cmdglobalon comando",
  "description": "Uso: .cmdglobalon comando",
  "permissions": {
    "owner": true
  }
}, run);
