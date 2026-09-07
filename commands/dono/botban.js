// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botban",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "botban @usuario motivo",
  "description": "Uso: .botban @usuario motivo",
  "permissions": {
    "owner": true
  }
}, run);
