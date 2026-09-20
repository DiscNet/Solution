const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const card = require("../functions/profileCardV2");
const perfil = require("../commands/outros/perfil");

test("profileCardV2 usa o novo formato vertical 1680x900", async () => {
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
  assert.equal(metadata.height, 900);
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
  assert.match(overlay, />@<\/text>/);
  assert.match(overlay, />joaoaugusto<\/text>/);
  assert.match(overlay, />PERFIL</);
  assert.match(overlay, />SOBRE</);
  assert.match(overlay, /IDENTIDADE/);
  assert.match(overlay, /WHATSAPP/);
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


test("profileCardV2 mantém a foto visível no centro do avatar", async () => {
  const avatar = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 20, g: 90, b: 230 },
    },
  }).png().toBuffer();

  const output = await card.generateProfileCardV2({
    avatarBuffer: avatar,
    name: "Avatar Teste",
    gamertag: "avatar",
    status: "Membro",
    bio: "Teste de visibilidade.",
    accent: "#a855f7",
  });

  const { data, info } = await sharp(output)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const x = 276;
  const y = 310;
  const offset = (y * info.width + x) * info.channels;
  const r = data[offset];
  const g = data[offset + 1];
  const b = data[offset + 2];

  assert.ok(b > 180, `azul central muito baixo: ${b}`);
  assert.ok(b > r + 80);
  assert.ok(b > g + 60);
});

test("perfil usa a mesma leitura de bio do getbio", async () => {
  const result = await perfil._internals.fetchBio(
    {
      async fetchStatus() {
        return { status: { status: "Meu recado do WhatsApp" } };
      },
    },
    ["5511999999999@s.whatsapp.net"]
  );

  assert.equal(result.text, "Meu recado do WhatsApp");
  assert.equal(result.jid, "5511999999999@s.whatsapp.net");
});

test("perfil usa getStatus como fallback da mesma lógica do getbio", async () => {
  const result = await perfil._internals.fetchBio(
    {
      async fetchStatus() {
        throw new Error("indisponível");
      },
      async getStatus() {
        return [{ status: { status: "Bio alternativa" } }];
      },
    },
    ["5511888888888@s.whatsapp.net"]
  );

  assert.equal(result.text, "Bio alternativa");
});

test("perfil reduz cargo real para apenas Admin ou Membro", () => {
  assert.equal(perfil._internals.resolveCargo({ admin: "admin" }), "Admin");
  assert.equal(perfil._internals.resolveCargo({ admin: "superadmin" }), "Admin");
  assert.equal(perfil._internals.resolveCargo({ admin: null }), "Membro");
  assert.equal(perfil._internals.resolveCargo(null), "Membro");
});

test("perfil não possui mais opção VIP e mantém o formato detalhado", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "perfil.js"),
    "utf8"
  );

  assert.doesNotMatch(source, /isVip/);
  assert.doesNotMatch(source, /ᴠɪᴘ/i);
  assert.match(source, /ᴘᴇʀғɪʟ ᴅᴏ ᴜsᴜᴀʀɪᴏ/);
  assert.match(source, /ɴɪᴠᴇʟ ɢᴀᴅᴏ/);
  assert.match(source, /ɢᴏsᴛᴏsᴜʀᴀ/);
  assert.match(source, /ᴘᴜᴛᴀʀɪᴀ/);
  assert.match(source, /ᴘʀᴏɢʀᴀᴍᴀ/);
});


test("profileCardV2 usa o avatar como fundo da metade superior", async () => {
  const avatar = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 210, g: 40, b: 55 },
    },
  }).png().toBuffer();

  const output = await card.generateProfileCardV2({
    avatarBuffer: avatar,
    name: "Hero Teste",
    gamertag: "hero",
    status: "Membro",
    bio: "Fundo derivado do avatar.",
    accent: "#d92f42",
  });

  const { data, info } = await sharp(output)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const pixel = (x, y) => {
    const offset = (y * info.width + x) * info.channels;
    return [data[offset], data[offset + 1], data[offset + 2]];
  };

  const topRight = pixel(1420, 210);
  assert.ok(topRight[0] > topRight[1] + 35);
  assert.ok(topRight[0] > topRight[2] + 25);
});

test("profileCardV2 mantém a metade inferior predominantemente preta", async () => {
  const avatar = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 30, g: 160, b: 220 },
    },
  }).png().toBuffer();

  const output = await card.generateProfileCardV2({
    avatarBuffer: avatar,
    name: "Painel Teste",
    gamertag: "painel",
    status: "Admin",
    bio: "A metade inferior deve continuar escura.",
    accent: "#35aee0",
  });

  const { data, info } = await sharp(output)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const offset = (850 * info.width + 1500) * info.channels;
  const rgb = [data[offset], data[offset + 1], data[offset + 2]];
  assert.ok(rgb.every(value => value < 35), "painel inferior deixou de ser preto/escuro");
});

test("profileCardV2 inclui ícones e chips decorativos no novo banner", () => {
  const overlay = card._internals.buildOverlaySvg({
    name: "Ícones",
    gamertag: "icones",
    status: "Admin • Grupo",
    bio: "Banner mais preenchido.",
    accent: "#a855f7",
  }).toString("utf8");

  assert.match(overlay, /IDENTIDADE/);
  assert.match(overlay, /WHATSAPP/);
  assert.match(overlay, /PERFIL/);
  assert.match(overlay, /<circle/);
  assert.match(overlay, /<path/);
});


test("profileCardV2 gera thumbnail JPEG nítido para o preview do WhatsApp", async () => {
  const avatar = await sharp({
    create: {
      width: 600,
      height: 600,
      channels: 3,
      background: { r: 80, g: 130, b: 220 },
    },
  }).png().toBuffer();

  const image = await card.generateProfileCardV2({
    avatarBuffer: avatar,
    name: "Preview Teste",
    gamertag: "preview",
    status: "Membro",
    bio: "Thumbnail dedicado para o preview da conversa.",
  });

  const preview = await card.generateProfileCardPreview(image);
  const metadata = await sharp(preview.buffer).metadata();

  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.width, card.PREVIEW_WIDTH);
  assert.equal(metadata.height, card.PREVIEW_HEIGHT);
  assert.equal(preview.width, card.PREVIEW_WIDTH);
  assert.equal(preview.height, card.PREVIEW_HEIGHT);
  assert.equal(Buffer.from(preview.base64, "base64").length, preview.buffer.length);
  assert.ok(preview.buffer.length > 10_000);
});

test("perfil envia thumbnail customizado e dimensões reais do card", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "outros", "perfil.js"),
    "utf8"
  );

  assert.match(source, /generateProfileCardPreview/);
  assert.match(source, /jpegThumbnail:\s*preview\.base64/);
  assert.match(source, /width:\s*1680/);
  assert.match(source, /height:\s*900/);
});
