// Menu: Dono - Estatísticas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdestatistica",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Estatísticas",
  "usage": "cmdestatistica comando",
  "description": "Uso: .cmdestatistica comando",
  "permissions": {
    "owner": true
  }
}, run);
