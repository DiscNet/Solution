// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "filtros",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "filtros",
  "description": "Uso: .filtros",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
