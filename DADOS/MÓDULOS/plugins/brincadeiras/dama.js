const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");
const { sameIdentity } = require("../../functions/permissions");

const games = new Map();
const TTL = 30 * 60 * 1000;
const BACKGROUND = "https://telegra.ph/file/b5427ea4b8701bc47e751.jpg";

function contextInfo(msg) {
  const message = msg?.message || {};
  return (
    message.extendedTextMessage?.contextInfo ||
    message.imageMessage?.contextInfo ||
    message.videoMessage?.contextInfo ||
    message.documentMessage?.contextInfo ||
    message.audioMessage?.contextInfo ||
    {}
  );
}

function senderJid(msg, from) {
  return (
    msg?.key?.participantAlt ||
    msg?.key?.participant ||
    msg?.key?.remoteJidAlt ||
    msg?.key?.remoteJid ||
    from
  );
}

function targetJid(msg) {
  const ctx = contextInfo(msg);
  const mentioned = Array.isArray(ctx?.mentionedJid) ? ctx.mentionedJid.filter(Boolean) : [];
  if (mentioned.length) return mentioned[0];
  if (ctx?.quotedMessage) return ctx?.participantAlt || ctx?.participant || null;
  return null;
}

function cleanExpired(from) {
  const game = games.get(from);
  if (!game) return null;
  if (Date.now() - Number(game.updatedAt || game.createdAt || 0) > TTL) {
    games.delete(from);
    return null;
  }
  return game;
}

function createBoard() {
  const board = Array.from({ length: 8 }, () => Array(8).fill(""));
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row][col] = "b";
    }
  }
  for (let row = 5; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      if ((row + col) % 2 === 1) board[row][col] = "w";
    }
  }
  return board;
}

function coord(value = "") {
  const match = String(value).trim().toUpperCase().match(/^([A-H])([1-8])$/);
  if (!match) return null;
  return {
    col: "ABCDEFGH".indexOf(match[1]),
    row: 8 - Number(match[2]),
  };
}

function boardParams(game) {
  const params = {
    turno: game.turn,
    fundo: BACKGROUND,
    t: Date.now(),
  };

  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      params["c" + row + "_" + col] = game.board[row][col] || "";
    }
  }

  return params;
}

function pieceEmoji(piece) {
  return {
    w: "⚪",
    W: "⬜",
    b: "⚫",
    B: "⬛",
  }[piece] || "·";
}

function textBoard(game) {
  const rows = [];
  for (let row = 0; row < 8; row++) {
    rows.push((8 - row) + " " + game.board[row].map(pieceEmoji).join(" "));
  }
  rows.push("  A B C D E F G H");
  return rows.join("\n");
}

function mention(jid) {
  return "@" + String(jid || "").split("@")[0].split(":")[0];
}

function currentPlayer(game) {
  return game.turn === "W" ? game.white : game.black;
}

function opponentColor(turn) {
  return turn === "W" ? ["b", "B"] : ["w", "W"];
}

function ownColor(turn) {
  return turn === "W" ? ["w", "W"] : ["b", "B"];
}

function winnerIfAny(game) {
  const flat = game.board.flat();
  const white = flat.some(piece => piece === "w" || piece === "W");
  const black = flat.some(piece => piece === "b" || piece === "B");
  if (!white) return game.black;
  if (!black) return game.white;
  return null;
}

async function sendText(conn, msg, from, text, mentions = []) {
  return conn.sendMessage(from, {
    text,
    ...(mentions.length ? { mentions } : {}),
  }, { quoted: createStatusQuoted(msg) });
}

async function sendBoard(conn, msg, from, game, extra = "") {
  const turnPlayer = currentPlayer(game);
  const caption = [
    "⚫⚪ *DAMA • TOKITO API*",
    "",
    game.status === "pending"
      ? "Desafio aguardando resposta."
      : "Vez de " + mention(turnPlayer),
    extra,
    "",
    "Movimento: *.dama A3-B4*",
    "Encerrar: *.dama parar*",
  ].filter(Boolean).join("\n");

  try {
    const result = await tokitoApi.buffer("/canvas/dama", boardParams(game), {
      timeout: 60000,
      headers: { accept: "image/*,*/*" },
    });

    if (!result.buffer?.length || !/image/i.test(result.contentType)) {
      throw new Error("A Tokito API não retornou o canvas da dama.");
    }

    return conn.sendMessage(from, {
      image: result.buffer,
      caption,
      mentions: [game.white, game.black, turnPlayer].filter(Boolean),
    }, { quoted: createStatusQuoted(msg) });
  } catch (error) {
    const info = tokitoApi.errorInfo(error);
    console.warn("[TOKITO DAMA]", info.status || "-", info.message);

    return sendText(
      conn,
      msg,
      from,
      caption + "\n\n" + textBoard(game),
      [game.white, game.black, turnPlayer].filter(Boolean)
    );
  }
}

function parseMove(raw) {
  const parts = String(raw || "")
    .toUpperCase()
    .replace(/\s+/g, "")
    .split("-");
  if (parts.length !== 2) return null;
  const from = coord(parts[0]);
  const to = coord(parts[1]);
  if (!from || !to) return null;
  return { from, to, label: parts.join("-") };
}

function applyMove(game, move) {
  const { from, to } = move;
  const piece = game.board[from.row]?.[from.col] || "";
  const own = ownColor(game.turn);

  if (!own.includes(piece)) {
    return { ok: false, message: "Essa peça não pertence ao jogador da vez." };
  }
  if (game.board[to.row]?.[to.col]) {
    return { ok: false, message: "A casa de destino já está ocupada." };
  }

  const dr = to.row - from.row;
  const dc = to.col - from.col;

  if (Math.abs(dr) !== Math.abs(dc)) {
    return { ok: false, message: "O movimento precisa ser diagonal." };
  }

  if (Math.abs(dr) === 2) {
    const middleRow = from.row + dr / 2;
    const middleCol = from.col + dc / 2;
    const middle = game.board[middleRow]?.[middleCol] || "";
    if (!opponentColor(game.turn).includes(middle)) {
      return { ok: false, message: "Não há uma peça adversária para capturar." };
    }
    game.board[middleRow][middleCol] = "";
  } else if (Math.abs(dr) !== 1) {
    return { ok: false, message: "Movimento inválido. Use uma diagonal de 1 casa ou capture pulando 2." };
  }

  game.board[to.row][to.col] = piece;
  game.board[from.row][from.col] = "";

  if (piece === "w" && to.row === 0) game.board[to.row][to.col] = "W";
  if (piece === "b" && to.row === 7) game.board[to.row][to.col] = "B";

  return { ok: true };
}

const command = {
  name: "dama",
  aliases: ["checkers"],
  menuCategory: "Brincadeiras",
  menuSection: "Tokito API",
  usage: "dama @usuario | dama aceitar | dama A3-B4 | dama parar",
  description: "Joga dama em dupla usando o canvas da Tokito V10",
  permissions: { group: true },

  async execute(conn, msg, args, from) {
    const actor = senderJid(msg, from);
    const raw = args.join(" ").trim();
    const action = raw.toLowerCase();
    let game = cleanExpired(from);

    try {
      if (!game) {
        const target = targetJid(msg);
        if (!target) {
          return sendText(
            conn,
            msg,
            from,
            "⚫⚪ *DAMA*\n\nMarque alguém para desafiar.\nEx.: *.dama @usuario*"
          );
        }
        if (sameIdentity(actor, target)) {
          return sendText(conn, msg, from, "❌ Você não pode desafiar a si mesmo.");
        }
        if (
          sameIdentity(target, conn?.user?.id) ||
          sameIdentity(target, conn?.user?.lid)
        ) {
          return sendText(conn, msg, from, "❌ Escolha outro membro do grupo.");
        }

        game = {
          white: actor,
          black: target,
          board: createBoard(),
          turn: "W",
          status: "pending",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        games.set(from, game);

        return sendText(
          conn,
          msg,
          from,
          "⚫⚪ *DESAFIO DE DAMA*\n\n" +
            mention(actor) + " desafiou " + mention(target) + ".\n\n" +
            mention(target) + ", use *.dama aceitar* ou *.dama recusar*.",
          [actor, target]
        );
      }

      if (["parar", "cancelar", "reset", "desistir"].includes(action)) {
        if (!sameIdentity(actor, game.white) && !sameIdentity(actor, game.black)) {
          return sendText(conn, msg, from, "🚫 Só os jogadores podem encerrar esta partida.");
        }
        games.delete(from);
        return sendText(conn, msg, from, "🏳️ Partida de dama encerrada.", [game.white, game.black]);
      }

      if (game.status === "pending") {
        if (!sameIdentity(actor, game.black)) {
          return sendText(
            conn,
            msg,
            from,
            "⏳ O desafio está aguardando " + mention(game.black) + ".",
            [game.black]
          );
        }

        if (["aceitar", "sim", "s", "ok"].includes(action)) {
          game.status = "active";
          game.updatedAt = Date.now();
          games.set(from, game);
          return sendBoard(conn, msg, from, game, "✅ Desafio aceito. As peças brancas começam.");
        }

        if (["recusar", "nao", "não", "n"].includes(action)) {
          games.delete(from);
          return sendText(
            conn,
            msg,
            from,
            "❌ " + mention(game.black) + " recusou o desafio.",
            [game.white, game.black]
          );
        }

        return sendText(
          conn,
          msg,
          from,
          "Use *.dama aceitar* ou *.dama recusar*.",
          [game.black]
        );
      }

      if (!raw || ["tabuleiro", "status"].includes(action)) {
        return sendBoard(conn, msg, from, game);
      }

      const turnPlayer = currentPlayer(game);
      if (!sameIdentity(actor, turnPlayer)) {
        return sendText(
          conn,
          msg,
          from,
          "⏳ Agora é a vez de " + mention(turnPlayer) + ".",
          [turnPlayer]
        );
      }

      const move = parseMove(raw);
      if (!move) {
        return sendText(conn, msg, from, "❌ Movimento inválido. Ex.: *.dama A3-B4*.");
      }

      const moved = applyMove(game, move);
      if (!moved.ok) {
        return sendText(conn, msg, from, "❌ " + moved.message);
      }

      game.updatedAt = Date.now();
      const winner = winnerIfAny(game);

      if (winner) {
        games.delete(from);
        return sendBoard(
          conn,
          msg,
          from,
          game,
          "🏆 " + mention(winner) + " venceu a partida!",
        );
      }

      game.turn = game.turn === "W" ? "B" : "W";
      games.set(from, game);

      return sendBoard(
        conn,
        msg,
        from,
        game,
        "✅ Movimento *" + move.label + "* realizado."
      );
    } catch (error) {
      const info = tokitoApi.errorInfo(error);
      console.error("[TOKITO DAMA]", info.status || "-", info.message);
      return sendText(conn, msg, from, tokitoApi.userError(error, "Não foi possível executar a dama."));
    }
  },
};

command._internals = {
  games,
  createBoard,
  coord,
  boardParams,
  textBoard,
  parseMove,
  applyMove,
  winnerIfAny,
};

module.exports = command;
