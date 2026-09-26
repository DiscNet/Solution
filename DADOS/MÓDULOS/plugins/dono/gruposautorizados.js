// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "gruposautorizados",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "gruposautorizados",
  "description": "Uso: .gruposautorizados",
  "permissions": {
    "owner": true
  }
}, run);
