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
