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
