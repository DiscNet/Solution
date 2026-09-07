// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botmodo",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "botmodo publico|pausado|grupos|pv",
  "description": "Uso: .botmodo publico|pausado|grupos|pv",
  "permissions": {
    "owner": true
  }
}, run);
