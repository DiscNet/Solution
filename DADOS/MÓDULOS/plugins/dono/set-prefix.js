// Menu: Dono - Configuração
const h=require("../../functions/adminHelpers");
module.exports=h.factory({name:"setprefix",aliases:["set-prefix", "prefixo", "changeprefix"],permissions:{owner:true},menuCategory:"Dono",menuSection:"Configuração",usage:"setprefix prefixo",description:"Uso: .setprefix prefixo"},async ({args})=>{
 const value=args[0];h.need(typeof value==="string"&&value.length>=1&&value.length<=5&&!/\s/.test(value),"Use um prefixo de 1 a 5 caracteres, sem espaços.");
 require("../../functions/configLoader").salvarConfig({prefix:value});return `Prefixo atualizado: ${value}`;
});
