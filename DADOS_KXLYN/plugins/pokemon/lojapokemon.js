const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");

module.exports = dylan.setCommand({
  nome: "lojapokemon",
  comandos: ["lojapokemon", "lojapoke", "pokeshop", "lojararospokemon", "lojararospoke"],
  categoria: "pokemon",
  info: {
    descricao: "Mostra a loja de Pokémon.",
    uso: "lojapokemon",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const raros = String(ctx.command || "").includes("raro");
    const itens = Object.entries(r.POKEMON).filter(([, pokemon]) => {
      if (raros) return ["Raro", "Lendário"].includes(pokemon.raridade);
      return pokemon.raridade === "Comum";
    });

    return ctx.reply(
      ctx.mess.pokemonShop(itens, ctx.prefix, raros)
    );
  },
});
