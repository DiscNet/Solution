// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "limiteadv",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "limiteadv 1 a 20",
  "description": "Uso: .limiteadv 1 a 20",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
