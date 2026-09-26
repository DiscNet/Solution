// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "antisticker",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antisticker on|off",
  "description": "Uso: .antisticker on|off",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
