// Menu: Dono - Estatísticas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "topcomandos",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Estatísticas",
  "usage": "topcomandos",
  "description": "Uso: .topcomandos",
  "permissions": {
    "owner": true
  }
}, run);
