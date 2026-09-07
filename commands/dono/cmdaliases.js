// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdaliases",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cmdaliases comando",
  "description": "Uso: .cmdaliases comando",
  "permissions": {
    "owner": true
  }
}, run);
