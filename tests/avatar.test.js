const test = require("node:test");
const assert = require("node:assert/strict");

const avatar = require("../commands/outros/avatar");
const {
  userInputJid,
  requestedTarget,
  preferredCandidates,
  resolveUserCandidates,
  findProfilePicture,
} = avatar._internals;

function baseMessage(overrides = {}) {
  return {
    key: {
      remoteJid: "120363000000000000@g.us",
      participant: "12345@lid",
      participantAlt: "5511999999999@s.whatsapp.net",
      id: "MSG1",
      ...overrides.key,
    },
    pushName: "João",
    message: overrides.message || { conversation: ".avatar" },
  };
}

test("avatar uses the quoted author when replying to a message", () => {
  const msg = baseMessage({
    message: {
      extendedTextMessage: {
        text: ".avatar",
        contextInfo: {
          quotedMessage: { conversation: "oi" },
          participant: "77777@lid",
          participantAlt: "5511888888888@s.whatsapp.net",
        },
      },
    },
  });

  const target = requestedTarget(msg, [], msg.key.remoteJid);
  assert.equal(target.source, "quoted");
  assert.deepEqual(target.candidates, [
    "5511888888888@s.whatsapp.net",
    "77777@lid",
  ]);
});

test("avatar expands a LID to the participant phone identity from group metadata", async () => {
  const metadata = {
    participants: [
      {
        id: "77777@lid",
        lid: "77777@lid",
        phoneNumber: "5511888888888@s.whatsapp.net",
      },
    ],
  };

  const conn = {
    async onWhatsApp() { return []; },
  };

  const candidates = await resolveUserCandidates(conn, metadata, ["77777@lid"]);
  assert.ok(candidates.includes("77777@lid"));
  assert.ok(candidates.includes("5511888888888@s.whatsapp.net"));
  assert.equal(candidates[0], "5511888888888@s.whatsapp.net");
});

test("avatar normalizes raw participant phone numbers before profile lookup", async () => {
  const metadata = {
    participants: [
      {
        id: "77777@lid",
        lid: "77777@lid",
        phoneNumber: "+5511888888888",
      },
    ],
  };

  const conn = { async onWhatsApp() { return []; } };
  const candidates = await resolveUserCandidates(conn, metadata, ["77777@lid"]);

  assert.ok(candidates.includes("5511888888888@s.whatsapp.net"));
  assert.ok(!candidates.includes("+5511888888888"));
});

test("avatar rejects text disguised as a phone number but accepts formatted DDI", () => {
  assert.equal(userInputJid("abc5511999999999xyz"), null);
  assert.equal(userInputJid("12abc34"), null);
  assert.equal(
    userInputJid("+55 (11) 99999-9999"),
    "5511999999999@s.whatsapp.net",
  );
  assert.equal(userInputJid("12345"), null);
});

test("avatar candidate ordering prefers phone JID over LID", () => {
  assert.deepEqual(
    preferredCandidates(["77777@lid", "+5511888888888"]),
    ["5511888888888@s.whatsapp.net", "77777@lid"],
  );
});

test("avatar usa apenas profilePictureUrl image como a Tokito", async () => {
  const calls = [];
  const result = await avatar._internals.findProfilePicture({
    async profilePictureUrl(jid, type) {
      calls.push([jid, type]);
      throw new Error("sem foto");
    },
  }, ["5511999999999@s.whatsapp.net"]);

  assert.equal(result, null);
  assert.deepEqual(calls, [["5511999999999@s.whatsapp.net", "image"]]);
});

test("avatar grupo outside groups returns one helpful text response", async () => {
  const calls = [];
  const conn = {
    async sendMessage(...args) {
      calls.push(args);
      return { key: { id: "SENT" } };
    },
  };
  const msg = {
    key: { remoteJid: "5511999999999@s.whatsapp.net", id: "MSG2" },
    pushName: "João",
    message: { conversation: ".avatar grupo" },
  };

  await avatar.execute(conn, msg, ["grupo"], msg.key.remoteJid);
  assert.equal(calls.length, 1);
  assert.match(calls[0][1].text, /grupo/i);
  assert.match(calls[0][1].text, /avatar grupo/i);
});

test("avatar execute resolves replied LID and sends a single styled image", async () => {
  const calls = [];
  const profileCalls = [];
  const msg = baseMessage({
    message: {
      extendedTextMessage: {
        text: ".avatar",
        contextInfo: {
          quotedMessage: { conversation: "oi" },
          participant: "77777@lid",
        },
      },
    },
  });

  const conn = {
    async groupMetadata() {
      return {
        id: msg.key.remoteJid,
        subject: "Grupo Teste",
        participants: [
          {
            id: "77777@lid",
            lid: "77777@lid",
            phoneNumber: "5511888888888@s.whatsapp.net",
          },
        ],
      };
    },
    async onWhatsApp() { return []; },
    async profilePictureUrl(jid, type) {
      profileCalls.push([jid, type]);
      if (jid === "5511888888888@s.whatsapp.net" && type === "image") {
        return "https://example.test/avatar.jpg";
      }
      throw new Error("not found");
    },
    async getName() { return "Pessoa Teste"; },
    async sendMessage(...args) {
      calls.push(args);
      return { key: { id: "SENT" } };
    },
  };

  await avatar.execute(conn, msg, [], msg.key.remoteJid);

  assert.equal(calls.length, 1);
  const payload = calls[0][1];
  assert.equal(payload.image.url, "https://example.test/avatar.jpg");
  assert.match(payload.caption, /Pessoa Teste/);
  assert.match(payload.caption, /Qualidade|𝚀𝚞𝚊𝚕𝚒𝚍𝚊𝚍𝚎/);
  assert.match(payload.caption, /Mensagem respondida/);
  assert.ok(!payload.caption.includes("@lid"));
  assert.deepEqual(payload.mentions, ["5511888888888@s.whatsapp.net"]);
  assert.ok(profileCalls.some(([jid]) => jid === "5511888888888@s.whatsapp.net"));
});
