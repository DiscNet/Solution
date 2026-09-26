const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");
const { compacto, dinheiro } = require("../../sistemas/rpg/texto");

module.exports = comandos.setCommand({
  nome: "doarcoins",
  comandos: ["doarcoins"],
  categoria: "coins",
  info: {
    descricao: "Transfere N-Coins para outro usuário.",
    uso: "doarcoins 100 @usuario",
    requisitos: "Modo Coins",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temCoins(ctx)) return ctx.reply(ctx.mess.coinsDesativado(ctx.prefix));

    const dados = await ctx.destino().catch(() => null);
    const alvo = dados?.mencao ? ctx.normalizar(dados.mencao) : null;
    const valor = Number(
      String(ctx.q || "")
        .replace(/@\S+/g, "")
        .replace(/[^0-9]/g, "")
    );

    if (!alvo || !valor) {
      return ctx.reply(
        compacto(ctx, "🪙", "Doar Coins", [
          { emoji: "📌", texto: ctx.prefix + "doarcoins 100 @usuario" },
        ])
      );
    }

    if (alvo === ctx.normalizar(ctx.sender)) {
      return ctx.reply(ctx.mess.coinsDoarMesmo());
    }

    const origem = r.eco(ctx);
    const destino = r.eco(ctx, alvo);

    if (origem.coins < valor) {
      return ctx.reply(ctx.mess.coinsSemSaldo(valor, origem.coins));
    }

    origem.coins -= valor;
    destino.coins += valor;
    r.salvar(ctx);

    return ctx.reply(
      compacto(ctx, "💸", "Transferência concluída", [
        { emoji: "👤", texto: "Para: @" + alvo.split("@")[0] },
        { emoji: "🪙", texto: "Valor: " + dinheiro(valor) },
        { emoji: "💰", texto: "Saldo: " + dinheiro(origem.coins) },
      ]),
      [alvo]
    );
  },
});
