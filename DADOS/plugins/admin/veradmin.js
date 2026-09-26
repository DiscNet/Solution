// Menu: Grupos - Membros
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "veradmin",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Membros",
  "usage": "veradmin @usuario",
  "description": "Uso: .veradmin @usuario",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
