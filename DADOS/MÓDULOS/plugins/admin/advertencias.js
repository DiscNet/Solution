// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "advertencias",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "advertencias @usuario",
  "description": "Uso: .advertencias @usuario",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
