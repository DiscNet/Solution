// Menu: Grupos - Membros
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "infogrupo",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Membros",
  "usage": "infogrupo",
  "description": "Uso: .infogrupo",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
