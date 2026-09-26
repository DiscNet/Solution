// Menu: Dono - Acesso
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/ownerAdmin");
module.exports = factory({
  "name": "restricaogrupos",
  "aliases": [],
  "menuCategory": "Dono",
  "menuSection": "Acesso",
  "usage": "restricaogrupos on|off",
  "description": "Uso: .restricaogrupos on|off",
  "permissions": {
    "owner": true
  }
}, run);
