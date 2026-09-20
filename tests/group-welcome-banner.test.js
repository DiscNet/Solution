const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");
const contactNameCache = require("../functions/contactNameCache");

const {
  getParticipantJid,
  createGroupWelcomeBanner,
  _internals,
} = require("../functions/groupWelcomeBanner");

test("groupWelcomeBanner normaliza participantes do Baileys", () => {
  assert.equal(getParticipantJid("5511999999999@s.whatsapp.net"), "5511999999999@s.whatsapp.net");
  assert.equal(
    getParticipantJid({ phoneNumber: "5511888888888@s.whatsapp.net", id: "123@lid" }),
    "5511888888888@s.whatsapp.net"
  );
  assert.equal(getParticipantJid({ id: "123@lid" }), "123@lid");
});

test("groupWelcomeBanner cria card local sem API externa", async () => {
  const conn = {
    async groupMetadata() {
      return {
        subject: "Grupo Teste",
        participants: [{ id: "5511999999999@s.whatsapp.net" }],
      };
    },
    async profilePictureUrl() {
      throw new Error("sem foto");
    },
  };

  const result = await createGroupWelcomeBanner(conn, {
    groupJid: "120363000000000000@g.us",
    participant: {
      id: "5511999999999@s.whatsapp.net",
      pushName: "João Teste",
    },
    text1: "BEM-VINDO",
  });

  const metadata = await sharp(result.image).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1080);
  assert.equal(metadata.height, 1080);
  assert.equal(result.groupName, "Grupo Teste");
  assert.equal(result.displayName, "João Teste");
});

test("fallback local é utilizável quando URL remota falha", async () => {
  const fallback = await _internals.createFallbackAvatar("Teste");
  const card = require("../functions/welcomeCard");

  const resolved = await card._internals.resolveImageSource(
    "http://127.0.0.1/avatar.png",
    fallback,
    "a imagem principal"
  );

  const metadata = await sharp(resolved).metadata();
  assert.equal(metadata.format, "png");
  assert.ok(metadata.width > 0);
  assert.ok(metadata.height > 0);
});


test("groupWelcomeBanner prioriza somente pushName como nome visual", async () => {
  const name = await _internals.resolveDisplayName(
    {
      async contactFetchWait() {
        return {
          pushName: "Push do contato",
          notify: "Notify ignorado",
          name: "Nome salvo ignorado",
        };
      },
    },
    {
      id: "5511777777777@s.whatsapp.net",
      pushName: "Push direto",
      notify: "Notify direto",
      name: "Nome direto",
    },
    {
      participants: [{
        id: "5511777777777@s.whatsapp.net",
        pushName: "Push metadata",
        notify: "Notify metadata",
      }],
    },
    ["5511777777777@s.whatsapp.net"]
  );

  assert.equal(name, "Push direto");
});

test("groupWelcomeBanner não usa número como nome quando pushName não existe", async () => {
  const name = await _internals.resolveDisplayName(
    {},
    "5511666666666@s.whatsapp.net",
    { participants: [] },
    ["5511666666666@s.whatsapp.net"]
  );

  assert.equal(name, "Novo membro");
});

test("cleanPushName remove quebras e limita texto inseguro", () => {
  assert.equal(
    _internals.cleanPushName("  João\n   Teste\t "),
    "João Teste"
  );
  assert.ok(_internals.cleanPushName("x".repeat(200)).length <= 80);
});


test("groupWelcomeBanner usa notify como push name do Baileys", async () => {
  const name = await _internals.resolveDisplayName(
    {
      async contactFetchWait() {
        return { notify: "João do WhatsApp" };
      },
    },
    "5511555555555@s.whatsapp.net",
    { participants: [] },
    ["5511555555555@s.whatsapp.net"]
  );

  assert.equal(name, "João do WhatsApp");
});

test("cleanPushName rejeita números e JIDs como nome visual", () => {
  assert.equal(_internals.cleanPushName("5511999999999"), "");
  assert.equal(_internals.cleanPushName("+55 (11) 99999-9999"), "");
  assert.equal(_internals.cleanPushName("5511999999999@s.whatsapp.net"), "");
  assert.equal(_internals.cleanPushName("João"), "João");
});


test("groupWelcomeBanner cruza phoneNumber com LID para achar o pushName", async () => {
  contactNameCache.clear();
  contactNameCache.remember(["777777@lid"], "Nome pelo LID");

  const conn = {
    async groupMetadata() {
      return {
        subject: "Grupo Alias",
        participants: [{
          id: "777777@lid",
          phoneNumber: "5511777777777@s.whatsapp.net",
        }],
      };
    },
    async profilePictureUrl() {
      throw new Error("sem foto");
    },
  };

  const result = await createGroupWelcomeBanner(conn, {
    groupJid: "120363111111111111@g.us",
    participant: "5511777777777@s.whatsapp.net",
  });

  assert.equal(result.displayName, "Nome pelo LID");
  assert.equal(
    contactNameCache.get(["5511777777777@s.whatsapp.net"]),
    "Nome pelo LID"
  );
  contactNameCache.clear();
});
