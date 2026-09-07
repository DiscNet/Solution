// Menu: Grupos - Configuração
const h=require("../../functions/adminHelpers");
module.exports=h.factory({
  "name": "abrir",
  "aliases": [],
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  },
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "abrir",
  "description": "Uso: .abrir"
},async ({conn,args,from})=>{
 await conn.groupSettingUpdate(from,"not_announcement");
 return "Configuração do grupo atualizada.";
});
