const tokitoApi = require("../../functions/apiClient");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");
const { senderCandidates, sameIdentity } = require("../../functions/permissions");

const GAME_TTL = 20 * 60 * 1000;
const adivinheGames = new Map();
const minesGames = new Map();
const cacaGames = new Map();

const ADIVINHE_WORDS = [
  "nuvem", "livro", "pedra", "carta", "vento",
  "praia", "astro", "plano", "robot", "verde",
  "tempo", "sonho", "chave", "mundo", "lunar",
];

const CACA_WORDS = [
  { palavra: "codigo", tema: "Tecnologia" },
  { palavra: "linux", tema: "Tecnologia" },
  { palavra: "mouse", tema: "Tecnologia" },
  { palavra: "dados", tema: "Tecnologia" },
  { palavra: "nuvem", tema: "Tecnologia" },
  { palavra: "rede", tema: "Tecnologia" },
  { palavra: "pixel", tema: "Tecnologia" },
  { palavra: "tecla", tema: "Tecnologia" },
];

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .trim();
}

function live(map, key) {
  const game = map.get(key);
  if (!game) return null;

  if (Date.now() - Number(game.updatedAt || game.createdAt || 0) > GAME_TTL) {
    map.delete(key);
    return null;
  }

  return game;
}

function senderId(msg, from) {
  return String(
    kit.senderId?.(msg, from) ||
    msg?.key?.participantAlt ||
    msg?.key?.participant ||
    msg?.key?.remoteJidAlt ||
    msg?.key?.remoteJid ||
    from ||
    ""
  );
}

function playerCandidates(msg, from) {
  const values = senderCandidates(msg);
  const fallback = senderId(msg, from);
  if (fallback) values.push(fallback);
  return [...new Set(values.filter(Boolean))];
}

function samePlayer(saved = [], current = []) {
  return saved.some(a => current.some(b => sameIdentity(a, b)));
}

function adivinheStatus(guess, secret) {
  const status = Array(5).fill("cinza");
  const used = Array(5).fill(false);

  for (let i = 0; i < 5; i++) {
    if (guess[i] === secret[i]) {
      status[i] = "verde";
      used[i] = true;
    }
  }

  for (let i = 0; i < 5; i++) {
    if (status[i] === "verde") continue;

    for (let j = 0; j < 5; j++) {
      if (!used[j] && guess[i] === secret[j]) {
        status[i] = "amarelo";
        used[j] = true;
        break;
      }
    }
  }

  return status;
}

async function sendCanvas(conn, msg, from, route, params, caption) {
  const result = await tokitoApi.buffer(route, params, {
    timeout: 60000,
    headers: { accept: "image/*,*/*" },
    maxContentLength: 20 * 1024 * 1024,
    maxBodyLength: 20 * 1024 * 1024,
  });

  if (!result.buffer?.length || !/image/i.test(result.contentType)) {
    throw new Error("A API não retornou o canvas do jogo.");
  }

  return conn.sendMessage(from, {
    image: result.buffer,
    caption,
  }, { quoted: createStatusQuoted(msg) });
}

async function sendAdivinhe(conn, msg, from, game, finalText = "") {
  const params = { t: Date.now() };
  const letters = Array(30).fill("");
  const statuses = Array(30).fill("");

  game.attempts.forEach((attempt, row) => {
    for (let i = 0; i < 5; i++) {
      const index = row * 5 + i;
      letters[index] = attempt.word[i] || "";
      statuses[index] = attempt.status[i] || "";
    }
  });

  for (let i = 0; i < 30; i++) {
    params["l" + (i + 1)] = letters[i];
    params["s" + (i + 1)] = statuses[i];
  }

  const caption = [
    "🧩 *ADIVINHE A PALAVRA • API*",
    "",
    "Tentativas: " + game.attempts.length + "/6",
    finalText || "Envie uma palavra de 5 letras com *.adivinhepalavra palavra*.",
    "Para encerrar: *.adivinhepalavra desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/adivinhepalavra", params, caption);
}

function minesParams(game) {
  const params = {
    fundo: "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg",
    t: Date.now(),
  };

  for (let i = 0; i < 25; i++) {
    params["c" + (i + 1)] = game.grid[i] || String(i + 1);
  }

  return params;
}

async function sendMines(conn, msg, from, game, finalText = "") {
  const caption = [
    "💣 *MINES • API*",
    "",
    "💎 Casas seguras abertas: " + game.safeOpened + "/20",
    finalText || "Escolha uma casa com *.mines 1-25*.",
    "Para encerrar: *.mines desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/mines", minesParams(game), caption);
}

function randomLetter() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  return alphabet[Math.floor(Math.random() * alphabet.length)];
}

function buildWordSearch(entries, size = 14) {
  const grid = Array.from({ length: size }, () => Array(size).fill(""));
  const directions = [[1,0],[-1,0],[0,1],[0,-1],[1,1],[-1,-1],[1,-1],[-1,1]];
  const words = [];

  function canPlace(word, row, col, dx, dy) {
    for (let i = 0; i < word.length; i++) {
      const r = row + i * dy;
      const c = col + i * dx;
      if (r < 0 || r >= size || c < 0 || c >= size) return false;
      if (grid[r][c] && grid[r][c] !== word[i]) return false;
    }
    return true;
  }

  for (const entry of entries) {
    const word = normalize(entry.palavra).toUpperCase();
    let placed = false;

    for (let attempt = 0; attempt < 500 && !placed; attempt++) {
      const [dx, dy] = directions[Math.floor(Math.random() * directions.length)];
      const row = Math.floor(Math.random() * size);
      const col = Math.floor(Math.random() * size);
      if (!canPlace(word, row, col, dx, dy)) continue;

      const positions = [];
      for (let i = 0; i < word.length; i++) {
        const r = row + i * dy;
        const c = col + i * dx;
        grid[r][c] = word[i];
        positions.push([r, c]);
      }

      words.push({
        palavra: normalize(entry.palavra),
        tema: entry.tema || "Geral",
        positions,
      });
      placed = true;
    }
  }

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      if (!grid[row][col]) grid[row][col] = randomLetter();
    }
  }

  return { grid, words };
}

function cacaParams(game) {
  const params = {
    tamanho: game.size,
    tema: game.theme,
    marcadas: "",
    t: Date.now(),
  };

  for (let row = 0; row < game.size; row++) {
    for (let col = 0; col < game.size; col++) {
      params["c" + row + "_" + col] = game.grid[row][col];
    }
  }

  const marked = [];
  for (const item of game.words) {
    if (!game.found.includes(item.palavra)) continue;
    for (const [row, col] of item.positions) marked.push(row + "_" + col);
  }
  params.marcadas = marked.join("|");
  return params;
}

async function sendCaca(conn, msg, from, game, finalText = "") {
  const found = game.found.map(word => word.toUpperCase()).join(", ") || "nenhuma";
  const caption = [
    "🔎 *CAÇA-PALAVRAS • API*",
    "",
    "📚 Tema: *" + game.theme + "*",
    "✅ Encontradas: *" + game.found.length + "/" + game.words.length + "*",
    "🧩 Palavras encontradas: " + found,
    "",
    finalText || "Quando encontrar uma palavra, use *.cacapalavras palavra*.",
    "Para encerrar: *.cacapalavras desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/cacapalavras", cacaParams(game), caption);
}

function resetCommand(name, map, label) {
  return {
    name,
    aliases: [],
    menuCategory: "Brincadeiras",
    menuSection: "API",
    usage: name,
    description: "Encerra a partida de " + label + " ativa no grupo",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const existed = map.delete(from);
      return conn.sendMessage(from, {
        text: existed
          ? "✅ Partida de " + label + " encerrada."
          : "ℹ️ Não há partida de " + label + " ativa neste grupo.",
      }, { quoted: createStatusQuoted(msg) });
    },
  };
}

const commands = [
  {
    name: "adivinhepalavra",
    aliases: ["guessword"],
    menuCategory: "Brincadeiras",
    menuSection: "API",
    usage: "adivinhepalavra [palavra|desistir]",
    description: "Adivinhe uma palavra de 5 letras usando o canvas da API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const input = normalize(args.join(" "));
      let game = live(adivinheGames, from);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const word = ADIVINHE_WORDS[Math.floor(Math.random() * ADIVINHE_WORDS.length)];
          game = {
            word,
            attempts: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };
          adivinheGames.set(from, game);
          return sendAdivinhe(conn, msg, from, game);
        }

        if (["desistir", "parar", "cancelar", "reset"].includes(input)) {
          adivinheGames.delete(from);
          return sendAdivinhe(
            conn,
            msg,
            from,
            game,
            "🏳️ A palavra era *" + game.word.toUpperCase() + "*."
          );
        }

        if (!input) return sendAdivinhe(conn, msg, from, game);

        if (input.length !== 5) {
          return conn.sendMessage(from, {
            text: "❌ Envie exatamente uma palavra de 5 letras."
          }, { quoted: createStatusQuoted(msg) });
        }

        game.attempts.push({
          word: input,
          status: adivinheStatus(input, game.word),
        });
        game.updatedAt = Date.now();

        if (input === game.word) {
          adivinheGames.delete(from);
          return sendAdivinhe(
            conn,
            msg,
            from,
            game,
            "🏆 Acertou! A palavra era *" + game.word.toUpperCase() + "*."
          );
        }

        if (game.attempts.length >= 6) {
          adivinheGames.delete(from);
          return sendAdivinhe(
            conn,
            msg,
            from,
            game,
            "💀 Acabaram as tentativas. Era *" + game.word.toUpperCase() + "*."
          );
        }

        adivinheGames.set(from, game);
        return sendAdivinhe(conn, msg, from, game);
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API ADIVINHEPALAVRA]", info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível abrir o jogo Adivinhe.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "mines",
    aliases: ["campominado"],
    menuCategory: "Brincadeiras",
    menuSection: "API",
    usage: "mines [1-25|desistir]",
    description: "Campo minado usando o canvas da API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const input = String(args[0] || "").trim().toLowerCase();
      const actors = playerCandidates(msg, from);
      let game = live(minesGames, from);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const bombs = new Set();
          while (bombs.size < 5) {
            bombs.add(Math.floor(Math.random() * 25));
          }

          game = {
            playerIds: actors,
            bombs,
            opened: new Set(),
            grid: Array.from({ length: 25 }, (_, i) => String(i + 1)),
            safeOpened: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          minesGames.set(from, game);
          return sendMines(conn, msg, from, game);
        }

        const savedPlayers = Array.isArray(game.playerIds)
          ? game.playerIds
          : (game.player ? [game.player] : []);
        if (savedPlayers.length && !samePlayer(savedPlayers, actors)) {
          return conn.sendMessage(from, {
            text: "🚫 Essa partida de Mines pertence a outra pessoa do grupo."
          }, { quoted: createStatusQuoted(msg) });
        }

        if (["desistir", "parar", "cancelar", "reset"].includes(input)) {
          minesGames.delete(from);

          for (const index of game.bombs) {
            game.grid[index] = "B";
          }

          return sendMines(conn, msg, from, game, "🏳️ Partida encerrada.");
        }

        const number = Number(input);

        if (!Number.isInteger(number) || number < 1 || number > 25) {
          return sendMines(conn, msg, from, game);
        }

        const index = number - 1;

        if (game.opened.has(index)) {
          return conn.sendMessage(from, {
            text: "⚠️ Essa casa já foi aberta."
          }, { quoted: createStatusQuoted(msg) });
        }

        game.opened.add(index);
        game.updatedAt = Date.now();

        if (game.bombs.has(index)) {
          game.grid[index] = "B";

          for (const bomb of game.bombs) {
            game.grid[bomb] = "B";
          }

          minesGames.delete(from);
          return sendMines(conn, msg, from, game, "💥 Você encontrou uma bomba.");
        }

        game.grid[index] = "D";
        game.safeOpened += 1;

        if (game.safeOpened >= 20) {
          minesGames.delete(from);
          return sendMines(conn, msg, from, game, "🏆 Você abriu todas as casas seguras!");
        }

        minesGames.set(from, game);
        return sendMines(conn, msg, from, game);
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API MINES]", info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível abrir o Mines.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "cacapalavras",
    aliases: ["cacapalavra"],
    menuCategory: "Brincadeiras",
    menuSection: "API",
    usage: "cacapalavras [palavra|desistir]",
    description: "Caça-palavras usando o canvas da API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const input = normalize(args.join(" "));
      let game = live(cacaGames, from);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const built = buildWordSearch(CACA_WORDS, 14);
          if (!built.words.length) throw new Error("Não foi possível montar a grade.");

          game = {
            size: 14,
            theme: built.words[0]?.tema || "Tecnologia",
            grid: built.grid,
            words: built.words,
            found: [],
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          cacaGames.set(from, game);
          return sendCaca(conn, msg, from, game);
        }

        if (["desistir", "parar", "cancelar", "reset"].includes(input)) {
          cacaGames.delete(from);
          return sendCaca(conn, msg, from, game, "🏳️ Caça-palavras encerrado.");
        }

        if (!input) return sendCaca(conn, msg, from, game);

        const item = game.words.find(entry => entry.palavra === input);
        if (!item) {
          return conn.sendMessage(from, {
            text: "❌ Essa palavra não faz parte desta grade."
          }, { quoted: createStatusQuoted(msg) });
        }

        if (game.found.includes(input)) {
          return conn.sendMessage(from, {
            text: "⚠️ Essa palavra já foi encontrada."
          }, { quoted: createStatusQuoted(msg) });
        }

        game.found.push(input);
        game.updatedAt = Date.now();

        if (game.found.length >= game.words.length) {
          cacaGames.delete(from);
          return sendCaca(conn, msg, from, game, "🏆 Todas as palavras foram encontradas!");
        }

        cacaGames.set(from, game);
        return sendCaca(conn, msg, from, game);
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API CACAPALAVRAS]", info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível abrir o Caça-Palavras.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  resetCommand("resetmines", minesGames, "Mines"),
  resetCommand("resetadivinhe", adivinheGames, "Adivinhe a Palavra"),
  resetCommand("resetcaca", cacaGames, "Caça-Palavras"),
];

module.exports = commands;
module.exports._test = {
  normalize,
  adivinheStatus,
  minesParams,
  playerCandidates,
  samePlayer,
  buildWordSearch,
  cacaParams,
  adivinheGames,
  minesGames,
  cacaGames,
};
