const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "evoluirpokemon",
  comandos: ["evoluirpokemon", "evoluirpoke"],
  categoria: "pokemon",
  info: {
    descricao: "Evolui seu Pokémon ao atingir o nível necessário.",
    uso: "evoluirpokemon",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const pokemon = r.user(ctx).pokemon;
    if (!pokemon) return ctx.reply(ctx.mess.pokemonNaoTem(ctx.prefix));

    r.normalizarPokemon(pokemon);
    const dados = r.POKEMON[pokemon.tipo] || {};

    if (!dados.evolui) return ctx.reply(ctx.mess.pokemonNaoEvolui());
    if (pokemon.nivel < dados.nivel) {
      return ctx.reply(ctx.mess.pokemonNivelEvoluir(dados.nivel));
    }

    const anterior = dados.nome || pokemon.tipo;
    pokemon.tipo = dados.evolui;
    pokemon.afeto += 10;
    pokemon.saude = 100;
    pokemon.energia = 100;

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.pokemonEvoluiu(
        anterior,
        r.POKEMON[pokemon.tipo]?.nome || pokemon.tipo
      )
    );
  },
});
