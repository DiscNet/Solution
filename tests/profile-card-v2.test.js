const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const card = require("../functions/profileCardV2");
const perfil = require("../commands/outros/perfil");

test("profileCardV2 mantém o formato 1680x720 do SkyNetApi Card 2.0", async () => {
  const avatar = await sharp({
    create: {
      width: 420,
      height: 420,
      channels: 3,
      background: { r: 35, g: 80, b: 220 },
    },
  }).png().toBuffer();

  const output = await card.generateProfileCardV2({
    avatarBuffer: avatar,
    name: "João Augusto",
    gamertag: "joaoaugusto",
    status: "MEMBRO • Grupo Teste",
    bio: "Uma descrição curta usada para validar o novo Card 2.0.",
  });

  const metadata = await sharp(output).metadata();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.width, 1680);
  assert.equal(metadata.height, 720);
});

test("profileCardV2 gera fallback quando avatar não está disponível", async () => {
  const output = await card.generateProfileCardV2({
    name: "Usuário Teste",
    gamertag: "usuario",
    status: "MEMBRO",
    bio: "Sem recado público disponível.",
  });

  const metadata = await sharp(output).metadata();
  assert.equal(metadata.width, card.WIDTH);
  assert.equal(metadata.height, card.HEIGHT);
  assert.ok(output.length > 1000);
});

test("profileCardV2 preserva os elementos visuais centrais do Card 2.0", () => {
  const overlay = card._internals.buildOverlaySvg({
    name: "João Augusto",
    gamertag: "joaoaugusto",
    status: "ADMIN • Grupo",
    bio: "Descrição",
    accent: "#a855f7",
  }).toString("utf8");

  assert.match(overlay, />PERFIL</);
  assert.match(overlay, />SOBRE</);
  assert.match(overlay, /João Augusto/);
  assert.match(overlay, /@joaoaugusto/);
  assert.match(overlay, /width="600" height="600"/);
});

test("comando perfil usa o renderer Card 2.0 local e não a Tokito API", () => {
  assert.equal(perfil.name, "perfil");
  assert.ok(perfil.aliases.includes("profile"));

  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "perfil.js"),
    "utf8"
  );

  assert.match(source, /generateProfileCardV2/);
  assert.doesNotMatch(source, /tokito-apis\.com\.br/i);
  assert.doesNotMatch(source, /tokitoApi/);
});

test("perfil reconhece a mesma pessoa entre phoneNumber e LID", () => {
  const metadata = {
    participants: [{
      id: "123456@lid",
      phoneNumber: "5511999999999@s.whatsapp.net",
      admin: "admin",
    }],
  };

  const found = perfil._internals.findParticipant(
    metadata,
    ["5511999999999@s.whatsapp.net"]
  );

  assert.ok(found);
  assert.equal(found.id, "123456@lid");
});
