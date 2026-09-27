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
},async ({conn,from,permission})=>{
 const metadata = permission.metadata || await conn.groupMetadata(from);
 if (metadata.announce === true) return "O grupo já está fechado para mensagens dos membros.";
 await conn.groupSettingUpdate(from,"announcement");
 return "Grupo fechado: somente administradores podem enviar mensagens.";
});
