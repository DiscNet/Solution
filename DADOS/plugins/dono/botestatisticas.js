// Menu: Dono - Estatísticas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botestatisticas",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Estatísticas",
  "usage": "botestatisticas",
  "description": "Uso: .botestatisticas",
  "permissions": {
    "owner": true
  }
}, run);
