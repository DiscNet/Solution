from pathlib import Path

p = Path('commands/brincadeiras/akinator.js')
s = p.read_text()

anchor = 'const { createStatusQuoted } = require("../../functions/statusCard");\n'
addition = 'const { unwrapMessage } = require("../../functions/messageText");\n'
if addition not in s:
    if anchor not in s:
        raise SystemExit('import anchor not found')
    s = s.replace(anchor, anchor + addition, 1)

start = s.index('function sentMessageKey(sent) {')
end = s.index('\nasync function sendInteractiveSafe', start)
new_block = r'''function sentMessageKey(sent) {
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
'''
s = s[:start] + new_block + s[end:]

start = s.index('async function finishSession(conn, msg, from, session, text) {')
end = s.index('\nasync function startGame', start)
finish = r'''async function finishSession(conn, msg, from, session, text) {
  if (session?.token) sessions.delete(session.token);

  const source = interactionSourceKey(msg, from);
  const previous = source || session?.messageKey || null;
  if (session) session.messageKey = null;
  if (previous) await deleteMessageSafe(conn, from, previous);

  return reply(conn, msg, from, text);
}
'''
s = s[:start] + finish + s[end:]

start = s.index('async function withSession(conn, msg, from, action, suppliedToken, handler) {')
end = s.index('\nasync function continueAfterWrongGuess', start)
with_session = r'''async function withSession(conn, msg, from, action, suppliedToken, handler) {
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
'''
s = s[:start] + with_session + s[end:]

old_exports = '''  sentMessageKey,\n  rotateMessage,\n  deleteMessageSafe,\n};'''
new_exports = '''  sentMessageKey,\n  rotateMessage,\n  deleteMessageSafe,\n  interactionSourceKey,\n  normalizedDeleteKey,\n  consumeCurrentPrompt,\n};'''
if old_exports not in s:
    raise SystemExit('internals export anchor not found')
s = s.replace(old_exports, new_exports, 1)
p.write_text(s)

t = Path('tests/akinator.test.js')
tests = t.read_text()
addition_test = r'''

test("Akinator deletes the exact clicked prompt before processing the answer", async () => {
  const command = require("../commands/brincadeiras/akinator");
  const group = "120363000000000000@g.us";
  const alice = "5511999999999@s.whatsapp.net";
  const token = "cafebabe";
  const order = [];

  command._sessions.clear();
  command._sessions.set(token, {
    token,
    chat: group,
    ownerIds: new Set([alice]),
    phase: "question",
    busy: false,
    touchedAt: Date.now(),
    messageKey: { remoteJid: group, fromMe: true, id: "stored-question" },
    aki: {
      step: 0,
      progression: 10,
      question: "Pergunta antiga",
      won: false,
      ko: false,
      async answer() {
        order.push("answer");
        this.step = 1;
        this.question = "Pergunta nova";
        this.progression = 20;
        return { question: this.question, won: false, ko: false };
      },
    },
  });

  let n = 0;
  const conn = {
    user: { id: "5511000000000@s.whatsapp.net" },
    async sendMessage(from, content) {
      if (content.delete) order.push(`delete:${content.delete.id}`);
      else order.push("send");
      n += 1;
      return { key: { remoteJid: from, fromMe: true, id: `out-${n}` } };
    },
  };

  const msg = {
    key: { remoteJid: group, participant: alice, id: "click-1" },
    message: {
      interactiveResponseMessage: {
        contextInfo: {
          stanzaId: "exact-question-from-click",
          participant: "5511000000000@s.whatsapp.net",
        },
        nativeFlowResponseMessage: {
          paramsJson: JSON.stringify({ id: `.akinator sim ${token}` }),
        },
      },
    },
  };

  await command.execute(conn, msg, ["sim", token], group);

  assert.equal(order[0], "delete:exact-question-from-click");
  assert.equal(order[1], "answer");
  assert.ok(order.includes("send"), "a new question/fallback must be sent after the answer");

  command._sessions.clear();
});

test("Akinator extracts the original prompt key from interactive context", () => {
  const command = require("../commands/brincadeiras/akinator");
  const group = "120363000000000000@g.us";
  const key = command._internals.interactionSourceKey({
    message: {
      interactiveResponseMessage: {
        contextInfo: { stanzaId: "original-prompt", participant: "bot@s.whatsapp.net" },
      },
    },
  }, group);

  assert.equal(key.id, "original-prompt");
  assert.equal(key.remoteJid, group);
  assert.equal(key.fromMe, true);
});
'''
if 'deletes the exact clicked prompt before processing the answer' not in tests:
    tests += addition_test
t.write_text(tests)
