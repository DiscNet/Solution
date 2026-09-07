const path = require("path");
const {
  loadCommandModules,
  buildCommandRegistry,
  normalizeCommandName,
} = require("./commandRegistry");
let snapshot;
function prime(records, errors = [], collisions = []) {
  snapshot = { records, errors, collisions };
}
function diagnostics() {
  if (!snapshot) {
    const loaded = loadCommandModules(path.join(__dirname, "..", "commands"), {
      clearCache: false,
    });
    const built = buildCommandRegistry(loaded.records);
    prime(loaded.records, loaded.errors, built.collisions);
  }
  return snapshot;
}
function records() {
  return diagnostics().records;
}
function resolve(name) {
  const config = require("../config/config");
  let key = String(name || "");
  if (key.startsWith(config.prefix || "."))
    key = key.slice((config.prefix || ".").length);
  key = normalizeCommandName(key);
  if (!key) return null;
  const r =
    records().find((r) => r.name === key) ||
    records().find((r) => r.aliases.includes(key));
  return r?.command || null;
}
function normalize(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}
const categories = {
  rpg: "RPG",
  adm: "Grupos",
  admins: "Grupos",
  grupos: "Grupos",
  dono: "Dono",
  dws: "Downloads",
  downloads: "Downloads",
  alterar: "Alteradores",
  alteradores: "Alteradores",
  sticker: "Figurinhas",
  figurinhas: "Figurinhas",
  bn: "Brincadeiras",
  brincadeiras: "Brincadeiras",
  outros: "Utilidades",
  utilidades: "Utilidades",
  menus: "Menus",
  geral: null,
};
function formatLine(command, prefix = ".") {
  const usage = command.usage;
  const description = usage ? `Uso: ${prefix}${usage}` : command.description;
  return `${prefix}${command.name} | ${description}`;
}
function sections(category) {
  return [
    ...new Set(
      records()
        .filter((r) => !category || r.command.menuCategory === category)
        .map((r) => r.command.menuSection),
    ),
  ].sort((a, b) => a.localeCompare(b, "pt-BR"));
}
function pages({
  category = null,
  section = "",
  prefix = ".",
  limit = 3200,
} = {}) {
  const rows = records()
    .filter(
      (r) =>
        (!category || r.command.menuCategory === category) &&
        (!section ||
          normalize(r.command.menuSection).includes(normalize(section))),
    )
    .sort(
      (a, b) =>
        (a.command.menuCategory + " " + a.command.menuSection).localeCompare(
          b.command.menuCategory + " " + b.command.menuSection,
          "pt-BR",
        ) || a.name.localeCompare(b.name, "pt-BR"),
    );
  const output = [];
  let text = "",
    last = "";
  for (const r of rows) {
    const label = `${r.command.menuCategory} - ${r.command.menuSection}`;
    const header = `*${label}*\n`;
    const line = formatLine(r.command, prefix) + "\n";
    const addition = (last !== label ? "\n" + header : "") + line;
    if (text && text.length + addition.length > limit) {
      output.push(text.trim());
      text = header;
      last = label;
    } else if (last !== label) {
      text += "\n" + header;
      last = label;
    }
    text += line;
  }
  if (text) output.push(text.trim());
  return output;
}
module.exports = {
  prime,
  diagnostics,
  records,
  resolve,
  normalize,
  categories,
  formatLine,
  sections,
  pages,
};
