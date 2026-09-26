// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "desautorizargrupo",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "desautorizargrupo id@g.us",
  "description": "Uso: .desautorizargrupo id@g.us",
  "permissions": {
    "owner": true
  }
}, run);
