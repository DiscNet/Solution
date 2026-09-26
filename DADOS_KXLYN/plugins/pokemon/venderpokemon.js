const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");

module.exports = dylan.setCommand({
  nome: "venderpokemon",
  comandos: ["venderpokemon", "venderpoke"],
  categoria: "pokemon",
  info: {
    descricao: "Vende seu Pokémon.",
    uso: "venderpokemon",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const usuario = r.user(ctx);
    const pokemon = usuario.pokemon;

    if (!pokemon) return ctx.reply(ctx.mess.pokemonNaoTem(ctx.prefix));

    const dados = r.POKEMON[pokemon.tipo] || {};
    const valor = Math.max(
      100,
      Math.floor(
        Number(dados.preco || 1000) *
        0.65 *
        (1 + Math.min(1.5, Number(pokemon.nivel || 1) / 100))
      )
    );

    const economia = r.eco(ctx);
    economia.coins += valor;
    usuario.pokemon = null;

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.pokemonVendido(valor, economia.coins)
    );
  },
});
