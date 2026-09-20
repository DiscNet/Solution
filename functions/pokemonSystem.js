const fs = require("fs");
const path = require("path");
const { RPG_DB } = require("./rpgIdentity");
const economy = require("./economySystem");

const POKEMON = Object.freeze({
  pikachu: { name: "Pikachu", emoji: "⚡", type: "Elétrico", rarity: "Comum", price: 3200, sprite: 25, evolve: "raichu", evolveLevel: 12 },
  bulbasaur: { name: "Bulbasaur", emoji: "🌿", type: "Planta", rarity: "Comum", price: 2600, sprite: 1, evolve: "ivysaur", evolveLevel: 12 },
  ivysaur: { name: "Ivysaur", emoji: "🌿", type: "Planta", rarity: "Evoluído", price: 9000, sprite: 2, evolve: "venusaur", evolveLevel: 24 },
  venusaur: { name: "Venusaur", emoji: "🌺", type: "Planta/Veneno", rarity: "Evoluído", price: 16000, sprite: 3 },
  charmander: { name: "Charmander", emoji: "🔥", type: "Fogo", rarity: "Comum", price: 3000, sprite: 4, evolve: "charmeleon", evolveLevel: 12 },
  charmeleon: { name: "Charmeleon", emoji: "🔥", type: "Fogo", rarity: "Evoluído", price: 10500, sprite: 5, evolve: "charizard", evolveLevel: 28 },
  charizard: { name: "Charizard", emoji: "🐲", type: "Fogo/Voador", rarity: "Raro", price: 24000, sprite: 6 },
  squirtle: { name: "Squirtle", emoji: "💧", type: "Água", rarity: "Comum", price: 2700, sprite: 7, evolve: "wartortle", evolveLevel: 12 },
  wartortle: { name: "Wartortle", emoji: "💧", type: "Água", rarity: "Evoluído", price: 9500, sprite: 8, evolve: "blastoise", evolveLevel: 24 },
  blastoise: { name: "Blastoise", emoji: "🌊", type: "Água", rarity: "Evoluído", price: 16000, sprite: 9 },
  eevee: { name: "Eevee", emoji: "🦊", type: "Normal", rarity: "Comum", price: 4700, sprite: 133, evolve: "umbreon", evolveLevel: 18 },
  umbreon: { name: "Umbreon", emoji: "🌙", type: "Sombrio", rarity: "Raro", price: 18000, sprite: 197 },
  raichu: { name: "Raichu", emoji: "⚡", type: "Elétrico", rarity: "Evoluído", price: 17000, sprite: 26 },
  gengar: { name: "Gengar", emoji: "👻", type: "Fantasma/Veneno", rarity: "Raro", price: 28000, sprite: 94 },
  snorlax: { name: "Snorlax", emoji: "😴", type: "Normal", rarity: "Raro", price: 22000, sprite: 143 },
  dragonite: { name: "Dragonite", emoji: "🐉", type: "Dragão/Voador", rarity: "Lendário", price: 48000, sprite: 149 },
  mewtwo: { name: "Mewtwo", emoji: "🧠", type: "Psíquico", rarity: "Lendário", price: 65000, sprite: 150 },
  lucario: { name: "Lucario", emoji: "🥊", type: "Lutador/Aço", rarity: "Raro", price: 31000, sprite: 448 },
  greninja: { name: "Greninja", emoji: "🥷", type: "Água/Sombrio", rarity: "Raro", price: 34000, sprite: 658 },
});

const FOOD = Object.freeze({
  berry: { name: "Berry", emoji: "🍓", price: 220, hunger: 25 },
  superberry: { name: "Super Berry", emoji: "🫐", price: 480, hunger: 50 },
  vitaminapoke: { name: "Vitamina Pokémon", emoji: "🧃", price: 750, hunger: 30, affection: 8 },
  banquete: { name: "Banquete Pokémon", emoji: "🍱", price: 1300, hunger: 80, affection: 12 },
});

const BUYABLE = Object.freeze([
  "pikachu", "bulbasaur", "charmander", "squirtle", "eevee",
  "gengar", "snorlax", "lucario", "greninja", "dragonite", "mewtwo",
]);

function readDb() {
  try {
    const data = JSON.parse(fs.readFileSync(RPG_DB, "utf8"));
    if (!data.usuarios || typeof data.usuarios !== "object") data.usuarios = {};
    return data;
  } catch (_) {
    return { usuarios: {} };
  }
}

function writeDb(db) {
  fs.mkdirSync(path.dirname(RPG_DB), { recursive: true });
  const tmp = `${RPG_DB}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, RPG_DB);
}

function getUser(jid) {
  const db = readDb();
  const user = db.usuarios[jid] || null;
  if (!user) return { db, user: null };
  if (!user.inventarioPokemon || typeof user.inventarioPokemon !== "object") user.inventarioPokemon = {};
  if (user.pokemon === undefined) user.pokemon = null;
  return { db, user };
}

function saveUser(jid, user, db = null) {
  const target = db || readDb();
  target.usuarios[jid] = user;
  writeDb(target);
  return user;
}

function spriteUrl(id) {
  if (!id) return null;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function pokemonData(pokemon) {
  return pokemon ? POKEMON[pokemon.species] || null : null;
}

function createPokemon(species) {
  const data = POKEMON[species];
  if (!data) return null;
  return {
    species,
    nickname: null,
    level: 1,
    xp: 0,
    hunger: 100,
    affection: 0,
    health: 100,
    createdAt: Date.now(),
    lastFed: Date.now(),
    lastCare: 0,
    lastMission: 0,
    missions: 0,
  };
}

function levelFromXp(xp) {
  return 1 + Math.floor(Math.max(0, Number(xp || 0)) / 100);
}

function normalizePokemon(pokemon) {
  if (!pokemon || typeof pokemon !== "object") return pokemon;
  pokemon.level = Math.max(1, Number(pokemon.level || levelFromXp(pokemon.xp)));
  pokemon.xp = Math.max(0, Number(pokemon.xp || 0));
  pokemon.hunger = Math.max(0, Math.min(100, Number(pokemon.hunger ?? 100)));
  pokemon.affection = Math.max(0, Math.min(100, Number(pokemon.affection || 0)));
  pokemon.health = Math.max(0, Math.min(100, Number(pokemon.health ?? 100)));
  pokemon.missions = Math.max(0, Number(pokemon.missions || 0));
  return pokemon;
}

function canEvolve(pokemon) {
  const data = pokemonData(pokemon);
  if (!data?.evolve) return { ok: false, reason: "final" };
  if (Number(pokemon.level || 1) < Number(data.evolveLevel || 999)) {
    return { ok: false, reason: "level", required: data.evolveLevel };
  }
  return { ok: true, target: data.evolve };
}

function marketLines() {
  return BUYABLE.map((id) => {
    const p = POKEMON[id];
    return `${p.emoji} *${p.name}* — ${economy.format(p.price)}\n   ${p.type} • ${p.rarity}`;
  });
}

function foodLines() {
  return Object.entries(FOOD).map(([id, item]) =>
    `${item.emoji} *${item.name}* (${id}) — ${economy.format(item.price)} • +${item.hunger} fome`
  );
}

function rank(limit = 10) {
  const db = readDb();
  return Object.entries(db.usuarios)
    .filter(([, user]) => user?.pokemon)
    .map(([jid, user]) => {
      const pokemon = normalizePokemon(user.pokemon);
      const data = pokemonData(pokemon) || {};
      const score = Number(pokemon.level || 1) * 100 + Number(pokemon.xp || 0) + Number(pokemon.affection || 0) * 2;
      return { jid, user, pokemon, data, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(50, Number(limit) || 10)));
}

module.exports = {
  POKEMON,
  FOOD,
  BUYABLE,
  readDb,
  writeDb,
  getUser,
  saveUser,
  spriteUrl,
  pokemonData,
  createPokemon,
  normalizePokemon,
  levelFromXp,
  canEvolve,
  marketLines,
  foodLines,
  rank,
};
