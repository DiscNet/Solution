const catalog = require("./menuCatalog");
const ui = require("./ui");
const config = require("../config/config");
const routes = {
  RPG: "menurpg",
  Grupos: "menuadm",
  Dono: "menudono",
  Downloads: "menudws",
  Alteradores: "menualterar",
  Figurinhas: "menusticker",
  Brincadeiras: "menubn",
  Utilidades: "menuoutros",
  Menus: "menugeral menus",
};
function index(prefix) {
  return (
    Object.entries(routes)
      .map(
        ([category, route]) =>
          `*${category}*\n${prefix}${route} | ${catalog.sections(category).join(" · ")}`,
      )
      .join("\n\n") +
    `\n\n${prefix}menugeral | Todos os comandos\n${prefix}info comando | Ajuda de um comando\n${prefix}menu rpg pets | Filtrar uma seção`
  );
}
function createMenu(name, category, aliases = []) {
  return {
    name,
    aliases,
    menuCategory: "Menus",
    menuSection: "Navegação",
    usage: `${name} [seção] [página]`,
    description: `Uso: .${name} [seção] [página]`,
    async execute(conn, msg, args = [], from) {
      const prefix = config.prefix || ".";
      let chosen = category;
      const params = [...args];
      if (name === "menu") {
        if (!params.length)
          return ui.reply(
            conn,
            msg,
            `*${config.botName || "GrimmJow"} — Menus*\n\n${index(prefix)}`,
            { from },
          );
        const key = catalog.normalize(params.shift());
        if (!Object.hasOwn(catalog.categories, key))
          return ui.reply(
            conn,
            msg,
            `Categoria não encontrada.\n\n${index(prefix)}`,
            { from },
          );
        chosen = catalog.categories[key];
      }
      if (
        name === "menugeral" &&
        Object.hasOwn(catalog.categories, catalog.normalize(params[0]))
      )
        chosen = catalog.categories[catalog.normalize(params.shift())];
      let page = 1;
      if (/^\d+$/.test(params.at(-1) || "")) page = Number(params.pop());
      const section = params.join(" ");
      const parts = catalog.pages({ category: chosen, section, prefix });
      if (!parts.length)
        return ui.reply(
          conn,
          msg,
          `Seção não encontrada. Disponíveis: ${catalog.sections(chosen).join(" · ")}`,
          { from },
        );
      if (!Number.isSafeInteger(page) || page < 1 || page > parts.length)
        return ui.reply(
          conn,
          msg,
          `Informe uma página de 1 a ${parts.length}.`,
          { from },
        );
      const base =
        name === "menu"
          ? `${prefix}menu ${args[0]}`
          : name === "menugeral" && chosen
            ? `${prefix}menugeral ${catalog.normalize(chosen)}`
            : `${prefix}${name}`;
      const next =
        page < parts.length
          ? `\nPróxima: ${base}${section ? " " + section : ""} ${page + 1}`
          : "";
      return ui.reply(
        conn,
        msg,
        `*${config.botName || "GrimmJow"} — ${chosen || "Todos os comandos"}*\nPágina ${page}/${parts.length}\n\n${parts[page - 1]}${next}`,
        { from },
      );
    },
  };
}
module.exports = { createMenu, index };
