// Menu: Brincadeiras - Jogos | Comando: akinator
const crypto = require("crypto");
const {
  AkinatorClient,
  Languages,
  Themes,
  Answers,
} = require("akinator-client");
const { sendInteractiveMessage } = require("gifted-btns");
const { createStatusQuoted } = require("../../functions/statusCard");
const { unwrapMessage } = require("../../functions/messageText");
const config = require("../../config/config");

// As sessoes sao indexadas pelo token da partida. Isso permite validar
// explicitamente quem iniciou o jogo antes de aceitar qualquer botao.
const sessions = new Map();
const SESSION_TTL = 20 * 60 * 1000;

const ANSWERS = new Map([
  ["sim", Answers.Yes],
  ["s", Answers.Yes],
  ["yes", Answers.Yes],
  ["nao", Answers.No],
  ["não", Answers.No],
  ["n", Answers.No],
  ["nsei", Answers.IDontKnow],
  ["naosei", Answers.IDontKnow],
  ["idk", Answers.IDontKnow],
  ["provavelmente", Answers.Probably],
  ["provavel", Answers.Probably],
  ["prov", Answers.Probably],
  ["p", Answers.Probably],
  ["provavelmentenao", Answers.ProbablyNot],
  ["provavelmente-nao", Answers.ProbablyNot],
  ["pn", Answers.ProbablyNot],
]);

function normalize(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "");
}

function normalizeIdentity(value) {
  return String(value || "").trim().toLowerCase();
}

function isGroupJid(value) {
  return /@g\.us$/i.test(String(value || ""));
}

function actorIds(msg, from) {
  const values = [
    msg?.key?.participant,
    msg?.key?.participantAlt,
    msg?.participant,
    msg?.participantAlt,
    msg?.sender,
  ];

  // Em PV o remoteJid representa o proprio usuario. Em grupos ele representa
  // o grupo inteiro e nunca deve ser usado como identidade do jogador.
  if (!isGroupJid(from)) {
    values.push(msg?.key?.remoteJid, msg?.key?.remoteJidAlt, from);
  }

  return new Set(
    values
      .map(normalizeIdentity)
      .filter((value) => value && !isGroupJid(value)),
  );
}

function sameActor(expected, current) {
  if (!expected?.size || !current?.size) return false;
  for (const id of current) {
    if (expected.has(id)) return true;
  }
  return false;
}

function findOwnedSession(msg, from) {
  const current = actorIds(msg, from);
  for (const session of sessions.values()) {
    if (session.chat === from && sameActor(session.ownerIds, current)) return session;
  }
  return null;
}

function resolveSession(msg, from, suppliedToken) {
  const token = String(suppliedToken || "").trim();
  const current = actorIds(msg, from);

  if (token) {
    const session = sessions.get(token);
    if (!session) return { error: "stale" };
    if (session.chat !== from || !sameActor(session.ownerIds, current)) {
      return { error: "foreign", session };
    }
    return { session };
  }

  const session = findOwnedSession(msg, from);
  return session ? { session } : { error: "missing" };
}

function newClient() {
  return new AkinatorClient({
    language: Languages.Portuguese,
    theme: Themes.Character,
    childMode: true,
    retries: 3,
    scraperApiKey: process.env.AKINATOR_SCRAPER_API_KEY || undefined,
  });
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

function sentMessageKey(sent) {
  return sent?.key || sent?.message?.key || sent?.msg?.key || null;
}

function sameMessageKey(a, b) {
  if (!a || !b) return false;
  return Boolean(a.id && b.id && a.id === b.id && (a.remoteJid || "") === (b.remoteJid || ""));
}

function interactionSourceKey(msg, from) {
  const message = unwrapMessage(msg);
  const context =
    message?.interactiveResponseMessage?.contextInfo ||
    message?.buttonsResponseMessage?.contextInfo ||
    message?.templateButtonReplyMessage?.contextInfo ||
    message?.listResponseMessage?.contextInfo ||
    null;

  const id = String(context?.stanzaId || "").trim();
  if (!id) return null;

  const key = { remoteJid: from, fromMe: true, id };
  if (isGroupJid(from) && context?.participant) key.participant = context.participant;
  return key;
}

function normalizedDeleteKey(conn, from, key) {
  const id = String(key?.id || "").trim();
  if (!id) return null;

  const normalized = {
    ...key,
    remoteJid: key?.remoteJid || from,
    fromMe: true,
    id,
  };

  if (isGroupJid(from) && !normalized.participant && conn?.user?.id) {
    normalized.participant = conn.user.id;
  }

  return normalized;
}

async function deleteMessageSafe(conn, from, key) {
  const normalized = normalizedDeleteKey(conn, from, key);
  if (!normalized) return false;

  try {
    await conn.sendMessage(from, { delete: normalized });
    return true;
  } catch (firstError) {
    const minimal = { remoteJid: from, fromMe: true, id: normalized.id };
    try {
      await conn.sendMessage(from, { delete: minimal });
      return true;
    } catch (secondError) {
      console.warn(
        "[AKINATOR] Não foi possível apagar mensagem antiga:",
        secondError.message || firstError.message,
      );
      return false;
    }
  }
}

async function consumeCurrentPrompt(conn, msg, from, session) {
  const source = interactionSourceKey(msg, from);
  const key = source || session?.messageKey || null;
  if (!key) return false;

  const deleted = await deleteMessageSafe(conn, from, key);
  if (deleted && session) session.messageKey = null;
  return deleted;
}

async function rotateMessage(session, conn, from, sent) {
  const previous = session.messageKey || null;
  const next = sentMessageKey(sent);
  session.messageKey = next || null;

  if (previous && !sameMessageKey(previous, next)) {
    await deleteMessageSafe(conn, from, previous);
  }

  return next;
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

  const sent = await sendInteractiveSafe(conn, from, msg, {
    text,
    footer: "Akinator • escolha uma resposta",
    interactiveButtons: questionButtons(session),
  }, fallback);

  await rotateMessage(session, conn, from, sent);
  return sent;
}

async function sendGuess(conn, msg, from, session) {
  const guess = session.aki.winResult || {};
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
  const photo = safePhoto(guess.pictureUrl);

  const sent = await sendInteractiveSafe(conn, from, msg, {
    ...(photo ? { image: { url: photo } } : {}),
    text,
    footer: "Akinator • confirme o palpite",
    interactiveButtons: guessButtons(session),
  }, fallback);

  await rotateMessage(session, conn, from, sent);
  return sent;
}

async function reply(conn, msg, from, text) {
  return conn.sendMessage(from, { text }, { quoted: createStatusQuoted(msg) });
}

async function temporaryReply(conn, msg, from, text, ttl = 6000) {
  const sent = await reply(conn, msg, from, text);
  const key = sentMessageKey(sent);
  if (key) {
    const timer = setTimeout(() => deleteMessageSafe(conn, from, key), ttl);
    timer.unref?.();
  }
  return sent;
}

async function finishSession(conn, msg, from, session, text) {
  if (session?.token) sessions.delete(session.token);

  const source = interactionSourceKey(msg, from);
  const previous = source || session?.messageKey || null;
  if (session) session.messageKey = null;
  if (previous) await deleteMessageSafe(conn, from, previous);

  return reply(conn, msg, from, text);
}

async function startGame(conn, msg, from) {
  const old = findOwnedSession(msg, from);
  if (old?.busy) return temporaryReply(conn, msg, from, "🧞 Aguarde a ação anterior terminar.");

  const aki = newClient();
  const token = crypto.randomBytes(4).toString("hex");
  const session = {
    aki,
    token,
    chat: from,
    ownerIds: actorIds(msg, from),
    phase: "question",
    busy: true,
    createdAt: Date.now(),
    touchedAt: Date.now(),
    // Se havia uma partida antiga deste mesmo jogador, a primeira pergunta
    // nova substitui a interface antiga e a remove do WhatsApp.
    messageKey: old?.messageKey || null,
    conn,
  };

  if (old) sessions.delete(old.token);
  sessions.set(token, session);

  try {
    await aki.start();
    session.busy = false;
    session.touchedAt = Date.now();
    await sendQuestion(conn, msg, from, session);
  } catch (error) {
    sessions.delete(token);
    if (old) sessions.set(old.token, old);
    console.error("[AKINATOR] Falha ao iniciar:", error);
    await reply(conn, msg, from, "❌ O Akinator não respondeu agora. Tente iniciar outra partida daqui a pouco.");
  }
}

async function getSessionOrWarn(conn, msg, from, suppliedToken) {
  const resolved = resolveSession(msg, from, suppliedToken);
  if (resolved.session && !resolved.error) return resolved.session;

  if (resolved.error === "foreign") {
    await temporaryReply(conn, msg, from, "🚫 Só a pessoa que iniciou esta partida pode responder ao Akinator.");
    return null;
  }

  if (resolved.error === "stale") {
    await temporaryReply(conn, msg, from, "⚠️ Esse botão pertence a uma pergunta antiga do Akinator.");
    return null;
  }

  await temporaryReply(conn, msg, from, `🧞 Você não tem uma partida ativa. Use ${(config.prefix || ".")}akinator para começar.`);
  return null;
}

async function withSession(conn, msg, from, action, suppliedToken, handler) {
  const session = await getSessionOrWarn(conn, msg, from, suppliedToken);
  if (!session) return;

  if (Date.now() - session.touchedAt > SESSION_TTL) {
    sessions.delete(session.token);
    await consumeCurrentPrompt(conn, msg, from, session);
    return temporaryReply(conn, msg, from, `⌛ Sua partida expirou. Use ${(config.prefix || ".")}akinator para começar outra.`);
  }

  if (session.busy) return temporaryReply(conn, msg, from, "🧞 Aguarde a resposta do Akinator antes de clicar novamente.");

  session.busy = true;
  session.touchedAt = Date.now();
  let oldPromptDeleted = false;
  try {
    oldPromptDeleted = await consumeCurrentPrompt(conn, msg, from, session);
    await handler(session);
  } catch (error) {
    console.error(`[AKINATOR] Erro em ${action}:`, error);

    if (sessions.get(session.token) === session && oldPromptDeleted) {
      try {
        if (session.phase === "guess" || session.aki.won) await sendGuess(conn, msg, from, session);
        else await sendQuestion(conn, msg, from, session);
      } catch (restoreError) {
        console.error("[AKINATOR] Falha ao restaurar interface:", restoreError);
        await temporaryReply(conn, msg, from, "❌ Não consegui concluir essa jogada. Use .akinator status para recuperar a partida.");
      }
    } else {
      await temporaryReply(conn, msg, from, "❌ Não consegui concluir essa jogada. Sua partida continua ativa; tente novamente.");
    }
  } finally {
    if (sessions.get(session.token) === session) {
      session.busy = false;
      session.touchedAt = Date.now();
    }
  }
}

async function continueAfterWrongGuess(conn, msg, from, session) {
  try {
    await session.aki.continue();
    session.phase = "question";
    if (session.aki.won && session.aki.winResult) return sendGuess(conn, msg, from, session);
    if (session.aki.ko) {
      return finishSession(conn, msg, from, session, "🏆 Você venceu! O Akinator não conseguiu descobrir seu personagem.");
    }
    return sendQuestion(conn, msg, from, session);
  } catch (error) {
    console.warn("[AKINATOR] continue() bloqueado pelo serviço; iniciando nova rodada:", error.message);
    const replacement = newClient();
    await replacement.start();
    session.aki = replacement;
    session.phase = "question";
    return sendQuestion(conn, msg, from, session);
  }
}

const cleanup = setInterval(() => {
  const now = Date.now();
  for (const [token, session] of sessions.entries()) {
    if (now - session.touchedAt > SESSION_TTL) {
      sessions.delete(token);
      if (session.conn && session.messageKey) {
        deleteMessageSafe(session.conn, session.chat, session.messageKey).catch(() => {});
      }
    }
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
    const action = normalize(args[0] || "");
    const token = String(args[1] || "").trim();

    if (!action || ["iniciar", "start", "novo", "novojogo"].includes(action)) {
      return startGame(conn, msg, from);
    }

    if (["parar", "encerrar", "cancelar", "stop"].includes(action)) {
      const session = await getSessionOrWarn(conn, msg, from, token);
      if (!session) return;
      return finishSession(conn, msg, from, session, "🧞 Partida do Akinator encerrada.");
    }

    if (["status", "pergunta"].includes(action)) {
      return withSession(conn, msg, from, action, token, async (session) => {
        if (session.phase === "guess" || session.aki.won) await sendGuess(conn, msg, from, session);
        else await sendQuestion(conn, msg, from, session);
      });
    }

    if (["voltar", "back"].includes(action)) {
      return withSession(conn, msg, from, action, token, async (session) => {
        if (session.phase === "guess" || session.aki.won) {
          return temporaryReply(conn, msg, from, "🧞 Primeiro diga se o meu palpite está certo ou errado.");
        }
        if (Number(session.aki.step || 0) <= 0) {
          return temporaryReply(conn, msg, from, "↩️ Você já está na primeira pergunta.");
        }
        await session.aki.back();
        await sendQuestion(conn, msg, from, session);
      });
    }

    if (["acertou", "certo", "acertei", "simacertou"].includes(action)) {
      return withSession(conn, msg, from, action, token, async (session) => {
        if (!(session.phase === "guess" || session.aki.won)) {
          return temporaryReply(conn, msg, from, "🧞 Ainda não fiz nenhum palpite.");
        }
        const name = session.aki.winResult?.name || "seu personagem";
        try {
          await session.aki.submitWin();
        } catch (error) {
          console.warn("[AKINATOR] Falha ao confirmar palpite:", error.message);
        }
        await finishSession(conn, msg, from, session, `🎉 *Acertei!*\n\nEra *${name}*. Obrigado por jogar Akinator!`);
      });
    }

    if (["errou", "errado", "naoerrou"].includes(action)) {
      return withSession(conn, msg, from, action, token, async (session) => {
        if (!(session.phase === "guess" || session.aki.won)) {
          return temporaryReply(conn, msg, from, "🧞 Ainda não fiz nenhum palpite.");
        }
        await continueAfterWrongGuess(conn, msg, from, session);
      });
    }

    const answer = ANSWERS.get(action);
    if (answer !== undefined) {
      return withSession(conn, msg, from, action, token, async (session) => {
        if (session.phase === "guess" || session.aki.won) return sendGuess(conn, msg, from, session);
        const result = await session.aki.answer(answer);
        if (result?.won || session.aki.won) return sendGuess(conn, msg, from, session);
        if (result?.ko || session.aki.ko) {
          return finishSession(conn, msg, from, session, "🏆 Você venceu! O Akinator não conseguiu descobrir seu personagem.");
        }
        await sendQuestion(conn, msg, from, session);
      });
    }

    return temporaryReply(
      conn,
      msg,
      from,
      `🧞 *Akinator*\n\nUse ${(config.prefix || ".")}akinator para iniciar. Durante o jogo, use os botões ou: sim, nao, nsei, provavelmente, provavelmentenao, voltar e parar.`,
    );
  },
};

module.exports._sessions = sessions;
module.exports._internals = {
  actorIds,
  sameActor,
  resolveSession,
  sentMessageKey,
  rotateMessage,
  deleteMessageSafe,
  interactionSourceKey,
  normalizedDeleteKey,
  consumeCurrentPrompt,
};
