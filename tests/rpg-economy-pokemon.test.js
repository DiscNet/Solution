const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("path");

const r = require("../DADOS_KXLYN/sistemas/rpg");
const modoCoins = require("../DADOS_KXLYN/plugins/coins/modocoins");
const modoRpg = require("../DADOS_KXLYN/plugins/rpg/modorpg");
const { loadProjectCommandModules, buildCommandRegistry } = require("../functions/commandRegistry");

test("modos RPG e Coins usam permissões de grupo/admin", () => {
  assert.equal(modoCoins.name, "modocoins");
  assert.deepEqual(modoCoins.permissions, { group: true, admin: true });
  assert.equal(modoRpg.name, "modorpg");
  assert.deepEqual(modoRpg.permissions, { group: true, admin: true });
});

test("núcleo Kxlyn expõe catálogos integrados", () => {
  assert.ok(r.CLASSES_RPG.guerreiro);
  assert.ok(r.ARMAS_RPG.espada);
  assert.ok(r.COINS_LOJA.escudo);
  assert.ok(r.CIDADE_EMPREGOS.programador);
  assert.ok(r.POKEMON.pikachu);
  assert.ok(r.POKEMON_COMIDA.berry);
  assert.equal(r.POKEMON.pikachu.evolui, "raichu");
});

test("plugins Kxlyn registram ciclo principal de RPG Coins e Pokémon", () => {
  const root = path.join(__dirname, "..");
  const loaded = loadProjectCommandModules(root, { clearCache: true });
  assert.equal(loaded.errors.length, 0);

  const built = buildCommandRegistry(loaded.records);
  const registry = built.registry;

  for (const name of [
    "modorpg",
    "jornada",
    "arsenal",
    "boss",
    "guilda",
    "level",
    "ranklevel",
    "modocoins",
    "coins",
    "minerar",
    "trabalharcoins",
    "cassino",
    "lojacoins",
    "cidade",
    "banco",
    "rankcoins",
    "lojapokemon",
    "comprarpokemon",
    "verpokemon",
    "mercadopokemon",
    "alimentarpokemon",
    "carinhopokemon",
    "batalhapokemon",
    "missaopokemon",
    "evoluirpokemon",
    "venderpokemon",
    "rankpokemon",
  ]) {
    assert.ok(registry[name], "faltando: " + name);
  }
});
