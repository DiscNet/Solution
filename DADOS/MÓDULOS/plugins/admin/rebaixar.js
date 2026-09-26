// Menu: Grupos - Membros
const h=require("../../functions/adminHelpers");
const {sameIdentity,isOwner}=require("../../functions/permissions");
module.exports=h.factory({name:"rebaixar",aliases:[],permissions:{group:true,admin:true,botAdmin:true},menuCategory:"Grupos",menuSection:"Membros",usage:"rebaixar"+" @usuario",description:"Uso: ."+"rebaixar"+" @usuario"},async ({conn,msg,args,from})=>{
 const {p,jid}=await h.resolveMember(conn,from,msg,args);
 h.need(p.admin!=="superadmin","O criador do grupo não pode ser alterado.");
 h.need(!h.values(p).some(v=>[conn.user?.id,conn.user?.lid].some(b=>sameIdentity(v,b))),"Não é permitido atingir o próprio bot.");
 if("demote"!=="promote")h.need(!h.values(p).some(v=>isOwner({key:{remoteJid:v}})),"Não é permitido atingir o dono do bot.");
 if("demote"==="promote")h.need(!p.admin,"Esse membro já é administrador.");
 if("demote"==="demote")h.need(p.admin,"Esse membro não é administrador.");
 const results=await conn.groupParticipantsUpdate(from,[jid],"demote");
 h.need(Array.isArray(results)&&results.length===1&&String(results[0].status)==="200","O WhatsApp não confirmou a alteração. Confira as permissões e tente novamente.");
 return "Alteração confirmada pelo WhatsApp.";
});
