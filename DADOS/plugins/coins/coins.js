const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "coins",
  comandos: ["coins"],
  categoria: "coins",
  info: {
    descricao: "Mostra saldo e estatísticas de N-Coins.",
    uso: "coins",
    requisitos: "Modo Coins",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temCoins(ctx)) return ctx.reply(ctx.mess.coinsDesativado(ctx.prefix));

    const usuario = r.eco(ctx);
    const minerar = Number(usuario.chances?.minerar || 0);
    const cassino = Number(usuario.chances?.cassino || 0);
    const banco = Number(usuario.cidade?.saldoBanco || 0);

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.coinsCard(
        ctx.sender,
        usuario.coins,
        banco,
        minerar,
        cassino,
        ctx.prefix
      ),
      [ctx.sender]
    );
  },
});
