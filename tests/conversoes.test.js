const test = require("node:test");
const assert = require("node:assert/strict");

const suite = require("../commands/outros/conversoes");

function closeTo(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
}

test("conversion suite exposes more than one thousand useful directed commands", () => {
  const generated = suite.commands.filter((command) => command.hidden === true);
  assert.equal(generated.length, 1054);
  assert.equal(suite.commands.length, 1057);
  assert.ok(suite.commands.some((command) => command.name === "conversor"));
  assert.ok(suite.commands.some((command) => command.name === "unidades"));
  assert.ok(suite.commands.some((command) => command.name === "totalconversoes"));
});

test("common length, mass, speed and data conversions are correct", () => {
  closeTo(suite.convert(1, "km", "m", "comprimento"), 1000);
  closeTo(suite.convert(1, "lb", "kg", "massa"), 0.45359237);
  closeTo(suite.convert(36, "kmh", "mps", "velocidade"), 10);
  closeTo(suite.convert(1, "mib", "byte", "dados"), 1048576);
});

test("aliases and decimal comma parsing stay user-friendly", () => {
  assert.equal(suite.normalizeUnit("quilometros"), "km");
  assert.equal(suite.normalizeUnit("graus"), "deg");
  assert.equal(suite.parseNumber("12,5"), 12.5);
  assert.equal(suite.parseNumber("abc"), null);
});

test("incompatible dimensions are rejected", () => {
  assert.throws(() => suite.convert(1, "kg", "m"), /UNIDADES_INCOMPATIVEIS/);
});
