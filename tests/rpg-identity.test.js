const test = require("node:test");
const assert = require("node:assert/strict");

const {
  candidates,
  resolveRegisteredKey,
  normalizeMessageIdentity,
} = require("../functions/rpgIdentity");

test("group identity considers participant and participantAlt", () => {
  const msg = {
    key: {
      participant: "123456789012345@lid",
      participantAlt: "5511999999999@s.whatsapp.net",
      remoteJid: "123-456@g.us",
    },
  };

  assert.deepEqual(candidates(msg, "123-456@g.us"), [
    "123456789012345@lid",
    "5511999999999@s.whatsapp.net",
  ]);
});

test("registered PN is found even when incoming participant is LID", () => {
  const pn = "5511999999999@s.whatsapp.net";
  const msg = {
    key: {
      participant: "123456789012345@lid",
      participantAlt: pn,
    },
  };
  const users = { [pn]: { nome: "Jogador" } };

  assert.equal(resolveRegisteredKey(msg, "123-456@g.us", users), pn);
  assert.equal(normalizeMessageIdentity(msg, "123-456@g.us", users), pn);
  assert.equal(msg.key.participant, pn);
  assert.equal(msg.key.participantAlt, pn);
});

test("registered LID is kept when it is the existing database key", () => {
  const lid = "123456789012345@lid";
  const msg = {
    key: {
      participant: lid,
      participantAlt: "5511999999999@s.whatsapp.net",
    },
  };
  const users = { [lid]: { nome: "Jogador" } };

  assert.equal(normalizeMessageIdentity(msg, "123-456@g.us", users), lid);
  assert.equal(msg.key.participant, lid);
});

test("private chats may use remoteJidAlt as registration key", () => {
  const pn = "5511888888888@s.whatsapp.net";
  const msg = {
    key: {
      remoteJid: "987654321098765@lid",
      remoteJidAlt: pn,
    },
  };
  const users = { [pn]: { nome: "Jogador" } };

  assert.equal(resolveRegisteredKey(msg, pn, users), pn);
});
