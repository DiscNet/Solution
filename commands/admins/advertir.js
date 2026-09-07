// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "advertir",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "advertir @usuario motivo",
  "description": "Uso: .advertir @usuario motivo",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
