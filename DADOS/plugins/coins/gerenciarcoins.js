const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "addcoins",
  comandos: ["addcoins", "removecoins", "tirarcoins"],
  categoria: "coins",
  info: {
    descricao: "Adiciona ou remove N-Coins de um usuário.",
    uso: "addcoins @usuario valor",
    permissao: "Dono",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.SoDono) return ctx.reply(ctx.mess.onlyOwner());
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());

    const alvo = ctx.normalizar(
      (ctx.menc_jid2 || [])[0] ||
      ctx.menc_prt ||
      ctx.sender
    );

    const valor = Number(
      String(ctx.q || "")
        .replace(/@\S+/g, "")
        .replace(/[^0-9]/g, "")
    );

    if (!valor) {
      return ctx.reply(
        ctx.mess.coinsGerenciarUso(ctx.prefix, ctx.command)
      );
    }

    const usuario = r.eco(ctx, alvo);
    const remover = /remove|tirar/.test(ctx.command);

    usuario.coins = Math.max(
      0,
      Number(usuario.coins || 0) +
      (remover ? -valor : valor)
    );

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.coinsGerenciado(
        alvo,
        usuario.coins,
        remover
      ),
      [alvo]
    );
  },
});
