const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

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
      name: "João Teste",
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
