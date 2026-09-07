// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "listamutes",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "listamutes",
  "description": "Uso: .listamutes",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
