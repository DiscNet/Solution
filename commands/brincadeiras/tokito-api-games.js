const tokitoApi = require("../../functions/tokitoApi");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

const FORCA_TTL = 20 * 60 * 1000;
const ADIVINHE_TTL = 20 * 60 * 1000;
const MINES_TTL = 20 * 60 * 1000;

const forcaGames = new Map();
const adivinheGames = new Map();
const minesGames = new Map();

const FORCA_WORDS = [
  { palavra: "javascript", tema: "Programação", dica: "Linguagem muito usada na web" },
  { palavra: "computador", tema: "Tecnologia", dica: "Máquina usada para processar dados" },
  { palavra: "galaxia", tema: "Astronomia", dica: "Conjunto enorme de estrelas" },
  { palavra: "dinossauro", tema: "Animais", dica: "Viveu milhões de anos atrás" },
  { palavra: "biblioteca", tema: "Conhecimento", dica: "Lugar cheio de livros" },
  { palavra: "tempestade", tema: "Clima", dica: "Pode trazer chuva e trovões" },
  { palavra: "esmeralda", tema: "Minerais", dica: "Pedra preciosa verde" },
  { palavra: "bicicleta", tema: "Transporte", dica: "Tem duas rodas e pedais" },
  { palavra: "cachoeira", tema: "Natureza", dica: "Queda natural de água" },
  { palavra: "whatsapp", tema: "Aplicativos", dica: "Mensageiro usado pelo próprio bot" },
];

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

function touch(game) {
  game.updatedAt = Date.now();
  return game;
}

function live(map, key, ttl) {
  const game = map.get(key);
  if (!game) return null;
  if (Date.now() - Number(game.updatedAt || game.createdAt || 0) > ttl) {
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

function maskedWord(game) {
  return game.word
    .split("")
    .map(letter => game.correct.has(letter) ? letter.toUpperCase() : "_")
    .join(" ");
}

function forcaWon(game) {
  return game.word.split("").every(letter => game.correct.has(letter));
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

async function sendForca(conn, msg, from, game, finalText = "") {
  const params = {
    palavra: maskedWord(game),
    tema: game.theme,
    dica: game.hint,
    erros: game.errors,
    max: 6,
    fundo: "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg",
    t: Date.now(),
  };

  const wrong = [...game.wrong].map(x => x.toUpperCase()).join(", ") || "nenhuma";
  const caption = [
    "🔤 *FORCA • TOKITO API*",
    "",
    "🎯 " + maskedWord(game),
    "📚 Tema: " + game.theme,
    "💡 Dica: " + game.hint,
    "❌ Erros: " + game.errors + "/6",
    "🔡 Erradas: " + wrong,
    "",
    finalText || "Use *.forca letra* ou tente a palavra completa.",
    "Para encerrar: *.forca desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/forca", params, caption);
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
    finalText || "Envie uma palavra de 5 letras com *.adivinhe palavra*.",
    "Para encerrar: *.adivinhe desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/adivinhepalavra", params, caption);
}

async function sendMines(conn, msg, from, game, finalText = "") {
  const params = {
    fundo: "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg",
    t: Date.now(),
  };

  for (let i = 0; i < 25; i++) {
    params["c" + (i + 1)] = game.grid[i] || String(i + 1);
  }

  const caption = [
    "💣 *MINES • TOKITO API*",
    "",
    "💎 Casas seguras abertas: " + game.safeOpened + "/20",
    finalText || "Escolha uma casa com *.mines 1-25*.",
    "Para encerrar: *.mines desistir*",
  ].join("\n");

  return sendCanvas(conn, msg, from, "/canvas/mines", params, caption);
}

const commands = [
  {
    name: "forca",
    aliases: [],
    menuCategory: "Jogos",
    menuSection: "Tokito API",
    usage: "forca [letra|palavra|desistir]",
    description: "Jogo da forca usando o canvas da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const inputRaw = args.join(" ").trim();
      const input = normalize(inputRaw);
      let game = live(forcaGames, from, FORCA_TTL);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const item = FORCA_WORDS[Math.floor(Math.random() * FORCA_WORDS.length)];
          game = touch({
            word: normalize(item.palavra),
            theme: item.tema,
            hint: item.dica,
            correct: new Set(),
            wrong: new Set(),
            errors: 0,
            createdAt: Date.now(),
          });
          forcaGames.set(from, game);
          return sendForca(conn, msg, from, game);
        }

        if (["desistir", "parar", "cancelar", "reset"].includes(input)) {
          forcaGames.delete(from);
          for (const letter of game.word) game.correct.add(letter);
          return sendForca(conn, msg, from, game, "🏳️ A palavra era *" + game.word.toUpperCase() + "*.");
        }

        if (!input) return sendForca(conn, msg, from, game);

        if (input.length > 1) {
          if (input === game.word) {
            forcaGames.delete(from);
            for (const letter of game.word) game.correct.add(letter);
            return sendForca(conn, msg, from, game, "🏆 Você acertou a palavra!");
          }

          game.errors += 1;
          touch(game);
        } else {
          if (game.correct.has(input) || game.wrong.has(input)) {
            return conn.sendMessage(from, {
              text: "⚠️ Essa letra já foi usada."
            }, { quoted: createStatusQuoted(msg) });
          }

          if (game.word.includes(input)) game.correct.add(input);
          else {
            game.wrong.add(input);
            game.errors += 1;
          }
          touch(game);
        }

        if (forcaWon(game)) {
          forcaGames.delete(from);
          return sendForca(conn, msg, from, game, "🏆 Você completou a palavra!");
        }

        if (game.errors >= 6) {
          forcaGames.delete(from);
          for (const letter of game.word) game.correct.add(letter);
          return sendForca(conn, msg, from, game, "💀 Fim de jogo. A palavra era *" + game.word.toUpperCase() + "*.");
        }

        forcaGames.set(from, game);
        return sendForca(conn, msg, from, game);
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[TOKITO FORCA]", info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível abrir a forca.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "adivinhe",
    aliases: ["adivinheapalavra", "guessword"],
    menuCategory: "Jogos",
    menuSection: "Tokito API",
    usage: "adivinhe [palavra|desistir]",
    description: "Adivinhe uma palavra de 5 letras usando o canvas da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const input = normalize(args.join(" "));
      let game = live(adivinheGames, from, ADIVINHE_TTL);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const word = ADIVINHE_WORDS[Math.floor(Math.random() * ADIVINHE_WORDS.length)];
          game = touch({
            word,
            attempts: [],
            createdAt: Date.now(),
          });
          adivinheGames.set(from, game);
          return sendAdivinhe(conn, msg, from, game);
        }

        if (["desistir", "parar", "cancelar", "reset"].includes(input)) {
          adivinheGames.delete(from);
          return sendAdivinhe(conn, msg, from, game, "🏳️ A palavra era *" + game.word.toUpperCase() + "*.");
        }

        if (!input) return sendAdivinhe(conn, msg, from, game);
        if (input.length !== 5) {
          return conn.sendMessage(from, {
            text: "❌ Envie exatamente uma palavra de 5 letras."
          }, { quoted: createStatusQuoted(msg) });
        }

        const status = adivinheStatus(input, game.word);
        game.attempts.push({ word: input, status });
        touch(game);

        if (input === game.word) {
          adivinheGames.delete(from);
          return sendAdivinhe(conn, msg, from, game, "🏆 Acertou! A palavra era *" + game.word.toUpperCase() + "*.");
        }

        if (game.attempts.length >= 6) {
          adivinheGames.delete(from);
          return sendAdivinhe(conn, msg, from, game, "💀 Acabaram as tentativas. Era *" + game.word.toUpperCase() + "*.");
        }

        adivinheGames.set(from, game);
        return sendAdivinhe(conn, msg, from, game);
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[TOKITO ADIVINHE]", info.status || "-", info.message);
        return conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível abrir o jogo Adivinhe.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "mines",
    aliases: ["campominado"],
    menuCategory: "Jogos",
    menuSection: "Tokito API",
    usage: "mines [1-25|desistir]",
    description: "Campo minado usando o canvas da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      const input = String(args[0] || "").trim().toLowerCase();
      const actor = senderId(msg, from);
      let game = live(minesGames, from, MINES_TTL);

      try {
        if (!game || ["novo", "iniciar", "start"].includes(input)) {
          const bombs = new Set();
          while (bombs.size < 5) bombs.add(Math.floor(Math.random() * 25));

          game = touch({
            player: actor,
            bombs,
            opened: new Set(),
            grid: Array.from({ length: 25 }, (_, i) => String(i + 1)),
            safeOpened: 0,
            createdAt: Date.now(),
          });
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
          for (const index of game.bombs) game.grid[index] = "B";
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
        touch(game);

        if (game.bombs.has(index)) {
          game.grid[index] = "B";
          for (const bomb of game.bombs) game.grid[bomb] = "B";
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
  maskedWord,
  forcaWon,
  adivinheStatus,
  forcaGames,
  adivinheGames,
  minesGames,
};
