const r = require("../../sistemas/rpg/index");
const comandos = require("../../../database/lib/comandos");

module.exports = comandos.setCommand({
  nome: "missaopokemon",
  comandos: ["missaopokemon", "missaopoke"],
  categoria: "pokemon",
  info: {
    descricao: "Envia seu Pokémon em uma missão e recebe N-Coins e XP.",
    uso: "missaopokemon",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const usuario = r.user(ctx);
    const pokemon = usuario.pokemon;

    if (!pokemon) return ctx.reply(ctx.mess.pokemonNaoTem(ctx.prefix));

    r.normalizarPokemon(pokemon);

    const cooldown = 10 * 60 * 1000;
    const decorrido = Date.now() - Number(pokemon.ultimaMissao || 0);

    if (decorrido < cooldown) {
      return ctx.reply(
        ctx.mess.coinsCooldown(
          Math.ceil((cooldown - decorrido) / 1000)
        )
      );
    }

    if (pokemon.energia < 15) {
      return ctx.reply(
        ctx.mess.padraoAviso({
          titulo: "Pokémon cansado",
          linhas: [
            "Energia atual: " + pokemon.energia + "%",
            "Use " + ctx.prefix + "dormirpokemon",
          ],
        })
      );
    }

    const dados = r.POKEMON[pokemon.tipo] || {};
    const bonus =
      dados.raridade === "Lendário" ? 350 :
      dados.raridade === "Raro" ? 180 :
      dados.raridade === "Evoluído" ? 100 : 0;

    const ganho = r.aleatorio(300, 1300) + bonus;
    const xp = r.aleatorio(40, 100);
    const economia = r.eco(ctx);

    economia.coins += ganho;
    pokemon.xp += xp;
    pokemon.nivel = 1 + Math.floor(pokemon.xp / 100);
    pokemon.fome = r.limitar(pokemon.fome - 20);
    pokemon.energia = r.limitar(pokemon.energia - 15);
    pokemon.missoes += 1;
    pokemon.ultimaMissao = Date.now();

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.pokemonMissao(
        pokemon,
        ganho,
        xp,
        economia.coins
      )
    );
  },
});
