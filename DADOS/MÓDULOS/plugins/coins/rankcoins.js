const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "rankcoins",
  comandos: ["rankcoins", "rankingcoins"],
  categoria: "coins",
  info: {
    descricao: "Mostra o ranking de N-Coins do grupo.",
    uso: "rankcoins",
    requisitos: "Modo Coins",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temCoins(ctx)) return ctx.reply(ctx.mess.coinsDesativado(ctx.prefix));

    const lista = r.rank(ctx, "coins").slice(0, 10);

    return ctx.reply(
      ctx.mess.coinsRank(lista),
      lista.map(item => item.jid)
    );
  },
});
