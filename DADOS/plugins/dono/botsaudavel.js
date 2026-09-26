// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botsaudavel",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "botsaudavel",
  "description": "Uso: .botsaudavel",
  "permissions": {
    "owner": true
  }
}, run);
