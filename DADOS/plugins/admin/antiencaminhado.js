// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "antiencaminhado",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antiencaminhado on|off",
  "description": "Uso: .antiencaminhado on|off",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
