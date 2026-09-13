const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const catalog = require("../functions/menuCatalog");

const conversionFile = path.join(
  __dirname,
  "..",
  "commands",
  "outros",
  "conversoes.js",
);

test("legacy conversion command suite stays removed", () => {
  assert.equal(fs.existsSync(conversionFile), false);

  for (const name of [
    "conversor",
    "converter",
    "conv",
    "unidades",
    "listaunidades",
    "totalconversoes",
    "contarconversoes",
    "conv-comprimento-km-m",
  ]) {
    assert.equal(catalog.resolve(name), null, name);
  }
});
