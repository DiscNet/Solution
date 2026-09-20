const test = require("node:test");
const assert = require("node:assert/strict");

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
