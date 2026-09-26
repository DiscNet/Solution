// Menu: Grupos - Membros
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "exportarmembros",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Membros",
  "usage": "exportarmembros",
  "description": "Uso: .exportarmembros",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
