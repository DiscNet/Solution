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
},async ({conn,from,permission})=>{
 const metadata = permission.metadata || await conn.groupMetadata(from);
 if (metadata.announce === false) return "O grupo já está aberto para todos.";
 await conn.groupSettingUpdate(from,"not_announcement");
 return "Grupo aberto: todos os membros podem enviar mensagens.";
});
