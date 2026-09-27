// Menu: Grupos - Moderação
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "apagarmensagem",
  "aliases": ["del", "delete", "d", "apagar"],
  "menuCategory": "Grupos",
  "menuSection": "Moderação",
  "usage": "apagarmensagem (responda à mensagem)",
  "description": "Uso: .apagarmensagem (responda à mensagem)",
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  }
}, run);
