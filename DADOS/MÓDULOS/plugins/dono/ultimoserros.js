// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "ultimoserros",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "ultimoserros",
  "description": "Uso: .ultimoserros",
  "permissions": {
    "owner": true
  }
}, run);
