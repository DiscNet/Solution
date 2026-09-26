// Menu: Utilidades - Ajuda
const catalog = require("../../functions/menuCatalog");
const ui = require("../../functions/ui");
module.exports = {
 name: "info", aliases: ["ajudacmd"], menuCategory: "Utilidades", menuSection: "Ajuda", usage: "info comando", description: "Uso: .info comando",
 async execute(conn,msg,args,from) {
  const c=catalog.resolve(args[0]);
  if(!c) return ui.reply(conn,msg,"Informe um comando válido. Exemplo: info petinfo",{from});
  const prefix=require("../../config/config").prefix||".";
  const p=c.permissions||{};
  const access=[p.owner&&"dono",p.admin&&"administrador",p.group&&"grupo",p.private&&"privado",p.botAdmin&&"bot administrador"].filter(Boolean).join(", ")||"todos";
  return ui.reply(conn,msg,`*${c.menuCategory} - ${c.menuSection}*\n${catalog.formatLine(c,prefix)}\nAcesso: ${access}\nAliases: ${(c.aliases||c.alias||[]).toString()||"nenhum"}`,{from});
 }
};
