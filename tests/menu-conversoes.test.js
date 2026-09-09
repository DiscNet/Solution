const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const catalog = require("../functions/menuCatalog");
const menuModule = require("../commands/menus/menuconversoes");
const { dimensions } = require("../commands/outros/conversoes");

test("conversion menus expose every generated command by dimension", () => {
  const expectedTotal = Object.keys(dimensions).reduce(
    (sum, dimension) => sum + menuModule.countFor(dimension),
    0,
  );
  assert.equal(expectedTotal, 1054);
  assert.equal(menuModule.commands.length, Object.keys(dimensions).length + 1);

  let listed = 0;
  for (const dimension of Object.keys(dimensions)) {
    const pages = catalog.pages({
      category: "Utilidades",
      section: "Conversões",
      includeHidden: true,
      namePrefix: `conv-${dimension}-`,
      limit: 50000,
    });
    const text = pages.join("\n");
    const lines = text
      .split("\n")
      .filter((line) => line.startsWith(`.conv-${dimension}-`));
    assert.equal(lines.length, menuModule.countFor(dimension), dimension);
    assert.ok(pages.every((page) => page.length <= 50000), dimension);
    listed += lines.length;
  }
  assert.equal(listed, 1054);
});

test("menugeral catalog exposes the dedicated conversion menus without dumping generated commands", () => {
  const text = catalog.pages({ limit: 60000 }).join("\n");
  assert.match(text, /\.menuconversoes \|/);
  for (const dimension of Object.keys(dimensions)) {
    assert.match(text, new RegExp(`\\.menuconv${dimension} \\|`));
  }
  assert.doesNotMatch(text, /\.conv-comprimento-km-m \|/);
});

test("main interactive menu links every converter submenu with friendly labels", () => {
  const source = fs.readFileSync(
    path.join(__dirname, "..", "commands", "menus", "menu.js"),
    "utf8",
  );
  assert.match(source, /menuconversoes/);
  for (const dimension of Object.keys(dimensions)) {
    assert.match(source, new RegExp(`menuconv${dimension}`), dimension);
  }
  assert.match(source, /MEDIDAS E DISTÂNCIAS/);
  assert.match(source, /INTERNET E ARMAZENAMENTO/);
  assert.match(source, /LITROS E VOLUME/);
});

test("conversion menu labels stay simple for everyday users", () => {
  assert.equal(menuModule.labels.comprimento, "Medidas e distâncias");
  assert.equal(menuModule.labels.massa, "Peso");
  assert.equal(menuModule.labels.dados, "Internet e armazenamento");
  assert.equal(menuModule.labels.volume, "Litros e volume");
});

test("conversion menu commands preserve normal menu metadata", () => {
  for (const command of menuModule.commands) {
    assert.equal(command.menuCategory, "Menus");
    assert.equal(command.menuSection, "Conversões");
    assert.ok(command.description.length <= 120, command.name);
  }
});
