// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdglobaloff",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cmdglobaloff comando",
  "description": "Uso: .cmdglobaloff comando",
  "permissions": {
    "owner": true
  }
}, run);
