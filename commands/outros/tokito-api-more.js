const kit = require("../../functions/utilityKit");
const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");
const { getProfilePicture } = require("../../functions/profilePicture");
const { sameIdentity } = require("../../functions/permissions");

const DEFAULT_PICTURE = "https://raw.githubusercontent.com/dylanModz/uploads/main/midias/imagens/747wlpa89.jpg";
const GAME_BACKGROUND = "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg";
const GAME_TTL = 20 * 60 * 1000;
const minesGames = new Map();

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

function cleanupMines(key) {
  const game = minesGames.get(key);
  if (!game) return null;
  if (Date.now() - Number(game.updatedAt || game.createdAt || 0) > GAME_TTL) {
    minesGames.delete(key);
    return null;
  }
  return game;
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

function apiFailure(error, fallback) {
  const info = tokitoApi.errorInfo(error);
  console.error("[TOKITO API MORE]", info.status || "-", info.message);
  return tokitoApi.userError(error, fallback);
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

async function randomPair(conn, from) {
  const metadata = await conn.groupMetadata(from);
  const members = uniqueJids(
    metadata?.participants || [],
    [conn?.user?.id, conn?.user?.lid].filter(Boolean)
  );

  if (members.length < 2) return null;

  const first = Math.floor(Math.random() * members.length);
  let second = first;
  while (second === first) second = Math.floor(Math.random() * members.length);

  return [members[first], members[second]];
}

const commands = [
  {
    name: "casal",
    aliases: ["casais"],
    menuCategory: "Brincadeiras",
    menuSection: "Grupo",
    usage: "casal",
    description: "Sorteia duas pessoas e gera o card casal2 da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        const pair = await randomPair(conn, from);
        if (!pair) {
          return kit.reply(conn, msg, from, "❌ Preciso de pelo menos 2 membros disponíveis no grupo.");
        }

        const [p1, p2] = pair;
        const porcentagem = Math.floor(Math.random() * 101);
        const [foto1, foto2] = await Promise.all([
          pictureFor(conn, p1),
          pictureFor(conn, p2),
        ]);

        return sendTokitoImage(
          conn,
          msg,
          from,
          "/canvas/casal2",
          { foto1, foto2, porcentagem },
          "💘 *CASAL SORTEADO*\n\n" +
            "💞 @" + p1.split("@")[0] + "\n" +
            "💞 @" + p2.split("@")[0] + "\n\n" +
            "📊 Compatibilidade: *" + porcentagem + "%*",
          { mentions: [p1, p2] }
        );
      } catch (error) {
        return kit.reply(conn, msg, from, apiFailure(error, "Não foi possível gerar o casal agora."));
      }
    },
  },
  {
    name: "casalgif",
    aliases: [],
    menuCategory: "Brincadeiras",
    menuSection: "Grupo",
    usage: "casalgif",
    description: "Sorteia duas pessoas e gera o casal2-gif da Tokito API",
    permissions: { group: true },
    async execute(conn, msg, args, from) {
      try {
        const pair = await randomPair(conn, from);
        if (!pair) {
          return kit.reply(conn, msg, from, "❌ Preciso de pelo menos 2 membros disponíveis no grupo.");
        }

        const [p1, p2] = pair;
        const porcentagem = Math.floor(Math.random() * 101);
        const [foto1, foto2] = await Promise.all([
          pictureFor(conn, p1),
          pictureFor(conn, p2),
        ]);

        return sendTokitoVideo(
          conn,
          msg,
          from,
          "/canvas/casal2-gif",
          { foto1, foto2, porcentagem },
          "💘 *CASAL ANIMADO*\n\n" +
            "💞 @" + p1.split("@")[0] + " + @" + p2.split("@")[0] +
            "\n📊 Compatibilidade: *" + porcentagem + "%*",
          { mentions: [p1, p2] }
        );
      } catch (error) {
        return kit.reply(conn, msg, from, apiFailure(error, "Não foi possível gerar o casal animado agora."));
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
        let game = cleanupMines(key);

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
        return kit.reply(conn, msg, from, apiFailure(error, "Não foi possível jogar Mines agora."));
      }
    },
  },
];

module.exports = commands;
module.exports._test = {
  minesGames,
  createMinesGame,
  minesParams,
  uniqueJids,
  randomPair,
};
