const test = require("node:test");
const assert = require("node:assert/strict");
const sharp = require("sharp");

const card = require("../functions/welcomeCard");
const command = require("../commands/outros/testwelcome");

test("testwelcome usa os cinco campos do SkyNetApi clássico", () => {
  const parsed = card.parseCommandInput(
    "https://example.com/fundo.jpg | https://example.com/avatar.png | topo | principal | rodapé"
  );
  assert.ok(parsed);
  assert.equal(parsed.backgroundUrl, "https://example.com/fundo.jpg");
  assert.equal(parsed.mainImageUrl, "https://example.com/avatar.png");
  assert.equal(parsed.text1, "topo");
  assert.equal(parsed.text2, "principal");
  assert.equal(parsed.text3, "rodapé");
});

test("testwelcome preserva barras extras no texto3", () => {
  const parsed = card.parseCommandInput(
    "https://example.com/a.jpg | https://example.com/b.jpg | um | dois | três | continuação"
  );
  assert.equal(parsed.text3, "três | continuação");
});

test("welcomeCard mantém tamanho e paleta do gerador antigo", () => {
  assert.equal(card.CARD_SIZE, 1080);
  assert.deepEqual(card.NEON_COLORS, ["#ff1744", "#00a8ff", "#39ff14", "#a855f7"]);
});

test("testwelcome está registrado no catálogo", () => {
  assert.equal(command.name, "testwelcome");
  assert.ok(command.aliases.includes("twelcome"));
});


test("welcomeCard deixa os cantos externos realmente transparentes", async () => {
  const source = await sharp({
    create: {
      width: card.CARD_SIZE,
      height: card.CARD_SIZE,
      channels: 4,
      background: { r: 255, g: 0, b: 0, alpha: 1 },
    },
  }).png().toBuffer();

  const masked = await card._internals.prepareRoundedBackground(source);
  const { data, info } = await sharp(masked)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];

  assert.equal(alphaAt(0, 0), 0);
  assert.equal(alphaAt(540, 540), 255);
});

test("welcomeCard prepara renderização e medição para emojis", () => {
  const overlay = card._internals.buildOverlaySvg({
    text1: "Olá 👋🏽",
    text2: "Bem-vindo 🎉",
    text3: "🔥 emojis",
    neon: "#00a8ff",
  }).toString("utf8");

  assert.match(overlay, /Noto Color Emoji/);
  assert.match(overlay, /clipPath id="cardClip"/);
  assert.ok(card._internals.approxWidth("😀", 40) > card._internals.approxWidth("i", 40));
});


test("welcomeCard deriva a cor principal da paleta do avatar", async () => {
  const redAvatar = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 220, g: 35, b: 45 },
    },
  }).png().toBuffer();

  const blueAvatar = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 35, g: 80, b: 220 },
    },
  }).png().toBuffer();

  const redNeon = await card._internals.deriveAvatarNeon(redAvatar);
  const blueNeon = await card._internals.deriveAvatarNeon(blueAvatar);

  assert.match(redNeon, /^#[0-9a-f]{6}$/i);
  assert.match(blueNeon, /^#[0-9a-f]{6}$/i);
  assert.notEqual(redNeon, blueNeon);

  const redRgb = redNeon.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));
  const blueRgb = blueNeon.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));

  assert.ok(redRgb[0] > redRgb[1] && redRgb[0] > redRgb[2]);
  assert.ok(blueRgb[2] > blueRgb[0] && blueRgb[2] > blueRgb[1]);
});

test("welcomeCard mantém as barras de texto dentro de limites estáveis", () => {
  const overlay = card._internals.buildOverlaySvg({
    text1: "SEJA BEM-VINDO(A)!",
    text2: "Um nome extremamente grande para testar o ajuste correto da barra atrás do texto",
    text3: "Um grupo com um nome igualmente grande para testar o limite visual",
    neon: "#6f7cff",
  }).toString("utf8");

  const barWidths = [...overlay.matchAll(
    /<rect x="[^"]+" y="[^"]+" width="([^"]+)" height="[^"]+" rx="[^"]+" fill="rgba\(5,7,14,[^)]+\)"/g
  )].map(match => Number(match[1]));

  assert.equal(barWidths.length, 3);
  assert.ok(barWidths.every(width => width >= 190 && width <= 930));
});


test("welcomeCard mantém avatar preto e branco com acento neutro", async () => {
  const bwAvatar = await sharp({
    create: {
      width: 128,
      height: 128,
      channels: 3,
      background: { r: 235, g: 235, b: 235 },
    },
  })
    .composite([{
      input: await sharp({
        create: {
          width: 64,
          height: 128,
          channels: 3,
          background: { r: 20, g: 20, b: 20 },
        },
      }).png().toBuffer(),
      left: 0,
      top: 0,
    }])
    .png()
    .toBuffer();

  const neon = await card._internals.deriveAvatarNeon(bwAvatar);
  const rgb = neon.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));

  assert.equal(rgb.length, 3);
  assert.ok(Math.abs(rgb[0] - rgb[1]) <= 2);
  assert.ok(Math.abs(rgb[1] - rgb[2]) <= 2);
});

test("welcomeCard não converte cinza puro em vermelho", async () => {
  const grayAvatar = await sharp({
    create: {
      width: 96,
      height: 96,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
    },
  }).png().toBuffer();

  const neon = await card._internals.deriveAvatarNeon(grayAvatar);
  const rgb = neon.match(/[0-9a-f]{2}/gi).map(value => parseInt(value, 16));

  assert.equal(rgb[0], rgb[1]);
  assert.equal(rgb[1], rgb[2]);
});
