// Menu: Grupos - Configuração
const h=require("../../functions/adminHelpers");
module.exports=h.factory({
  "name": "set-desc",
  "aliases": [],
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  },
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "set-desc texto",
  "description": "Uso: .set-desc texto"
},async ({conn,args,from})=>{
 await conn.groupUpdateDescription(from,h.text(args,2048));
 return "Configuração do grupo atualizada.";
});
