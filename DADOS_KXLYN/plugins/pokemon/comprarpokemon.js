const r = require("../../sistemas/rpg/index");
const dylan = require("../../database/lib/comandos");

module.exports = dylan.setCommand({
  nome: "comprarpokemon",
  comandos: ["comprarpokemon", "comprarpoke"],
  categoria: "pokemon",
  info: {
    descricao: "Compra um Pokémon.",
    uso: "comprarpokemon pikachu",
    requisitos: "RPG + Coins",
    categoria: "pokemon",
  },

  async executar(ctx) {
    if (!ctx.isGroup) return ctx.reply(ctx.mess.sogrupo());
    if (!r.ambos(ctx)) return ctx.reply(ctx.mess.rpgCoinsDesativado(ctx.prefix));

    const tipo = String(ctx.args?.[0] || "").toLowerCase();
    const dados = r.POKEMON[tipo];

    if (!dados) return ctx.reply(ctx.mess.pokemonInvalido(ctx.prefix));

    const usuario = r.user(ctx);
    const economia = r.eco(ctx);

    if (usuario.pokemon) return ctx.reply(ctx.mess.pokemonJaTem());

    if (economia.coins < dados.preco) {
      return ctx.reply(
        ctx.mess.coinsSemSaldo(dados.preco, economia.coins)
      );
    }

    economia.coins -= dados.preco;

    usuario.pokemon = {
      tipo,
      apelido: null,
      fome: 100,
      energia: 100,
      saude: 100,
      xp: 0,
      nivel: 1,
      afeto: 0,
      missoes: 0,
      vitorias: 0,
      dormindo: false,
      diario: [],
      criadoEm: Date.now(),
      ultimaComida: Date.now(),
      ultimaMissao: 0,
      ultimoCarinho: 0,
      ultimoBanho: 0,
      ultimoPasseio: 0,
      ultimoEvento: 0,
      ultimaBatalha: 0,
    };

    r.salvar(ctx);

    return ctx.reply(
      ctx.mess.pokemonComprado(dados, economia.coins)
    );
  },
});
