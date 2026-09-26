// Menu: Grupos - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "cmdespera",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Comandos",
  "usage": "cmdespera comando segundos",
  "description": "Uso: .cmdespera comando segundos",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
