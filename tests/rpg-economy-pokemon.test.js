const test = require("node:test");
const assert = require("node:assert/strict");

const economy = require("../functions/economySystem");
const pokemon = require("../functions/pokemonSystem");
const economyCommands = require("../commands/rpg/economia");
const pokemonCommands = require("../commands/rpg/pokemon");
const modoCoins = require("../commands/admins/modocoins");

test("modo coins exige grupo e admin", () => {
  assert.equal(modoCoins.name, "modocoins");
  assert.deepEqual(modoCoins.permissions, { group: true, admin: true });
});

test("economia compartilhada expõe comandos principais sem duplicar trabalhar", () => {
  const names = new Set(economyCommands.map((command) => command.name));
  for (const name of ["coins", "doarcoins", "rankcoins", "dailycoins", "cassino"]) {
    assert.ok(names.has(name), `faltando: ${name}`);
  }
  assert.equal(names.has("trabalhar"), false);
  assert.equal(economy.format(1234), "1.234 Coins");
});

test("catálogo Pokémon tem compra, evolução e comida", () => {
  assert.ok(pokemon.POKEMON.pikachu);
  assert.ok(pokemon.POKEMON.charmander);
  assert.ok(pokemon.FOOD.berry);
  const created = pokemon.createPokemon("pikachu");
  assert.equal(created.level, 1);
  assert.equal(created.hunger, 100);
  created.level = 12;
  const evo = pokemon.canEvolve(created);
  assert.equal(evo.ok, true);
  assert.equal(evo.target, "raichu");
});

test("comandos Pokémon cobrem o ciclo principal", () => {
  const names = new Set(pokemonCommands.map((command) => command.name));
  for (const name of [
    "lojapokemon",
    "comprarpokemon",
    "verpokemon",
    "apelidopokemon",
    "mercadopokemon",
    "comprarcomidapokemon",
    "inventariopokemon",
    "alimentarpokemon",
    "carinhopokemon",
    "missaopokemon",
    "evoluirpokemon",
    "venderpokemon",
    "rankpokemon",
  ]) {
    assert.ok(names.has(name), `faltando: ${name}`);
  }
});
