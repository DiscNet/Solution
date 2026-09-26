// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "antilocalizacao",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antilocalizacao on|off",
  "description": "Uso: .antilocalizacao on|off",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
