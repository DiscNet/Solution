// Menu: Grupos - Proteção
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "modolento",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Proteção",
  "usage": "modolento segundos (0 desliga)",
  "description": "Uso: .modolento segundos (0 desliga)",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
