// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "pausatexto",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "pausatexto texto",
  "description": "Uso: .pausatexto texto",
  "permissions": {
    "owner": true
  }
}, run);
