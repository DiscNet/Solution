const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "modorpg",
  comandos: ["modorpg"],
  categoria: "rpg",
  info: {
    descricao: "Ativa ou desativa o RPG do grupo.",
    uso: "modorpg 1|0",
    permissao: "ADM",
    categoria: "rpg",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!ctx.isGroupAdmins && !ctx.SoDono) return ctx.reply(ctx.mess.soadm());

    const valor = String(ctx.args?.[0] || "").trim();

    if (!["1", "0"].includes(valor)) {
      return ctx.reply(ctx.mess.modoRpgUso(ctx.prefix));
    }

    r.garantir(ctx);
    ctx.dataGp[0].funcoes.modorpg = valor === "1";
    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.modoAlterado("MODO RPG", valor === "1")
    );
  },
});
