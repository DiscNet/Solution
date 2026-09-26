// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmdauditoria",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "cmdauditoria",
  "description": "Uso: .cmdauditoria",
  "permissions": {
    "owner": true
  }
}, run);
