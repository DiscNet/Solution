// Menu: Dono - Comandos
const h=require("../../functions/adminHelpers");
const store=require("../../functions/maintenance");
module.exports=h.factory({name:"manutencao",permissions:{owner:true},menuCategory:"Dono",menuSection:"Comandos",usage:"manutencao [comando]",description:"Uso: .manutencao [comando]"},async ({args})=>{
 if(!args.length)return store.list().join("\n")||"Nenhum comando em manutenção.";
 const cmd=require("../../functions/menuCatalog").resolve(args[0]);h.need(cmd,"Comando não encontrado.");return store.list().includes(cmd.name)?"Comando em manutenção.":"Comando fora de manutenção.";
});
