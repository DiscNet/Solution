// Menu: Grupos - Configuração
const h=require("../../functions/adminHelpers");
module.exports=h.factory({
  "name": "set-nome",
  "aliases": [],
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  },
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "set-nome nome",
  "description": "Uso: .set-nome nome"
},async ({conn,args,from})=>{
 await conn.groupUpdateSubject(from,h.text(args,100));
 return "Configuração do grupo atualizada.";
});
