const crypto = require("crypto");
const path = require("path");
const { createJsonStore } = require("./jsonStore");

const DROP_TTL_MS = 10 * 60 * 1000;
const CREATE_COOLDOWN_MS = 60 * 1000;
const BASE_POINTS = 100;
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const store = createJsonStore(
  path.join(__dirname, "../../database/privRush.json"),
  {
    version: 1,
    drops: {},
    creators: {},
    arenas: {},
  },
  { checkIntervalMs: 250 }
);

function normalizeCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

function hashCode(value) {
  return crypto
    .createHash("sha256")
    .update(normalizeCode(value))
    .digest("hex");
}

function randomChunk(length = 4) {
  let out = "";
  const bytes = crypto.randomBytes(length * 2);
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return out;
}

function generateCode() {
  return "KX-" + randomChunk(4) + "-" + randomChunk(4);
}

function ensureDb(raw) {
  const db = raw && typeof raw === "object" ? raw : {};
  if (!db.drops || typeof db.drops !== "object") db.drops = {};
  if (!db.creators || typeof db.creators !== "object") db.creators = {};
  if (!db.arenas || typeof db.arenas !== "object") db.arenas = {};
  db.version = 1;
  return db;
}

function cleanup(db, now = Date.now()) {
  const keepClaimedMs = 7 * 24 * 60 * 60 * 1000;
  const keepExpiredMs = 24 * 60 * 60 * 1000;

  for (const [key, drop] of Object.entries(db.drops)) {
    const claimedAt = Number(drop?.claimedAt || 0);
    const expiresAt = Number(drop?.expiresAt || 0);

    if (claimedAt && now - claimedAt > keepClaimedMs) {
      delete db.drops[key];
      continue;
    }

    if (!claimedAt && expiresAt && now - expiresAt > keepExpiredMs) {
      delete db.drops[key];
    }
  }

  return db;
}

function speedBonus(elapsedMs) {
  if (elapsedMs <= 15 * 1000) return 200;
  if (elapsedMs <= 30 * 1000) return 150;
  if (elapsedMs <= 60 * 1000) return 100;
  if (elapsedMs <= 3 * 60 * 1000) return 50;
  return 0;
}

function prepareDrop({ creator, chatId, message, now = Date.now() }) {
  const db = cleanup(ensureDb(store.read(true)), now);
  const creatorId = String(creator || "").trim();
  const origin = String(chatId || "").trim();

  if (!creatorId || !origin) {
    const error = new Error("Criador ou chat inválido.");
    error.code = "INVALID_CONTEXT";
    throw error;
  }

  const lastCreatedAt = Number(db.creators[creatorId] || 0);
  const remainingMs = CREATE_COOLDOWN_MS - (now - lastCreatedAt);

  if (remainingMs > 0) {
    const error = new Error("Aguarde antes de criar outro PrivRush.");
    error.code = "CREATE_COOLDOWN";
    error.remainingMs = remainingMs;
    throw error;
  }

  let code;
  let codeHash;

  do {
    code = generateCode();
    codeHash = hashCode(code);
  } while (db.drops[codeHash]);

  return {
    id: crypto.randomBytes(5).toString("hex"),
    code,
    codeHash,
    creator: creatorId,
    chatId: origin,
    message: String(message || ""),
    createdAt: now,
    expiresAt: now + DROP_TTL_MS,
    basePoints: BASE_POINTS,
  };
}

function commitDrop(draft) {
  const now = Date.now();
  const db = cleanup(ensureDb(store.read(true)), now);

  if (!draft?.codeHash || !draft?.creator) {
    throw new Error("Drop inválido.");
  }

  db.drops[draft.codeHash] = {
    id: draft.id,
    creator: draft.creator,
    chatId: draft.chatId,
    createdAt: draft.createdAt,
    expiresAt: draft.expiresAt,
    basePoints: draft.basePoints,
    claimedBy: null,
    claimedAt: 0,
    pointsAwarded: 0,
  };

  db.creators[draft.creator] = draft.createdAt;

  if (!store.write(db)) {
    throw new Error("Não foi possível salvar o PrivRush.");
  }

  return draft;
}

function cancelDrop(draft) {
  if (!draft?.codeHash) return;

  const db = ensureDb(store.read(true));
  delete db.drops[draft.codeHash];

  if (
    draft.creator &&
    Number(db.creators[draft.creator] || 0) === Number(draft.createdAt || 0)
  ) {
    delete db.creators[draft.creator];
  }

  store.write(db);
}

function arenaFor(db, chatId) {
  const key = String(chatId || "global");
  if (!db.arenas[key] || typeof db.arenas[key] !== "object") {
    db.arenas[key] = {};
  }
  return db.arenas[key];
}

function claimDrop({ code, user, claimChatId, now = Date.now() }) {
  const normalized = normalizeCode(code);
  if (!normalized) return { status: "invalid" };

  const db = cleanup(ensureDb(store.read(true)), now);
  const key = hashCode(normalized);
  const drop = db.drops[key];

  if (!drop) return { status: "invalid" };

  if (Number(drop.expiresAt || 0) <= now) {
    store.write(db);
    return { status: "expired" };
  }

  if (drop.claimedBy) {
    return {
      status: "claimed",
      claimedAt: Number(drop.claimedAt || 0),
    };
  }

  const userId = String(user || "").trim();
  if (!userId) return { status: "invalid" };

  if (userId === String(drop.creator || "")) {
    return { status: "creator" };
  }

  const elapsedMs = Math.max(0, now - Number(drop.createdAt || now));
  const bonus = speedBonus(elapsedMs);
  const points = Number(drop.basePoints || BASE_POINTS) + bonus;

  drop.claimedBy = userId;
  drop.claimedAt = now;
  drop.pointsAwarded = points;

  const arena = arenaFor(db, claimChatId);
  const player = arena[userId] && typeof arena[userId] === "object"
    ? arena[userId]
    : {
        points: 0,
        wins: 0,
        bestMs: null,
        lastWinAt: 0,
      };

  player.points = Number(player.points || 0) + points;
  player.wins = Number(player.wins || 0) + 1;
  player.bestMs =
    player.bestMs == null
      ? elapsedMs
      : Math.min(Number(player.bestMs), elapsedMs);
  player.lastWinAt = now;

  arena[userId] = player;
  store.write(db);

  return {
    status: "won",
    points,
    basePoints: Number(drop.basePoints || BASE_POINTS),
    bonus,
    elapsedMs,
    totalPoints: player.points,
    wins: player.wins,
    originChatId: drop.chatId,
  };
}

function leaderboard(chatId, limit = 10) {
  const db = cleanup(ensureDb(store.read(true)));
  const arena = arenaFor(db, chatId);

  return Object.entries(arena)
    .map(([jid, data]) => ({
      jid,
      points: Number(data?.points || 0),
      wins: Number(data?.wins || 0),
      bestMs: data?.bestMs == null ? null : Number(data.bestMs),
    }))
    .sort((a, b) =>
      b.points - a.points ||
      b.wins - a.wins ||
      Number(a.bestMs ?? Infinity) - Number(b.bestMs ?? Infinity)
    )
    .slice(0, Math.max(1, Number(limit || 10)));
}

module.exports = {
  DROP_TTL_MS,
  CREATE_COOLDOWN_MS,
  BASE_POINTS,
  normalizeCode,
  hashCode,
  generateCode,
  speedBonus,
  prepareDrop,
  commitDrop,
  cancelDrop,
  claimDrop,
  leaderboard,
};
