// Menu: Grupos - Configuração
const h=require("../../functions/adminHelpers");
module.exports=h.factory({
  "name": "fechar",
  "aliases": [],
  "permissions": {
    "group": true,
    "admin": true,
    "botAdmin": true
  },
  "menuCategory": "Grupos",
  "menuSection": "Configuração",
  "usage": "fechar",
  "description": "Uso: .fechar"
},async ({conn,args,from})=>{
 await conn.groupSettingUpdate(from,"announcement");
 return "Configuração do grupo atualizada.";
});
