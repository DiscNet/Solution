const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");

module.exports = dylan.setCommand({
  nome: "minerar",
  comandos: ["minerar", "mine"],
  categoria: "coins",
  info: {
    descricao: "Minera N-Coins com tempo de espera.",
    uso: "minerar",
    requisitos: "Modo Coins",
    categoria: "coins",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.temCoins(ctx)) return ctx.reply(ctx.mess.coinsDesativado(ctx.prefix));

    const usuario = r.eco(ctx);
    const agora = Date.now();
    const cooldown = 5 * 60 * 1000;
    const decorrido = agora - Number(usuario.ultimoMinerar || 0);

    if (decorrido < cooldown) {
      return ctx.reply(
        ctx.mess.coinsCooldown(
          Math.ceil((cooldown - decorrido) / 1000)
        )
      );
    }

    const bonus = Math.min(300, Number(usuario.chances?.minerar || 0) * 5);
    const ganho = r.aleatorio(120, 420) + bonus;

    usuario.coins += ganho;
    usuario.ultimoMinerar = agora;
    usuario.chances.minerar = Number(usuario.chances.minerar || 0) + 1;

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.coinsMinerado(ctx.sender, ganho, usuario.coins),
      [ctx.sender]
    );
  },
});
