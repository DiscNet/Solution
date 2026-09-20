const test = require("node:test");
const assert = require("node:assert/strict");

const maintenance = require("../functions/maintenance");
const contactNameCache = require("../functions/contactNameCache");
const ban = require("../commands/admins/ban");
const testWelcomeGroup = require("../commands/admins/testwelcomegrupo");

test("ban fica fora da manutenção", () => {
  assert.equal(maintenance.list().includes("ban"), false);
});

test("ban escolhe uma identidade utilizável do participante", () => {
  const { actionJid } = ban._internals;
  assert.equal(
    actionJid({
      id: "123@lid",
      phoneNumber: "5511999999999@s.whatsapp.net",
    }),
    "5511999999999@s.whatsapp.net"
  );
  assert.equal(actionJid({ id: "123@lid" }), "123@lid");
});

test("ban aceita respostas de sucesso do Baileys", () => {
  const { removalConfirmed } = ban._internals;
  assert.equal(removalConfirmed([{ status: "200" }]), true);
  assert.equal(removalConfirmed([{ status: 200 }]), true);
  assert.equal(removalConfirmed([{ status: "403" }]), false);
  assert.equal(removalConfirmed(undefined), true);
});

test("cache de nomes associa pushName às identidades principal e alternativa", () => {
  contactNameCache.clear();
  contactNameCache.rememberMessage({
    pushName: "João Teste",
    key: {
      remoteJid: "120363000000000000@g.us",
      participant: "12345@lid",
      participantAlt: "5511999999999@s.whatsapp.net",
    },
  });

  assert.equal(contactNameCache.get(["12345@lid"]), "João Teste");
  assert.equal(
    contactNameCache.get(["5511999999999@s.whatsapp.net"]),
    "João Teste"
  );
  contactNameCache.clear();
});

test("cache de contatos aceita notify como nome público", () => {
  contactNameCache.clear();
  contactNameCache.rememberContacts([
    {
      id: "777@lid",
      phoneNumber: "5511888888888@s.whatsapp.net",
      notify: "Nome Público",
    },
  ]);

  assert.equal(contactNameCache.get(["777@lid"]), "Nome Público");
  assert.equal(
    contactNameCache.get(["5511888888888@s.whatsapp.net"]),
    "Nome Público"
  );
  contactNameCache.clear();
});

test("comando de teste do welcome está registrado para grupos", () => {
  assert.equal(testWelcomeGroup.name, "testwelcomegrupo");
  assert.equal(testWelcomeGroup.permissions.group, true);
  assert.equal(testWelcomeGroup.permissions.admin, true);
  assert.ok(testWelcomeGroup.aliases.includes("testbemvindo"));
});


test("ban mantém LID como fallback quando houver mais de uma identidade", () => {
  const { actionJids } = ban._internals;
  assert.deepEqual(
    actionJids({
      id: "123@lid",
      phoneNumber: "5511999999999@s.whatsapp.net",
    }),
    ["5511999999999@s.whatsapp.net", "123@lid"]
  );
});


test("ban tenta phoneNumber e cai para LID se necessário", async () => {
  const calls = [];
  const groupJid = "120363222222222222@g.us";
  const actor = "5511000000001@s.whatsapp.net";
  const botJid = "5511000000002@s.whatsapp.net";
  const targetPhone = "5511000000003@s.whatsapp.net";
  const targetLid = "999999@lid";

  const conn = {
    user: { id: botJid },
    async groupMetadata() {
      return {
        participants: [
          { id: actor, admin: "admin" },
          { id: botJid, admin: "admin" },
          { id: targetLid, phoneNumber: targetPhone, admin: null },
        ],
      };
    },
    async groupParticipantsUpdate(from, jids, action) {
      calls.push({ from, jid: jids[0], action });
      if (jids[0] === targetPhone) throw new Error("PN indisponível");
      return [{ status: "200" }];
    },
    async sendMessage() {
      return {};
    },
  };

  const msg = {
    key: {
      remoteJid: groupJid,
      participant: actor,
    },
    message: {
      extendedTextMessage: {
        text: ".ban @alvo",
        contextInfo: {
          mentionedJid: [targetPhone],
        },
      },
    },
  };

  await ban.execute(conn, msg, [], groupJid);

  assert.deepEqual(
    calls.map(item => item.jid),
    [targetPhone, targetLid]
  );
  assert.equal(calls.every(item => item.action === "remove"), true);
});
