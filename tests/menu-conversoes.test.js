const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const catalog = require("../functions/menuCatalog");

const menuFile = path.join(
  __dirname,
  "..",
  "commands",
  "menus",
  "menuconversoes.js",
);
const mainMenuFile = path.join(
  __dirname,
  "..",
  "commands",
  "menus",
  "menu.js",
);

test("legacy conversion menu stays removed", () => {
  assert.equal(fs.existsSync(menuFile), false);

  const source = fs.readFileSync(mainMenuFile, "utf8");
  assert.doesNotMatch(source, /menuconversoes/i);
  assert.doesNotMatch(source, /menuconv(?:comprimento|massa|volume|velocidade|tempo|dados|energia|pressao|angulo)/i);
});

test("catalog no longer exposes conversion menu entries", () => {
  const text = catalog.pages({ limit: 60000 }).join("\n");
  assert.doesNotMatch(text, /\.menuconversoes\b/i);
  assert.doesNotMatch(text, /\.menuconv(?:comprimento|massa|volume|velocidade|tempo|dados|energia|pressao|angulo)\b/i);
  assert.doesNotMatch(text, /\.conversor\b/i);
  assert.doesNotMatch(text, /\.unidades\b/i);
});
