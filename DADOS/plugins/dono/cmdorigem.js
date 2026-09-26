// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdorigem",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cmdorigem comando",
  "description": "Uso: .cmdorigem comando",
  "permissions": {
    "owner": true
  }
}, run);
