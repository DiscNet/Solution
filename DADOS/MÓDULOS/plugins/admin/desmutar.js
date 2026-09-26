// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "desmutar",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "desmutar @usuario",
  "description": "Uso: .desmutar @usuario",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
