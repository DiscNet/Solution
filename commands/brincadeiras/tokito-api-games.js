const tokitoApi = require("../../functions/tokitoApi");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

const GAME_TTL = 20 * 60 * 1000;
const adivinheGames = new Map();
const minesGames = new Map();

const ADIVINHE_WORDS = [
  "nuvem", "livro", "pedra", "carta", "vento",
  "praia", "astro", "plano", "robot", "verde",
  "tempo", "sonho", "chave", "mundo", "lunar",
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
    throw new Error("A Tokito API não retornou o canvas do jogo.");
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
    "🧩 *ADIVINHE A PALAVRA • TOKITO API*",
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
    "💣 *MINES • TOKITO API*",
    "",
    "💎 Casas seguras abertas: " + game.safeOpened + "/20",
    finalText || "Escolha uma casa com *.mines 1-25*.",
    "Para encerrar: *.mines desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/mines", minesParams(game), caption);
}

const commands = [
  {
    name: "adivinhepalavra",
    aliases: ["adivinhe", "guessword"],
    menuCategory: "Brincadeiras",
    menuSection: "Tokito API",
    usage: "adivinhepalavra [palavra|desistir]",
    description: "Adivinhe uma palavra de 5 letras usando o canvas da Tokito API",
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
        console.error("[TOKITO ADIVINHEPALAVRA]", info.status || "-", info.message);
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
    menuSection: "Tokito API",
    usage: "mines [1-25|desistir]",
    description: "Campo minado usando o canvas da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const input = String(args[0] || "").trim().toLowerCase();
      const actor = senderId(msg, from);
      let game = live(minesGames, from);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const bombs = new Set();
          while (bombs.size < 5) {
            bombs.add(Math.floor(Math.random() * 25));
          }

          game = {
            player: actor,
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

        if (game.player && game.player !== actor) {
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
        console.error("[TOKITO MINES]", info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível abrir o Mines.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports = commands;
module.exports._test = {
  normalize,
  adivinheStatus,
  minesParams,
  adivinheGames,
  minesGames,
};
