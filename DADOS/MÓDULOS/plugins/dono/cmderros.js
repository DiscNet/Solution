// Menu: Dono - Diagnóstico
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "cmderros",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Diagnóstico",
  "usage": "cmderros",
  "description": "Uso: .cmderros",
  "permissions": {
    "owner": true
  }
}, run);
