// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "mutar",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "mutar @usuario minutos",
  "description": "Uso: .mutar @usuario minutos",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
