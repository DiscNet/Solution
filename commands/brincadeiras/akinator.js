// Menu: Brincadeiras - Jogos | Comando: akinator
const crypto = require("crypto");
const Akinator = require("silent-akinator-pro");
const { sendInteractiveMessage } = require("gifted-btns");
const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");

const sessions = new Map();
const SESSION_TTL = 20 * 60 * 1000;

const ANSWERS = new Map([
  ["sim", "y"],
  ["s", "y"],
  ["yes", "y"],
  ["nao", "n"],
  ["não", "n"],
  ["n", "n"],
  ["nsei", "idk"],
  ["naosei", "idk"],
  ["não-sei", "idk"],
  ["idk", "idk"],
  ["provavelmente", "p"],
  ["provavel", "p"],
  ["prov", "p"],
  ["p", "p"],
  ["provavelmentenao", "pn"],
  ["provavelmente-nao", "pn"],
  ["provavelmentenão", "pn"],
  ["pn", "pn"],
]);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function senderId(msg, from) {
  return (
    msg?.key?.participantAlt ||
    msg?.key?.participant ||
    msg?.key?.remoteJidAlt ||
    msg?.key?.remoteJid ||
    msg?.sender ||
    from ||
    "unknown"
  );
}

function sessionKey(msg, from) {
  return `${from}:${senderId(msg, from)}`;
}

function buttonId(action, token) {
  const prefix = config.prefix || ".";
  return `${prefix}akinator ${action}${token ? ` ${token}` : ""}`;
}

function quick(text, action, token) {
  return {
    name: "quick_reply",
    buttonParamsJson: JSON.stringify({ display_text: text, id: buttonId(action, token) }),
  };
}

function controls(token, canBack) {
  const rows = [];
  if (canBack) rows.push({ id: buttonId("voltar", token), title: "↩️ Voltar", description: "Voltar uma pergunta" });
  rows.push({ id: buttonId("parar", token), title: "✖️ Encerrar", description: "Finalizar esta partida" });
  return {
    name: "single_select",
    buttonParamsJson: JSON.stringify({
      title: "Opções",
      sections: [{ title: "Partida", rows }],
    }),
  };
}

function questionButtons(session) {
  return [
    quick("✅ Sim", "sim", session.token),
    quick("❌ Não", "nao", session.token),
    quick("🤷 Não sei", "nsei", session.token),
    quick("👍 Provavelmente", "provavelmente", session.token),
    quick("👎 Provavelmente não", "provavelmentenao", session.token),
    controls(session.token, Number(session.aki.step || 0) > 0),
  ];
}

function guessButtons(session) {
  return [
    quick("✅ Acertou", "acertou", session.token),
    quick("❌ Errou", "errou", session.token),
    quick("✖️ Encerrar", "parar", session.token),
  ];
}

function progressBar(value) {
  const progress = Math.max(0, Math.min(100, Number.parseFloat(value) || 0));
  const filled = Math.round(progress / 10);
  return `${"▰".repeat(filled)}${"▱".repeat(10 - filled)} ${progress.toFixed(1)}%`;
}

function safePhoto(photo) {
  const value = String(photo || "").trim();
  if (/^https?:\/\//i.test(value)) return value;
  if (/^\/\//.test(value)) return `https:${value}`;
  return null;
}

async function sendInteractiveSafe(conn, from, msg, content, fallbackText) {
  try {
    return await sendInteractiveMessage(conn, from, content, { quoted: createStatusQuoted(msg) });
  } catch (error) {
    console.warn("[AKINATOR] Botões indisponíveis, usando fallback de texto:", error.message);
    const fallback = content.image
      ? { image: content.image, caption: fallbackText || content.text }
      : { text: fallbackText || content.text };
    return conn.sendMessage(from, fallback, { quoted: createStatusQuoted(msg) });
  }
}

async function sendQuestion(conn, msg, from, session) {
  const aki = session.aki;
  const step = Number(aki.step || 0) + 1;
  const text = [
    "🧞 *AKINATOR*",
    "",
    `*Pergunta ${step}*`,
    String(aki.question || "...").trim(),
    "",
    progressBar(aki.progression),
  ].join("\n");

  const prefix = config.prefix || ".";
  const fallback = `${text}\n\nResponda com:\n${prefix}akinator sim\n${prefix}akinator nao\n${prefix}akinator nsei\n${prefix}akinator provavelmente\n${prefix}akinator provavelmentenao\n\n${prefix}akinator voltar | ${prefix}akinator parar`;

  await sendInteractiveSafe(conn, from, msg, {
    text,
    footer: "Akinator • escolha uma resposta",
    interactiveButtons: questionButtons(session),
  }, fallback);
}

async function sendGuess(conn, msg, from, session) {
  const guess = session.aki.guess || {};
  session.phase = "guess";
  session.touchedAt = Date.now();

  const text = [
    "🧞 *AKINATOR*",
    "",
    "*Eu acho que é...*",
    `*${guess.name || "Não identificado"}*`,
    guess.description ? String(guess.description) : "",
    "",
    "É esse personagem?",
  ].filter(Boolean).join("\n");

  const prefix = config.prefix || ".";
  const fallback = `${text}\n\n${prefix}akinator acertou\n${prefix}akinator errou`;
  const photo = safePhoto(guess.photo);

  await sendInteractiveSafe(conn, from, msg, {
    ...(photo ? { image: { url: photo } } : {}),
    text,
    footer: "Akinator • confirme o palpite",
    interactiveButtons: guessButtons(session),
  }, fallback);
}

async function reply(conn, msg, from, text) {
  return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
}

function validateToken(session, supplied) {
  return !supplied || supplied === session.token;
}

async function startGame(conn, msg, from, key) {
  const old = sessions.get(key);
  if (old?.busy) return reply(conn, msg, from, "🧞 Aguarde a ação anterior terminar.");

  const aki = new Akinator({ region: "pt", childMode: true });
  const session = {
    aki,
    token: crypto.randomBytes(4).toString("hex"),
    phase: "question",
    busy: true,
    createdAt: Date.now(),
    touchedAt: Date.now(),
  };
  sessions.set(key, session);

  try {
    await aki.start();
    session.busy = false;
    session.touchedAt = Date.now();
    await sendQuestion(conn, msg, from, session);
  } catch (error) {
    sessions.delete(key);
    console.error("[AKINATOR] Falha ao iniciar:", error);
    await reply(conn, msg, from, "❌ O Akinator não respondeu agora. Tente iniciar outra partida daqui a pouco.");
  }
}

async function withSession(conn, msg, from, key, action, suppliedToken, handler) {
  const session = sessions.get(key);
  if (!session) {
    return reply(conn, msg, from, `🧞 Você não tem uma partida ativa. Use ${(config.prefix || ".")}akinator para começar.`);
  }
  if (!validateToken(session, suppliedToken)) {
    return reply(conn, msg, from, "⚠️ Esse botão pertence a uma partida antiga do Akinator.");
  }
  if (Date.now() - session.touchedAt > SESSION_TTL) {
    sessions.delete(key);
    return reply(conn, msg, from, `⌛ Sua partida expirou. Use ${(config.prefix || ".")}akinator para começar outra.`);
  }
  if (session.busy) return reply(conn, msg, from, "🧞 Aguarde a resposta do Akinator antes de clicar novamente.");

  session.busy = true;
  session.touchedAt = Date.now();
  try {
    await handler(session);
  } catch (error) {
    console.error(`[AKINATOR] Erro em ${action}:`, error);
    await reply(conn, msg, from, "❌ Não consegui concluir essa jogada. Sua partida continua ativa; tente novamente.");
  } finally {
    if (sessions.get(key) === session) {
      session.busy = false;
      session.touchedAt = Date.now();
    }
  }
}

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, session] of sessions.entries()) {
    if (now - session.touchedAt > SESSION_TTL) sessions.delete(key);
  }
}, 60_000);
cleanup.unref?.();

module.exports = {
  name: "akinator",
  aliases: ["aki"],
  description: "Jogue o Akinator real pelo WhatsApp com botões.",
  menuCategory: "Brincadeiras",
  menuSection: "Jogos",
  usage: "akinator [sim|nao|nsei|provavelmente|provavelmentenao|voltar|parar]",
  async execute(conn, msg, args, from) {
    const key = sessionKey(msg, from);
    const rawAction = String(args[0] || "");
    const action = normalize(rawAction);
    const token = String(args[1] || "").trim();

    if (!action || ["iniciar", "start", "novo", "novojogo"].includes(action)) {
      return startGame(conn, msg, from, key);
    }

    if (["parar", "encerrar", "cancelar", "stop"].includes(action)) {
      const session = sessions.get(key);
      if (session && !validateToken(session, token)) {
        return reply(conn, msg, from, "⚠️ Esse botão pertence a uma partida antiga do Akinator.");
      }
      sessions.delete(key);
      return reply(conn, msg, from, "🧞 Partida do Akinator encerrada.");
    }

    if (["status", "pergunta"].includes(action)) {
      return withSession(conn, msg, from, key, action, token, async (session) => {
        if (session.phase === "guess" || session.aki.guessed) await sendGuess(conn, msg, from, session);
        else await sendQuestion(conn, msg, from, session);
      });
    }

    if (["voltar", "back"].includes(action)) {
      return withSession(conn, msg, from, key, action, token, async (session) => {
        if (session.phase === "guess" || session.aki.guessed) {
          return reply(conn, msg, from, "🧞 Primeiro diga se o meu palpite está certo ou errado.");
        }
        if (Number(session.aki.step || 0) <= 0) {
          return reply(conn, msg, from, "↩️ Você já está na primeira pergunta.");
        }
        await session.aki.back();
        await sendQuestion(conn, msg, from, session);
      });
    }

    if (["acertou", "certo", "acertei", "simacertou"].includes(action)) {
      return withSession(conn, msg, from, key, action, token, async (session) => {
        if (!(session.phase === "guess" || session.aki.guessed)) {
          return reply(conn, msg, from, "🧞 Ainda não fiz nenhum palpite.");
        }
        const name = session.aki.guess?.name || "seu personagem";
        try { await session.aki.choice(); } catch (error) { console.warn("[AKINATOR] Falha ao confirmar choice:", error.message); }
        sessions.delete(key);
        await reply(conn, msg, from, `🎉 *Acertei!*\n\nEra *${name}*. Obrigado por jogar Akinator!`);
      });
    }

    if (["errou", "errado", "naoerrou"].includes(action)) {
      return withSession(conn, msg, from, key, action, token, async (session) => {
        if (!(session.phase === "guess" || session.aki.guessed)) {
          return reply(conn, msg, from, "🧞 Ainda não fiz nenhum palpite.");
        }
        const result = await session.aki.exclude();
        session.phase = "question";
        if (session.aki.guessed && session.aki.guess) return sendGuess(conn, msg, from, session);
        if (session.aki.finished && !session.aki.guessed) {
          sessions.delete(key);
          return reply(conn, msg, from, "🏆 Você venceu! O Akinator não conseguiu descobrir seu personagem.");
        }
        if (result?.question || session.aki.question) return sendQuestion(conn, msg, from, session);
        sessions.delete(key);
        return reply(conn, msg, from, "🏆 Você venceu! O Akinator não encontrou outro palpite.");
      });
    }

    const answer = ANSWERS.get(action);
    if (answer) {
      return withSession(conn, msg, from, key, action, token, async (session) => {
        if (session.phase === "guess" || session.aki.guessed) {
          return sendGuess(conn, msg, from, session);
        }
        await session.aki.answer(answer);
        if (session.aki.guessed && session.aki.guess) return sendGuess(conn, msg, from, session);
        if (session.aki.finished) {
          sessions.delete(key);
          return reply(conn, msg, from, "🏆 Você venceu! O Akinator não conseguiu descobrir seu personagem.");
        }
        await sendQuestion(conn, msg, from, session);
      });
    }

    return reply(
      conn,
      msg,
      from,
      `🧞 *Akinator*\n\nUse ${(config.prefix || ".")}akinator para iniciar. Durante o jogo, use os botões ou: sim, nao, nsei, provavelmente, provavelmentenao, voltar e parar.`,
    );
  },
};

module.exports._sessions = sessions;
