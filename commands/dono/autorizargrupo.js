// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "autorizargrupo",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "autorizargrupo id@g.us",
  "description": "Uso: .autorizargrupo id@g.us",
  "permissions": {
    "owner": true
  }
}, run);
