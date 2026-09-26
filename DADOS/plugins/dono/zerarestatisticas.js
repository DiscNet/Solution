// Menu: Dono - Estatísticas
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "zerarestatisticas",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Estatísticas",
  "usage": "zerarestatisticas confirmar",
  "description": "Uso: .zerarestatisticas confirmar",
  "permissions": {
    "owner": true
  }
}, run);
