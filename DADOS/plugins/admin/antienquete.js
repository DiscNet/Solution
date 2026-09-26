// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "antienquete",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antienquete on|off",
  "description": "Uso: .antienquete on|off",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
