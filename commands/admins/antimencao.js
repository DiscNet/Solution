// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "antimencao",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "antimencao limite (0 desliga)",
  "description": "Uso: .antimencao limite (0 desliga)",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
