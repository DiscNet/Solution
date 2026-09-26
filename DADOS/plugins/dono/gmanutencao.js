// Menu: Dono - Comandos
const h=require("../../functions/adminHelpers");
const store=require("../../functions/maintenance");
module.exports=h.factory({name:"addmanutencao",permissions:{owner:true},menuCategory:"Dono",menuSection:"Comandos",usage:"addmanutencao add|del comando",description:"Uso: .addmanutencao add|del comando"}, async ({args})=>{
 h.need(["add","del","remover","rem","remove"].includes(args[0]),"Use addmanutencao add|del comando.");
 const cmd=require("../../functions/menuCatalog").resolve(args[1]);h.need(cmd,"Comando não encontrado.");h.need(!cmd.permissions?.owner,"Comandos do dono permanecem acessíveis para recuperação.");
 store.change(cmd.name,args[0]==="add");return `${cmd.name}: manutenção ${args[0]==="add"?"ativada":"removida"}.`;
});
