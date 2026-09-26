const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");

module.exports = dylan.setCommand({
  nome: "apelidopokemon",
  comandos: ["apelidopokemon", "apelidopoke", "nomepokemon"],
  categoria: "pokemon",
  info: {
    descricao: "Altera o apelido do seu Pokémon.",
    uso: "apelidopokemon novo nome",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const pokemon = r.user(ctx).pokemon;
    if (!pokemon) return ctx.reply(ctx.mess.pokemonNaoTem(ctx.prefix));

    const nome = ctx.args.join(" ").trim().slice(0, 24);
    if (!nome) return ctx.reply(ctx.mess.pokemonApelidoUso(ctx.prefix));

    pokemon.apelido = nome;
    r.salvar(ctx);

    return ctx.reply(ctx.mess.pokemonApelido(nome));
  },
});
