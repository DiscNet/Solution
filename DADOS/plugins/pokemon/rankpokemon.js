const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "rankpokemon",
  comandos: ["rankpokemon", "rankpoke"],
  categoria: "pokemon",
  info: {
    descricao: "Mostra o ranking Pokémon do grupo.",
    uso: "rankpokemon",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const grupo = r.garantir(ctx);

    const lista = Object.entries(grupo.rpg.usuarios)
      .filter(([, usuario]) => usuario?.pokemon)
      .map(([jid, usuario]) => {
        r.normalizarPokemon(usuario.pokemon);
        const pokemon = usuario.pokemon;
        const dados = r.POKEMON[pokemon.tipo] || {};
        const bonus =
          dados.raridade === "Lendário" ? 3000 :
          dados.raridade === "Raro" ? 1600 :
          dados.raridade === "Evoluído" ? 900 : 0;

        return {
          jid,
          u: usuario,
          valor:
            pokemon.xp +
            pokemon.afeto * 20 +
            pokemon.vitorias * 120 +
            bonus,
        };
      })
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 10);

    return ctx.reply(
      ctx.mess.pokemonRank(lista),
      lista.map(item => item.jid)
    );
  },
});
