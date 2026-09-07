// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botunban",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "botunban @usuario",
  "description": "Uso: .botunban @usuario",
  "permissions": {
    "owner": true
  }
}, run);
