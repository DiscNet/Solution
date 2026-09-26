const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "modocoins",
  comandos: ["modocoins"],
  categoria: "coins",
  info: {
    descricao: "Ativa ou desativa a economia N-Coins no grupo.",
    uso: "modocoins 1|0",
    permissao: "ADM",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!ctx.isGroupAdmins && !ctx.SoDono) return ctx.reply(ctx.mess.soadm());

    const valor = String(ctx.args?.[0] || "").trim();

    if (!["1", "0"].includes(valor)) {
      return ctx.reply(ctx.mess.modoCoinsUso(ctx.prefix));
    }

    r.garantir(ctx);
    ctx.dataGp[0].funcoes.modocoins = valor === "1";
    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.modoAlterado("MODO COINS", valor === "1")
    );
  },
});
