const test = require("node:test");
const assert = require("node:assert/strict");

const commands = require("../commands/brincadeiras/extras");

const byName = Object.fromEntries(commands.map((command) => [command.name, command]));

const expected = [
  "verdade", "desafio", "eununca", "8ball", "ppt", "dado",
  "sorteio", "roleta", "quem", "top5", "ship", "amizade",
  "abracar", "soco", "roubaravatar", "forca"
];

test("pacote registra todas as brincadeiras pedidas", () => {
  for (const name of expected) assert.ok(byName[name], `faltando comando ${name}`);
  assert.equal(new Set(commands.map((command) => command.name)).size, commands.length);
});

test("comandos excluídos pelo pedido não foram adicionados", () => {
  for (const name of ["moeda", "escolher", "frasefake", "confissao", "velha"]) {
    assert.equal(byName[name], undefined);
  }
});

test("seções do menu ficam organizadas", () => {
  const sections = new Set(commands.map((command) => command.menuSection));
  assert.ok(sections.has("Jogos rápidos"));
  assert.ok(sections.has("Aleatórios e sorteios"));
  assert.ok(sections.has("Interações"));
  assert.ok(commands.every((command) => command.menuCategory === "Brincadeiras"));
});

test("todos continuam disponíveis para membros comuns", () => {
  for (const command of commands) {
    assert.notEqual(command.permissions?.admin, true);
    assert.notEqual(command.permissions?.owner, true);
  }
});

test("compatibilidade é determinística para o mesmo par", () => {
  const { stablePercent } = commands._test;
  const a = "5511999999999@s.whatsapp.net";
  const b = "5521999999999@s.whatsapp.net";
  assert.equal(stablePercent(a, b, "ship"), stablePercent(b, a, "ship"));
  assert.ok(stablePercent(a, b, "ship") >= 0);
  assert.ok(stablePercent(a, b, "ship") <= 100);
});

test("forca normaliza palpites e possui banco de palavras", () => {
  const { normalizeGuess, hangmanWords } = commands._test;
  assert.equal(normalizeGuess("VULCÃO!"), "vulcao");
  assert.ok(hangmanWords.length >= 20);
  assert.ok(hangmanWords.every((item) => /^[a-z]+$/.test(item.word)));
});
