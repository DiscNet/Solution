// Menu: Grupos - Comandos
const h=require("../../functions/adminHelpers");
const store=require("../../functions/blockcmd");
module.exports=h.factory({name:"blockcmd",aliases:["blcmd"],permissions:{group:true,admin:true},menuCategory:"Grupos",menuSection:"Comandos",usage:"blockcmd"+" comando",description:"Uso: ."+"blockcmd"+" comando"},async ({args,from})=>{
 const catalog=require("../../functions/menuCatalog");const c=catalog.resolve(args[0]);h.need(c,"Comando não encontrado.");
 h.need(!c.permissions?.owner&&!c.permissions?.admin,"Comandos administrativos permanecem disponíveis para recuperação.");
 const d=store.loadConfig(true);d[from]||={bloqueados:[]};d[from].bloqueados=(d[from].bloqueados||[]).filter(n=>(catalog.resolve(n)?.name||n)!==c.name);
 if(true)d[from].bloqueados.push(c.name);store.saveConfig(d);return `${c.name}: ${true?"bloqueado":"desbloqueado"}, incluindo aliases.`;
});
