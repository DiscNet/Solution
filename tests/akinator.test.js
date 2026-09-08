const test = require("node:test");
const assert = require("node:assert/strict");
const { extractMessageText } = require("../functions/messageText");

test("interactive quick replies are converted back into command text", () => {
  assert.equal(
    extractMessageText({
      message: {
        interactiveResponseMessage: {
          nativeFlowResponseMessage: {
            paramsJson: JSON.stringify({ id: ".akinator sim deadbeef" }),
          },
        },
      },
    }),
    ".akinator sim deadbeef",
  );

  assert.equal(
    extractMessageText({
      message: {
        ephemeralMessage: {
          message: {
            listResponseMessage: {
              singleSelectReply: { selectedRowId: ".akinator voltar deadbeef" },
            },
          },
        },
      },
    }),
    ".akinator voltar deadbeef",
  );
});

test("Akinator command exposes the expected game metadata", () => {
  const command = require("../commands/brincadeiras/akinator");
  assert.equal(command.name, "akinator");
  assert.ok(command.aliases.includes("aki"));
  assert.equal(command.menuCategory, "Brincadeiras");
  assert.equal(command.menuSection, "Jogos");
  assert.match(command.usage, /voltar/);
  assert.match(command.usage, /provavelmentenao/);
});

test("Akinator rejects another group member clicking someone else's buttons", async () => {
  const command = require("../commands/brincadeiras/akinator");
  const group = "120363000000000000@g.us";
  const alice = "5511999999999@s.whatsapp.net";
  const bob = "5511888888888@s.whatsapp.net";
  const token = "deadbeef";
  let answerCalls = 0;
  const sent = [];

  command._sessions.clear();
  command._sessions.set(token, {
    token,
    chat: group,
    ownerIds: new Set([alice]),
    phase: "question",
    busy: false,
    touchedAt: Date.now(),
    messageKey: { remoteJid: group, fromMe: true, id: "question-1" },
    aki: {
      step: 0,
      won: false,
      async answer() {
        answerCalls++;
        return { question: "não deveria chegar aqui" };
      },
    },
  });

  const conn = {
    async sendMessage(from, content) {
      sent.push({ from, content });
      return { key: { remoteJid: from, fromMe: true, id: `sent-${sent.length}` } };
    },
  };
  const msg = {
    key: { remoteJid: group, participant: bob, id: "click-bob" },
    pushName: "Bob",
  };

  await command.execute(conn, msg, ["sim", token], group);

  assert.equal(answerCalls, 0, "another member must never advance the Akinator session");
  assert.ok(command._sessions.has(token), "the owner's session must remain active");
  assert.match(sent[0]?.content?.text || "", /Só a pessoa que iniciou/i);

  command._sessions.clear();
});

test("Akinator rotates interface messages and deletes the previous question", async () => {
  const command = require("../commands/brincadeiras/akinator");
  const { rotateMessage } = command._internals;
  const group = "120363000000000000@g.us";
  const oldKey = { remoteJid: group, fromMe: true, id: "old-question" };
  const newKey = { remoteJid: group, fromMe: true, id: "new-question" };
  const deleted = [];
  const session = { messageKey: oldKey };

  const conn = {
    async sendMessage(from, content) {
      if (content.delete) deleted.push({ from, key: content.delete });
      return { key: { remoteJid: from, fromMe: true, id: "delete-ack" } };
    },
  };

  await rotateMessage(session, conn, group, { key: newKey });

  assert.deepEqual(session.messageKey, newKey);
  assert.equal(deleted.length, 1);
  assert.deepEqual(deleted[0].key, oldKey);
});
