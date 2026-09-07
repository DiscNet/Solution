// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "retiraradv",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "retiraradv @usuario",
  "description": "Uso: .retiraradv @usuario",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
