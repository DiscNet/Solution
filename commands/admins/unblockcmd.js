// Menu: Grupos - Comandos
const h=require("../../functions/adminHelpers");
const store=require("../../functions/blockcmd");
module.exports=h.factory({name:"unblockcmd",aliases:["ublcmd", "desbloquearcmd"],permissions:{group:true,admin:true},menuCategory:"Grupos",menuSection:"Comandos",usage:"unblockcmd"+" comando",description:"Uso: ."+"unblockcmd"+" comando"},async ({args,from})=>{
 const catalog=require("../../functions/menuCatalog");const c=catalog.resolve(args[0]);h.need(c,"Comando não encontrado.");
 h.need(!c.permissions?.owner&&!c.permissions?.admin,"Comandos administrativos permanecem disponíveis para recuperação.");
 const d=store.loadConfig(true);d[from]||={bloqueados:[]};d[from].bloqueados=(d[from].bloqueados||[]).filter(n=>(catalog.resolve(n)?.name||n)!==c.name);
 if(false)d[from].bloqueados.push(c.name);store.saveConfig(d);return `${c.name}: ${false?"bloqueado":"desbloqueado"}, incluindo aliases.`;
});
