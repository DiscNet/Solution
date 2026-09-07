// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botambiente",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "botambiente",
  "description": "Uso: .botambiente",
  "permissions": {
    "owner": true
  }
}, run);
