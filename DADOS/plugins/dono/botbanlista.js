// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "botbanlista",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "botbanlista",
  "description": "Uso: .botbanlista",
  "permissions": {
    "owner": true
  }
}, run);
