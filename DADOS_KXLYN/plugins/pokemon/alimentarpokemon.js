const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");

module.exports = dylan.setCommand({
  nome: "alimentarpokemon",
  comandos: ["alimentarpokemon", "alimentarpoke"],
  categoria: "pokemon",
  info: {
    descricao: "Alimenta seu Pokémon usando o inventário.",
    uso: "alimentarpokemon berry",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const usuario = r.user(ctx);
    const pokemon = usuario.pokemon;

    if (!pokemon) return ctx.reply(ctx.mess.pokemonNaoTem(ctx.prefix));

    const id = String(ctx.args?.[0] || "").toLowerCase();
    const comida = r.POKEMON_COMIDA[id];

    if (!comida) {
      return ctx.reply(
        ctx.mess.pokemonComidas(r.POKEMON_COMIDA, ctx.prefix)
      );
    }

    if (Number(usuario.inventarioPokemon[id] || 0) <= 0) {
      return ctx.reply(
        ctx.mess.padraoAviso({
          titulo: "Comida indisponível",
          linhas: [
            "Compre usando " + ctx.prefix + "comprarcomidapokemon " + id,
          ],
        })
      );
    }

    r.normalizarPokemon(pokemon);

    usuario.inventarioPokemon[id] -= 1;
    pokemon.fome = r.limitar(pokemon.fome + comida.fome);
    pokemon.energia = r.limitar(pokemon.energia + Math.ceil(comida.fome / 6));
    pokemon.afeto += 2;
    pokemon.ultimaComida = Date.now();

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.pokemonAlimentado(
        comida,
        pokemon,
        r.eco(ctx).coins
      )
    );
  },
});
