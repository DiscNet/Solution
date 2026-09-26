const r = require("../../sistemas/rpg/index");
const comandos = require("../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "verpokemon",
  comandos: ["verpokemon", "verpoke", "pokemon", "meupokemon"],
  categoria: "pokemon",
  info: {
    descricao: "Mostra seu Pokémon e seus status.",
    uso: "verpokemon",
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
    const texto = ctx.mess.pokemonPerfil(ctx.sender, pokemon, dados);
    const imagem = r.imagemPokemon(pokemon.tipo);

    if (imagem) {
      try {
        return await ctx.tokito.sendMessage(
          ctx.from,
          {
            image: { url: imagem },
            caption: texto,
            mentions: [ctx.sender],
            contextInfo: ctx.canalInfo([ctx.sender]),
          },
          { quoted: ctx.selo }
        );
      } catch {}
    }

    return ctx.reply(texto, [ctx.sender]);
  },
});
