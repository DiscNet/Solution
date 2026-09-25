const kit = require("../../functions/utilityKit");
const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");
const { getProfilePicture } = require("../../functions/profilePicture");
const { sameIdentity } = require("../../functions/permissions");

const DEFAULT_PICTURE = "https://raw.githubusercontent.com/dylanModz/uploads/main/midias/imagens/747wlpa89.jpg";
const GAME_BACKGROUND = "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg";
const GAME_TTL = 20 * 60 * 1000;

const minesGames = new Map();
const hangmanGames = new Map();

const HANGMAN_WORDS = [
  { word: "computador", theme: "Tecnologia", hint: "Máquina usada para processar dados." },
  { word: "javascript", theme: "Programação", hint: "Linguagem muito usada na web." },
  { word: "whatsapp", theme: "Aplicativos", hint: "Mensageiro usado pelo próprio bot." },
  { word: "cachoeira", theme: "Natureza", hint: "Queda natural de água." },
  { word: "biblioteca", theme: "Conhecimento", hint: "Lugar cheio de livros." },
  { word: "astronomia", theme: "Ciência", hint: "Estuda astros e o Universo." },
  { word: "dinossauro", theme: "Animais", hint: "Grupo de animais extintos muito antigos." },
  { word: "esmeralda", theme: "Minerais", hint: "Pedra preciosa geralmente verde." },
  { word: "tempestade", theme: "Clima", hint: "Fenômeno com chuva e vento fortes." },
  { word: "bicicleta", theme: "Transporte", hint: "Veículo de duas rodas movido por pedais." },
];

const LOGO_COMMANDS = [
  "darkgreen",
  "glitch",
  "write",
  "advancedglow",
  "typography",
  "pixelglitch",
  "neonglitch",
  "flag",
  "flag3d",
  "deleting",
  "blackpink",
  "glowing",
  "underwater",
  "logomaker",
  "cartoon",
  "papercut",
  "watercolor",
  "affectclouds",
  "blackpinklogo",
  "gradient",
  "summerbeach",
  "luxurygold",
  "sandsummer",
  "galaxywallpaper",
  "1917",
  "markingneon",
  "royal",
  "freecreate",
  "galaxy",
  "lighteffects",
  "neondevil",
  "frozen",
  "metal3d",
  "ligatures",
  "sunset",
  "clouds",
  "colorido",
  "desfoque",
  "naruto",
  "amongus",
  "comic3d",
];

function senderKey(msg, from) {
  return [
    from,
    msg?.key?.participantAlt ||
      msg?.key?.participant ||
      msg?.key?.remoteJidAlt ||
      msg?.key?.remoteJid ||
      from,
  ].join("|");
}

function cleanup(map, key) {
  const game = map.get(key);
  if (!game) return null;
  if (Date.now() - Number(game.updatedAt || game.createdAt || 0) > GAME_TTL) {
    map.delete(key);
    return null;
  }
  return game;
}

function normalizeText(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function participantJid(participant) {
  if (typeof participant === "string") return participant;
  return (
    participant?.phoneNumber ||
    participant?.id ||
    participant?.jid ||
    participant?.lid ||
    ""
  );
}

function uniqueJids(participants = [], botIds = []) {
  const values = [];
  for (const participant of participants) {
    const jid = participantJid(participant);
    if (!jid) continue;
    if (botIds.some(bot => sameIdentity(bot, jid))) continue;
    if (!values.some(value => sameIdentity(value, jid))) values.push(jid);
  }
  return values;
}

async function pictureFor(conn, jid) {
  const picture = await getProfilePicture(conn, [jid], { fallback: DEFAULT_PICTURE });
  return picture?.url || DEFAULT_PICTURE;
}

async function sendTokitoImage(conn, msg, from, route, params, caption, extra = {}) {
  const result = await tokitoApi.buffer(route, params, {
    timeout: 90000,
    headers: { accept: "image/*,*/*" },
  });

  if (!result.buffer?.length || !/image/i.test(result.contentType)) {
    throw new Error("A Tokito API não retornou uma imagem válida.");
  }

  return conn.sendMessage(from, {
    image: result.buffer,
    ...(caption ? { caption } : {}),
    ...extra,
  }, { quoted: createStatusQuoted(msg) });
}

async function sendTokitoVideo(conn, msg, from, route, params, caption, extra = {}) {
  const result = await tokitoApi.buffer(route, params, {
    timeout: 120000,
    maxContentLength: 50 * 1024 * 1024,
    maxBodyLength: 50 * 1024 * 1024,
    headers: { accept: "video/*,*/*" },
  });

  if (!result.buffer?.length || !/video/i.test(result.contentType)) {
    throw new Error("A Tokito API não retornou um vídeo válido.");
  }

  return conn.sendMessage(from, {
    video: result.buffer,
    mimetype: result.contentType.split(";")[0] || "video/mp4",
    gifPlayback: true,
    ...(caption ? { caption } : {}),
    ...extra,
  }, { quoted: createStatusQuoted(msg) });
}

function apiFailure(error, fallback) {
  const info = tokitoApi.errorInfo(error);
  console.error("[TOKITO API MORE]", info.status || "-", info.message);
  return tokitoApi.userError(error, fallback);
}

function createMinesGame() {
  const bombs = new Set();
  while (bombs.size < 5) bombs.add(Math.floor(Math.random() * 25));
  return {
    bombs,
    opened: new Set(),
    grid: Array.from({ length: 25 }, (_, index) => String(index + 1)),
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function minesParams(game) {
  const params = { fundo: GAME_BACKGROUND, t: Date.now() };
  game.grid.forEach((value, index) => {
    params["c" + (index + 1)] = value;
  });
  return params;
}

function hangmanDisplay(game) {
  return [...game.word]
    .map(char => char === " " ? " " : game.correct.has(char) ? char.toUpperCase() : "_")
    .join(" ");
}

function hangmanParams(game) {
  return {
    palavra: hangmanDisplay(game),
    tema: game.theme,
    dica: game.hint,
    erros: game.errors,
    max: 6,
    fundo: GAME_BACKGROUND,
    t: Date.now(),
  };
}

function createHangmanGame() {
  const item = HANGMAN_WORDS[Math.floor(Math.random() * HANGMAN_WORDS.length)];
  return {
    word: normalizeText(item.word),
    theme: item.theme,
    hint: item.hint,
    correct: new Set(),
    wrong: new Set(),
    errors: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

function wonHangman(game) {
  return [...game.word]
    .filter(char => /[a-z0-9]/.test(char))
    .every(char => game.correct.has(char));
}

const commands = [
  {
    name: "printsite",
    aliases: ["screenshotsite", "printsitio"],
    menuCategory: "Downloads",
    menuSection: "Sites",
    usage: "printsite https://example.com",
    description: "Tira print de um site pela Tokito API",
    async execute(conn, msg, args, from) {
      const input = String(args[0] || "").trim();
      if (!input) {
        return kit.reply(conn, msg, from, "❌ Uso: .printsite <link>");
      }

      try {
        const url = (await kit.assertPublicUrl(input)).toString();
        await conn.sendMessage(from, { react: { text: "📸", key: msg.key } }).catch(() => {});
        await sendTokitoImage(
          conn,
          msg,
          from,
          "/api/print-site",
          { url },
          "📸 *PRINT DO SITE*\n\n🔗 " + url
        );
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const text = error?.userMessage || apiFailure(error, "Não foi possível tirar o print do site.");
        await kit.reply(conn, msg, from, text.startsWith("❌") ? text : "❌ " + text);
      }
    },
  },
  {
    name: "casal",
    aliases: ["casais"],
    menuCategory: "Brincadeiras",
    menuSection: "Grupo",
    usage: "casal",
    description: "Sorteia duas pessoas do grupo e gera o card de compatibilidade da Tokito",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        const metadata = await conn.groupMetadata(from);
        const members = uniqueJids(metadata?.participants || [], [conn?.user?.id, conn?.user?.lid]);
        if (members.length < 2) {
          return kit.reply(conn, msg, from, "❌ Preciso de pelo menos 2 membros disponíveis no grupo.");
        }

        const firstIndex = Math.floor(Math.random() * members.length);
        let secondIndex = firstIndex;
        while (secondIndex === firstIndex) secondIndex = Math.floor(Math.random() * members.length);

        const p1 = members[firstIndex];
        const p2 = members[secondIndex];
        const percent = Math.floor(Math.random() * 101);
        const [foto1, foto2] = await Promise.all([
          pictureFor(conn, p1),
          pictureFor(conn, p2),
        ]);

        await sendTokitoImage(
          conn,
          msg,
          from,
          "/canvas/casal2",
          { foto1, foto2, porcentagem: percent },
          "💘 *CASAL SORTEADO*\n\n" +
            "💞 @" + p1.split("@")[0] + "\n" +
            "💞 @" + p2.split("@")[0] + "\n\n" +
            "📊 Compatibilidade: *" + percent + "%*",
          { mentions: [p1, p2] }
        );
      } catch (error) {
        await kit.reply(conn, msg, from, apiFailure(error, "Não foi possível gerar o casal agora."));
      }
    },
  },
  {
    name: "casalgif",
    aliases: [],
    menuCategory: "Brincadeiras",
    menuSection: "Grupo",
    usage: "casalgif",
    description: "Sorteia duas pessoas e gera o card animado da Tokito",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        const metadata = await conn.groupMetadata(from);
        const members = uniqueJids(metadata?.participants || [], [conn?.user?.id, conn?.user?.lid]);
        if (members.length < 2) {
          return kit.reply(conn, msg, from, "❌ Preciso de pelo menos 2 membros disponíveis no grupo.");
        }

        const firstIndex = Math.floor(Math.random() * members.length);
        let secondIndex = firstIndex;
        while (secondIndex === firstIndex) secondIndex = Math.floor(Math.random() * members.length);

        const p1 = members[firstIndex];
        const p2 = members[secondIndex];
        const percent = Math.floor(Math.random() * 101);
        const [foto1, foto2] = await Promise.all([
          pictureFor(conn, p1),
          pictureFor(conn, p2),
        ]);

        await sendTokitoVideo(
          conn,
          msg,
          from,
          "/canvas/casal2-gif",
          { foto1, foto2, porcentagem: percent },
          "💘 *CASAL ANIMADO*\n\n" +
            "💞 @" + p1.split("@")[0] + " + @" + p2.split("@")[0] +
            "\n📊 Compatibilidade: *" + percent + "%*",
          { mentions: [p1, p2] }
        );
      } catch (error) {
        await kit.reply(conn, msg, from, apiFailure(error, "Não foi possível gerar o casal animado agora."));
      }
    },
  },
  {
    name: "mines",
    aliases: ["minas"],
    menuCategory: "Jogos",
    menuSection: "Tokito API",
    usage: "mines [1-25|novo|parar]",
    description: "Joga Mines usando o canvas da Tokito API",
    async execute(conn, msg, args, from) {
      const key = senderKey(msg, from);
      const input = String(args[0] || "").trim().toLowerCase();

      try {
        let game = cleanup(minesGames, key);

        if (!game || ["novo", "new", "reiniciar"].includes(input)) {
          game = createMinesGame();
          minesGames.set(key, game);
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/mines",
            minesParams(game),
            "💣 *MINES*\n\nEscolha uma casa de *1 a 25*.\nEx.: *.mines 7*\n\nHá 5 bombas escondidas."
          );
        }

        if (["parar", "sair", "desistir", "reset"].includes(input)) {
          minesGames.delete(key);
          return kit.reply(conn, msg, from, "🏳️ Partida de Mines encerrada.");
        }

        const number = Number(input);
        if (!Number.isInteger(number) || number < 1 || number > 25) {
          return kit.reply(conn, msg, from, "❌ Escolha uma casa de 1 a 25. Ex.: *.mines 12*.");
        }

        const index = number - 1;
        if (game.opened.has(index)) {
          return kit.reply(conn, msg, from, "⚠️ Essa casa já foi aberta.");
        }

        game.opened.add(index);
        game.updatedAt = Date.now();

        if (game.bombs.has(index)) {
          for (const bomb of game.bombs) game.grid[bomb] = "B";
          minesGames.delete(key);
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/mines",
            minesParams(game),
            "💥 *BOOM!* Você encontrou uma bomba."
          );
        }

        game.grid[index] = "D";
        const safeOpened = [...game.opened].filter(item => !game.bombs.has(item)).length;

        if (safeOpened >= 20) {
          minesGames.delete(key);
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/mines",
            minesParams(game),
            "🏆 *VOCÊ VENCEU!* Todas as casas seguras foram abertas."
          );
        }

        return sendTokitoImage(
          conn,
          msg,
          from,
          "/canvas/mines",
          minesParams(game),
          "💎 Casa *" + number + "* segura. Continue: *.mines 1-25*."
        );
      } catch (error) {
        await kit.reply(conn, msg, from, apiFailure(error, "Não foi possível jogar Mines agora."));
      }
    },
    _internals: { minesGames, createMinesGame, minesParams },
  },
  {
    name: "forca",
    aliases: ["hangman"],
    menuCategory: "Jogos",
    menuSection: "Tokito API",
    usage: "forca [letra|palavra|novo|parar]",
    description: "Joga forca usando o canvas da Tokito API",
    async execute(conn, msg, args, from) {
      const key = senderKey(msg, from);
      const raw = normalizeText(args.join(" "));

      try {
        let game = cleanup(hangmanGames, key);

        if (!game || ["novo", "new", "reiniciar"].includes(raw)) {
          game = createHangmanGame();
          hangmanGames.set(key, game);
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/forca",
            hangmanParams(game),
            "🔤 *FORCA*\n\nTema: *" + game.theme + "*\n💡 Dica: " + game.hint +
              "\n\nUse *.forca a* ou tente a palavra inteira."
          );
        }

        if (["parar", "sair", "desistir", "reset"].includes(raw)) {
          hangmanGames.delete(key);
          return kit.reply(conn, msg, from, "🏳️ A palavra era *" + game.word.toUpperCase() + "*.");
        }

        if (!raw) {
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/forca",
            hangmanParams(game),
            "🔤 *FORCA*\n\nTema: *" + game.theme + "*\n💡 Dica: " + game.hint
          );
        }

        game.updatedAt = Date.now();

        if (raw.length > 1) {
          if (raw === game.word) {
            for (const char of game.word) if (/[a-z0-9]/.test(char)) game.correct.add(char);
            hangmanGames.delete(key);
            return sendTokitoImage(
              conn,
              msg,
              from,
              "/canvas/forca",
              hangmanParams(game),
              "🏆 *ACERTOU!* A palavra era *" + game.word.toUpperCase() + "*."
            );
          }

          game.errors += 1;
        } else {
          if (game.correct.has(raw) || game.wrong.has(raw)) {
            return kit.reply(conn, msg, from, "⚠️ Você já tentou essa letra.");
          }

          if (game.word.includes(raw)) game.correct.add(raw);
          else {
            game.wrong.add(raw);
            game.errors += 1;
          }
        }

        if (wonHangman(game)) {
          hangmanGames.delete(key);
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/forca",
            hangmanParams(game),
            "🏆 *VOCÊ VENCEU!* Palavra: *" + game.word.toUpperCase() + "*."
          );
        }

        if (game.errors >= 6) {
          hangmanGames.delete(key);
          return sendTokitoImage(
            conn,
            msg,
            from,
            "/canvas/forca",
            hangmanParams(game),
            "💀 *FIM DE JOGO!* A palavra era *" + game.word.toUpperCase() + "*."
          );
        }

        return sendTokitoImage(
          conn,
          msg,
          from,
          "/canvas/forca",
          hangmanParams(game),
          "🔤 *FORCA*\n\n" + hangmanDisplay(game) +
            "\n❌ Erros: *" + game.errors + "/6*" +
            "\nLetras erradas: " + ([...game.wrong].join(", ").toUpperCase() || "nenhuma")
        );
      } catch (error) {
        await kit.reply(conn, msg, from, apiFailure(error, "Não foi possível jogar Forca agora."));
      }
    },
    _internals: { hangmanGames, createHangmanGame, hangmanDisplay, hangmanParams, wonHangman },
  },
];

for (const name of LOGO_COMMANDS) {
  commands.push({
    name,
    aliases: [],
    menuCategory: "Logos",
    menuSection: "Tokito API",
    usage: name + " texto",
    description: "Gera o efeito " + name + " usando a Tokito API",
    async execute(conn, msg, args, from) {
      const text = args.join(" ").trim();
      if (!text) {
        return kit.reply(conn, msg, from, "❌ Uso: ." + name + " <texto>");
      }
      if (text.length > 120) {
        return kit.reply(conn, msg, from, "❌ Use no máximo 120 caracteres.");
      }

      try {
        await conn.sendMessage(from, { react: { text: "🎨", key: msg.key } }).catch(() => {});
        await sendTokitoImage(
          conn,
          msg,
          from,
          "/api/" + name,
          { texto: text },
          "🎨 *" + name.toUpperCase() + "*\n\n✨ Efeito gerado pela Tokito API."
        );
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        await kit.reply(conn, msg, from, apiFailure(error, "Não foi possível gerar esse efeito agora."));
      }
    },
  });
}

module.exports = commands;
module.exports._test = {
  LOGO_COMMANDS,
  minesGames,
  hangmanGames,
  createMinesGame,
  minesParams,
  createHangmanGame,
  hangmanDisplay,
  hangmanParams,
  wonHangman,
  normalizeText,
  uniqueJids,
};
