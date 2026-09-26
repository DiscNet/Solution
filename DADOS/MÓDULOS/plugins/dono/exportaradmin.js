// Menu: Dono - Configuração
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "exportaradmin",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Configuração",
  "usage": "exportaradmin",
  "description": "Uso: .exportaradmin",
  "permissions": {
    "owner": true,
    "private": true
  }
}, run);
