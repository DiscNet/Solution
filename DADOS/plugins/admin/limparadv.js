// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "limparadv",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "limparadv @usuario",
  "description": "Uso: .limparadv @usuario",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
