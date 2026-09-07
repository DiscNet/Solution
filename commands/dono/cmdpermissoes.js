// Menu: Dono - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdpermissoes",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Comandos",
  "usage": "cmdpermissoes comando",
  "description": "Uso: .cmdpermissoes comando",
  "permissions": {
    "owner": true
  }
}, run);
