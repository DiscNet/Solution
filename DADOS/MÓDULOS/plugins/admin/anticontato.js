// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "anticontato",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "anticontato on|off",
  "description": "Uso: .anticontato on|off",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
