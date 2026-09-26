// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botdependencias",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "botdependencias",
  "description": "Uso: .botdependencias",
  "permissions": {
    "owner": true
  }
}, run);
