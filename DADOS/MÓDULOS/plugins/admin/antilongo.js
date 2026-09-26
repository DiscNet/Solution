// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "antilongo",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antilongo caracteres (0 desliga)",
  "description": "Uso: .antilongo caracteres (0 desliga)",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
