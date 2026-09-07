// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botmemoria",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "botmemoria",
  "description": "Uso: .botmemoria",
  "permissions": {
    "owner": true
  }
}, run);
