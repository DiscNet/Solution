// Menu: RPG - Pokémon | Sistema inspirado no fluxo da Tokito, com visual do Solution.
const config = require("../../config/config");
const rpgSystem = require("../../functions/rpgSystem");
const economy = require("../../functions/economySystem");
const poke = require("../../functions/pokemonSystem");
const { createStatusQuoted } = require("../../functions/statusCard");

const CARE_CD = 5 * 60 * 1000;
const MISSION_CD = 10 * 60 * 1000;

function ensureGroup(from) {
  if (!String(from || "").endsWith("@g.us")) {
    const e = new Error("Este comando só funciona em grupos.");
    e.userMessage = e.message;
    throw e;
  }
}

function ensureSystems(from) {
  ensureGroup(from);
  if (!rpgSystem.isRpgAtivo(from) || !economy.isEnabled(from)) {
    const prefix = config.prefix || ".";
    const e = new Error(
      `Pokémon precisa dos dois sistemas ativos: *RPG + Coins*.\n\n⚔️ ${prefix}rpgsystem on\n🪙 ${prefix}modocoins on`
    );
    e.userMessage = e.message;
    throw e;
  }
}

function current(msg, from) {
  const jid = economy.actorJid(msg, from);
  const { db, user } = poke.getUser(jid);
  return { jid, db, user };
}

function requirePlayer(msg, from) {
  const state = current(msg, from);
  if (!state.user) {
    const e = new Error(`Você ainda não está registrado no RPG. Use ${config.prefix || "."}registro.`);
    e.userMessage = e.message;
    throw e;
  }
  return state;
}

function requirePokemon(msg, from) {
  const state = requirePlayer(msg, from);
  if (!state.user.pokemon) {
    const e = new Error(`Você ainda não possui Pokémon. Use ${config.prefix || "."}lojapokemon.`);
    e.userMessage = e.message;
    throw e;
  }
  poke.normalizePokemon(state.user.pokemon);
  return state;
}

function remaining(last, cd) {
  return Math.max(0, cd - (Date.now() - Number(last || 0)));
}

function time(ms) {
  const sec = Math.ceil(ms / 1000);
  const min = Math.floor(sec / 60);
  return min ? `${min}m ${sec % 60}s` : `${sec}s`;
}

function displayName(pokemon) {
  const data = poke.pokemonData(pokemon) || {};
  return pokemon.nickname || data.name || pokemon.species || "Pokémon";
}

function tag(jid) {
  return `@${String(jid || "").split("@")[0].split(":")[0]}`;
}

async function reply(conn, msg, from, text, mentions = []) {
  return conn.sendMessage(from, {
    text,
    ...(mentions.length ? { mentions } : {}),
  }, { quoted: createStatusQuoted(msg) });
}

async function sendProfile(conn, msg, from, jid, pokemon) {
  const data = poke.pokemonData(pokemon) || {};
  const evolution = poke.canEvolve(pokemon);
  const next = evolution.ok ? poke.POKEMON[evolution.target] : null;
  const evolutionText = next
    ? `${next.name} disponível agora`
    : data.evolve
      ? `${poke.POKEMON[data.evolve]?.name || data.evolve} no nível ${data.evolveLevel}`
      : "evolução final";

  const caption =
    `${data.emoji || "🧿"} *ᴘᴏᴋᴇ́ᴍᴏɴ ᴅᴇ ${tag(jid)}*\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🎴 ɴᴏᴍᴇ: *${displayName(pokemon)}*\n` +
    `🧬 ᴇsᴘᴇ́ᴄɪᴇ: *${data.name || pokemon.species}*\n` +
    `✨ ᴛɪᴘᴏ: *${data.type || "?"}*\n` +
    `💎 ʀᴀʀɪᴅᴀᴅᴇ: *${data.rarity || "?"}*\n` +
    `📊 ɴɪ́ᴠᴇʟ: *${pokemon.level}*\n` +
    `📈 xᴘ: *${pokemon.xp}*\n` +
    `🍗 ғᴏᴍᴇ: *${pokemon.hunger}%*\n` +
    `❤️ sᴀᴜ́ᴅᴇ: *${pokemon.health}%*\n` +
    `💞 ᴀғᴇᴛᴏ: *${pokemon.affection}%*\n` +
    `🧭 ᴍɪssᴏ̃ᴇs: *${pokemon.missions}*\n` +
    `🧬 ᴇᴠᴏʟᴜᴄ̧ᴀ̃ᴏ: *${evolutionText}*\n` +
    `━━━━━━━━━━━━━━━━━━━━`;

  const image = poke.spriteUrl(data.sprite);
  if (image) {
    try {
      return await conn.sendMessage(from, {
        image: { url: image },
        caption,
        mentions: [jid],
      }, { quoted: createStatusQuoted(msg) });
    } catch (_) {}
  }
  return reply(conn, msg, from, caption, [jid]);
}

const commands = [
  {
    name: "lojapokemon",
    aliases: ["pokemonloja", "lojapoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "lojapokemon",
    description: "mostra os Pokémon disponíveis para compra",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        return reply(conn, msg, from,
          `🏪 *ʟᴏᴊᴀ ᴘᴏᴋᴇ́ᴍᴏɴ*\n\n` +
          `${poke.marketLines().join("\n\n")}\n\n` +
          `━━━━━━━━━━━━━━━━━━━━\n` +
          `📌 ${config.prefix || "."}comprarpokemon pikachu`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível abrir a loja Pokémon."}`);
      }
    },
  },

  {
    name: "comprarpokemon",
    aliases: ["comprarpoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "comprarpokemon nome",
    description: "compra um Pokémon usando Coins",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePlayer(msg, from);
        if (user.pokemon) throw Object.assign(new Error(), { userMessage: "Você já possui um Pokémon. Venda o atual antes de comprar outro." });

        const id = String(args?.[0] || "").toLowerCase();
        if (!poke.BUYABLE.includes(id)) throw Object.assign(new Error(), { userMessage: `Pokémon inválido. Use ${config.prefix || "."}lojapokemon.` });

        const data = poke.POKEMON[id];
        const wallet = economy.reconcileUser(jid);
        if (wallet.coins < data.price) {
          throw Object.assign(new Error(), { userMessage: `Saldo insuficiente. Necessário: ${economy.format(data.price)}. Você possui ${economy.format(wallet.coins)}.` });
        }

        wallet.coins -= data.price;
        economy.saveUser(wallet);
        user.pokemon = poke.createPokemon(id);
        poke.saveUser(jid, user, db);

        return reply(conn, msg, from,
          `${data.emoji} *ᴘᴏᴋᴇ́ᴍᴏɴ ᴀᴅǫᴜɪʀɪᴅᴏ!*\n\n` +
          `🎴 ${data.name}\n` +
          `✨ ${data.type} • ${data.rarity}\n` +
          `💸 ᴄᴜsᴛᴏ: *${economy.format(data.price)}*\n` +
          `🪙 sᴀʟᴅᴏ: *${economy.format(wallet.coins)}*\n\n` +
          `> Use ${config.prefix || "."}verpokemon para ver seu companheiro.`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível comprar o Pokémon."}`);
      }
    },
  },

  {
    name: "verpokemon",
    aliases: ["verpoke", "pokemon", "meupokemon"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "verpokemon",
    description: "mostra os status do seu Pokémon",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, user } = requirePokemon(msg, from);
        return sendProfile(conn, msg, from, jid, user.pokemon);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível mostrar o Pokémon."}`);
      }
    },
  },

  {
    name: "apelidopokemon",
    aliases: ["nomearpokemon", "apelidopoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "apelidopokemon nome",
    description: "define um apelido para seu Pokémon",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePokemon(msg, from);
        const nickname = args.join(" ").trim().slice(0, 24);
        if (!nickname) throw Object.assign(new Error(), { userMessage: "Informe um apelido de até 24 caracteres." });
        user.pokemon.nickname = nickname;
        poke.saveUser(jid, user, db);
        return reply(conn, msg, from, `🏷️ Seu Pokémon agora se chama *${nickname}*.`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível alterar o apelido."}`);
      }
    },
  },

  {
    name: "mercadopokemon",
    aliases: ["mercadopoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "mercadopokemon",
    description: "mostra comidas disponíveis para Pokémon",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        return reply(conn, msg, from,
          `🍱 *ᴍᴇʀᴄᴀᴅᴏ ᴘᴏᴋᴇ́ᴍᴏɴ*\n\n` +
          `${poke.foodLines().join("\n\n")}\n\n` +
          `📌 ${config.prefix || "."}comprarcomidapokemon berry 2`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível abrir o mercado."}`);
      }
    },
  },

  {
    name: "comprarcomidapokemon",
    aliases: ["comprarcomidapoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "comprarcomidapokemon item quantidade",
    description: "compra comida para o inventário Pokémon",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePlayer(msg, from);
        const id = String(args?.[0] || "").toLowerCase();
        const item = poke.FOOD[id];
        const qty = Math.max(1, Math.min(20, Number(args?.[1] || 1)));
        if (!item || !Number.isInteger(qty)) throw Object.assign(new Error(), { userMessage: `Item inválido. Use ${config.prefix || "."}mercadopokemon.` });

        const total = item.price * qty;
        const wallet = economy.reconcileUser(jid);
        if (wallet.coins < total) throw Object.assign(new Error(), { userMessage: `Saldo insuficiente. Necessário: ${economy.format(total)}.` });

        wallet.coins -= total;
        economy.saveUser(wallet);
        user.inventarioPokemon[id] = Number(user.inventarioPokemon[id] || 0) + qty;
        poke.saveUser(jid, user, db);

        return reply(conn, msg, from,
          `${item.emoji} *ᴄᴏᴍᴘʀᴀ ᴘᴏᴋᴇ́ᴍᴏɴ*\n\n` +
          `📦 ${item.name} x${qty}\n` +
          `💸 ${economy.format(total)}\n` +
          `🎒 ɪɴᴠᴇɴᴛᴀ́ʀɪᴏ: *${user.inventarioPokemon[id]}*\n` +
          `🪙 sᴀʟᴅᴏ: *${economy.format(wallet.coins)}*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível comprar a comida."}`);
      }
    },
  },

  {
    name: "inventariopokemon",
    aliases: ["inventariopoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "inventariopokemon",
    description: "mostra o inventário de comida do sistema Pokémon",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { user } = requirePlayer(msg, from);
        const items = Object.entries(user.inventarioPokemon || {}).filter(([, qty]) => Number(qty) > 0);
        if (!items.length) return reply(conn, msg, from, `🎒 Seu inventário Pokémon está vazio. Use ${config.prefix || "."}mercadopokemon.`);
        const lines = items.map(([id, qty]) => `${poke.FOOD[id]?.emoji || "📦"} ${poke.FOOD[id]?.name || id}: *x${qty}*`);
        return reply(conn, msg, from, `🎒 *ɪɴᴠᴇɴᴛᴀ́ʀɪᴏ ᴘᴏᴋᴇ́ᴍᴏɴ*\n\n${lines.join("\n")}`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível abrir o inventário."}`);
      }
    },
  },

  {
    name: "alimentarpokemon",
    aliases: ["alimentarpoke", "darcomidapokemon"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "alimentarpokemon item",
    description: "alimenta seu Pokémon usando o inventário",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePokemon(msg, from);
        const id = String(args?.[0] || "").toLowerCase();
        const item = poke.FOOD[id];
        if (!item) throw Object.assign(new Error(), { userMessage: `Comida inválida. Use ${config.prefix || "."}inventariopokemon.` });
        if (Number(user.inventarioPokemon[id] || 0) <= 0) throw Object.assign(new Error(), { userMessage: "Você não possui esse item no inventário." });

        const p = user.pokemon;
        user.inventarioPokemon[id] -= 1;
        p.hunger = Math.min(100, Number(p.hunger || 0) + item.hunger);
        p.affection = Math.min(100, Number(p.affection || 0) + Number(item.affection || 3));
        p.health = Math.min(100, Number(p.health || 100) + 3);
        p.lastFed = Date.now();
        poke.saveUser(jid, user, db);

        return reply(conn, msg, from,
          `${item.emoji} *${displayName(p)} foi alimentado!*\n\n` +
          `🍗 ғᴏᴍᴇ: *${p.hunger}%*\n💞 ᴀғᴇᴛᴏ: *${p.affection}%*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível alimentar o Pokémon."}`);
      }
    },
  },

  {
    name: "carinhopokemon",
    aliases: ["cuidarpokemon", "brincarpokemon"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "carinhopokemon",
    description: "cuida do seu Pokémon e aumenta afeto",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePokemon(msg, from);
        const p = user.pokemon;
        const wait = remaining(p.lastCare, CARE_CD);
        if (wait) throw Object.assign(new Error(), { userMessage: `Espere *${time(wait)}* antes de cuidar dele novamente.` });

        const affection = Math.floor(Math.random() * 8) + 6;
        p.affection = Math.min(100, Number(p.affection || 0) + affection);
        p.health = Math.min(100, Number(p.health || 100) + 4);
        p.lastCare = Date.now();
        poke.saveUser(jid, user, db);

        return reply(conn, msg, from,
          `💞 *ᴍᴏᴍᴇɴᴛᴏ ᴄᴏᴍ ${displayName(p)}*\n\n` +
          `✨ ᴀғᴇᴛᴏ: +${affection}\n❤️ sᴀᴜ́ᴅᴇ: *${p.health}%*\n💗 ᴀғᴇᴛᴏ ᴛᴏᴛᴀʟ: *${p.affection}%*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível cuidar do Pokémon."}`);
      }
    },
  },

  {
    name: "missaopokemon",
    aliases: ["missaopoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "missaopokemon",
    description: "envia seu Pokémon em uma missão por Coins e XP",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePokemon(msg, from);
        const p = user.pokemon;
        const wait = remaining(p.lastMission, MISSION_CD);
        if (wait) throw Object.assign(new Error(), { userMessage: `A próxima missão fica disponível em *${time(wait)}*.` });
        if (p.hunger < 20) throw Object.assign(new Error(), { userMessage: "Seu Pokémon está com muita fome. Alimente-o antes da missão." });

        const data = poke.pokemonData(p) || {};
        let coins = Math.floor(Math.random() * 701) + 350;
        let xp = Math.floor(Math.random() * 61) + 40;
        if (data.rarity === "Raro") coins = Math.floor(coins * 1.15);
        if (data.rarity === "Lendário") coins = Math.floor(coins * 1.3);
        if (data.name === "Charmander" || data.name === "Charizard") xp += 15;

        const wallet = economy.reconcileUser(jid);
        wallet.coins += coins;
        economy.saveUser(wallet);

        p.xp = Number(p.xp || 0) + xp;
        p.level = poke.levelFromXp(p.xp);
        p.hunger = Math.max(0, Number(p.hunger || 100) - 20);
        p.affection = Math.min(100, Number(p.affection || 0) + 2);
        p.lastMission = Date.now();
        p.missions = Number(p.missions || 0) + 1;
        poke.saveUser(jid, user, db);

        return reply(conn, msg, from,
          `🧭 *ᴍɪssᴀ̃ᴏ ᴄᴏɴᴄʟᴜɪ́ᴅᴀ!*\n\n` +
          `🎴 ${displayName(p)} voltou da missão.\n` +
          `🪙 +*${economy.format(coins)}*\n` +
          `📈 +*${xp} XP*\n` +
          `📊 ɴɪ́ᴠᴇʟ: *${p.level}*\n` +
          `🍗 ғᴏᴍᴇ: *${p.hunger}%*\n` +
          `💰 sᴀʟᴅᴏ: *${economy.format(wallet.coins)}*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "A missão não pôde ser concluída."}`);
      }
    },
  },

  {
    name: "evoluirpokemon",
    aliases: ["evoluirpoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "evoluirpokemon",
    description: "evolui o Pokémon quando ele alcança o nível necessário",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePokemon(msg, from);
        const p = user.pokemon;
        const check = poke.canEvolve(p);
        if (!check.ok) {
          if (check.reason === "final") throw Object.assign(new Error(), { userMessage: "Seu Pokémon já está na evolução final." });
          throw Object.assign(new Error(), { userMessage: `Seu Pokémon precisa chegar ao nível *${check.required}* para evoluir.` });
        }

        const old = poke.pokemonData(p);
        const next = poke.POKEMON[check.target];
        p.species = check.target;
        p.affection = Math.min(100, Number(p.affection || 0) + 10);
        p.health = 100;
        poke.saveUser(jid, user, db);

        return reply(conn, msg, from,
          `✨ *ᴇᴠᴏʟᴜᴄ̧ᴀ̃ᴏ!*\n\n` +
          `${old?.emoji || "🧿"} *${old?.name || "Pokémon"}* evoluiu para ${next?.emoji || "✨"} *${next?.name || check.target}*!\n` +
          `💞 ᴀғᴇᴛᴏ: *${p.affection}%*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível evoluir o Pokémon."}`);
      }
    },
  },

  {
    name: "venderpokemon",
    aliases: ["venderpoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "venderpokemon confirmar",
    description: "vende seu Pokémon e recupera parte do valor",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const { jid, db, user } = requirePokemon(msg, from);
        if (String(args?.[0] || "").toLowerCase() !== "confirmar") {
          throw Object.assign(new Error(), { userMessage: `Para evitar acidentes, use ${config.prefix || "."}venderpokemon confirmar.` });
        }

        const p = user.pokemon;
        const data = poke.pokemonData(p) || {};
        const value = Math.max(100, Math.floor(Number(data.price || 1000) * 0.55));
        const name = displayName(p);
        user.pokemon = null;
        poke.saveUser(jid, user, db);

        const wallet = economy.reconcileUser(jid);
        wallet.coins += value;
        economy.saveUser(wallet);

        return reply(conn, msg, from,
          `💸 *ᴘᴏᴋᴇ́ᴍᴏɴ ᴠᴇɴᴅɪᴅᴏ*\n\n🎴 ${name}\n🪙 ʀᴇᴄᴇʙɪᴅᴏ: *${economy.format(value)}*\n💰 sᴀʟᴅᴏ: *${economy.format(wallet.coins)}*`);
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível vender o Pokémon."}`);
      }
    },
  },

  {
    name: "rankpokemon",
    aliases: ["rankingpokemon", "rankpoke"],
    menuCategory: "RPG",
    menuSection: "Pokémon",
    usage: "rankpokemon",
    description: "mostra o ranking de Pokémon",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        ensureSystems(from);
        const ranking = poke.rank(10);
        if (!ranking.length) return reply(conn, msg, from, "🎴 Ainda não há Pokémon registrados.");
        const medals = ["🥇","🥈","🥉","4️⃣","5️⃣","6️⃣","7️⃣","8️⃣","9️⃣","🔟"];
        const lines = ranking.map((x, i) =>
          `${medals[i]} ${tag(x.jid)} — *${displayName(x.pokemon)}* Lv.${x.pokemon.level} • ${x.data.rarity || "?"}`
        );
        return reply(conn, msg, from,
          `🏆 *ʀᴀɴᴋɪɴɢ ᴘᴏᴋᴇ́ᴍᴏɴ*\n\n${lines.join("\n")}`,
          ranking.map((x) => x.jid));
      } catch (e) {
        return reply(conn, msg, from, `❌ ${e.userMessage || "Não foi possível gerar o ranking Pokémon."}`);
      }
    },
  },
];

module.exports = commands;
