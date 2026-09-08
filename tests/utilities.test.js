const test = require("node:test");
const assert = require("node:assert/strict");

const suites = [
  require("../commands/outros/util-texto"),
  require("../commands/outros/util-internet"),
  require("../commands/outros/util-arquivos"),
  require("../commands/outros/util-produtividade"),
];

const commands = suites.flat();
const expected = [
  "ocr", "qrcode", "lerqr", "traduzir", "corrigir", "tts", "transcrever", "hash",
  "moeda", "clima", "encurtar", "expandirurl", "printsite", "statussite", "dns", "whois", "ip", "horario", "feriado",
  "arquivo", "img2pdf", "pdf2img", "unirpdf", "dividirpdf", "comprimirpdf",
  "calc", "lembrete", "enquete", "sorteioopcoes", "escolher", "cronometro", "idade", "data", "anotacao", "minhasnotas", "favorito",
];

test("utility suite exposes all requested commands with menu metadata", () => {
  assert.equal(commands.length, expected.length);
  assert.deepEqual(commands.map((c) => c.name).sort(), [...expected].sort());
  for (const command of commands) {
    assert.equal(command.menuCategory, "Utilidades", command.name);
    assert.ok(command.menuSection, command.name);
    assert.ok(command.usage, command.name);
    assert.ok(command.description && command.description.length <= 120, command.name);
    assert.equal(typeof command.execute, "function", command.name);
  }
});

test("explicitly excluded utilities are not added", () => {
  for (const name of ["zip", "unzip", "numero", "chamada", "resumir"]) {
    assert.ok(!commands.some((c) => c.name === name), name);
  }
});
