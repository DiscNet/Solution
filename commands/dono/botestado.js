// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botestado",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "botestado",
  "description": "Uso: .botestado",
  "permissions": {
    "owner": true
  }
}, run);
