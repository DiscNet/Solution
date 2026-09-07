// Menu: Grupos - Comandos
const { factory } = require("../../functions/adminHelpers");
const { run } = require("../../functions/groupAdmin");
module.exports = factory({
  "name": "cmdesperas",
  "aliases": [],
  "menuCategory": "Grupos",
  "menuSection": "Comandos",
  "usage": "cmdesperas",
  "description": "Uso: .cmdesperas",
  "permissions": {
    "group": true,
    "admin": true
  }
}, run);
