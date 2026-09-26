const fs = require("fs");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");
const ROOTS = [
  path.join(PROJECT_ROOT, "commands"),
  path.join(PROJECT_ROOT, "DADOS_KXLYN", "plugins"),
];
// Quantidade mínima é opcional. O catálogo deve priorizar comandos úteis,
// não famílias geradas apenas para inflar a contagem.
const MIN_COMMANDS = Number(process.env.MIN_COMMANDS || 0);

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(full);
  }
  return out;
}

function normalizeName(value) {
  if (typeof value !== "string") return null;
  const name = value.trim().toLowerCase();
  if (!name || /\s/.test(name)) return null;
  return name;
}

function collectAliases(command) {
  const raw = [];
  if (Array.isArray(command?.aliases)) raw.push(...command.aliases);
  else if (typeof command?.aliases === "string") raw.push(command.aliases);
  if (Array.isArray(command?.alias)) raw.push(...command.alias);
  else if (typeof command?.alias === "string") raw.push(command.alias);
  return [...new Set(raw.map(normalizeName).filter(Boolean))];
}

function expand(exported) {
  if (Array.isArray(exported)) return exported;
  if (Array.isArray(exported?.commands)) return exported.commands;
  return exported ? [exported] : [];
}

const records = [];
const loadErrors = [];
for (const root of ROOTS) for (const file of walk(root)) {
  try {
    delete require.cache[require.resolve(file)];
    const exported = require(file);
    for (const command of expand(exported)) {
      const name = normalizeName(command?.name);
      if (!name) continue;
      records.push({
        file: path.relative(PROJECT_ROOT, file),
        name,
        aliases: collectAliases(command),
        hidden: command?.hidden === true,
      });
    }
  } catch (error) {
    loadErrors.push({ file: path.relative(PROJECT_ROOT, file), error: error.message });
  }
}

const canonical = new Map();
const duplicateNames = [];
for (const record of records) {
  if (canonical.has(record.name)) duplicateNames.push([record.name, canonical.get(record.name).file, record.file]);
  else canonical.set(record.name, record);
}

const claims = new Map([...canonical].map(([name, record]) => [name, { type: "name", record }]));
const aliasCollisions = [];
for (const record of records) {
  for (const alias of record.aliases) {
    if (alias === record.name) continue;
    const existing = claims.get(alias);
    if (existing && existing.record !== record) {
      aliasCollisions.push({ alias, first: existing.record.file, second: record.file, firstType: existing.type });
      continue;
    }
    if (!existing) claims.set(alias, { type: "alias", record });
  }
}

const hiddenCount = records.filter((record) => record.hidden).length;
const belowTarget = Number.isFinite(MIN_COMMANDS) && MIN_COMMANDS > 0 && records.length < MIN_COMMANDS;

console.log(`Commands: ${records.length}`);
console.log(`Visible commands: ${records.length - hiddenCount}`);
console.log(`Hidden/generated commands: ${hiddenCount}`);
console.log(`Minimum target: ${MIN_COMMANDS > 0 ? MIN_COMMANDS : "disabled"}`);
console.log(`Canonical duplicates: ${duplicateNames.length}`);
for (const [name, first, second] of duplicateNames) console.log(`DUPLICATE_NAME ${name}: ${first} <> ${second}`);
console.log(`Alias collisions: ${aliasCollisions.length}`);
for (const item of aliasCollisions) console.log(`ALIAS_COLLISION ${item.alias}: ${item.first} <> ${item.second} (first=${item.firstType})`);
console.log(`Load errors: ${loadErrors.length}`);
for (const item of loadErrors) console.log(`LOAD_ERROR ${item.file}: ${item.error}`);
if (belowTarget) console.log(`COMMAND_TARGET_MISSED ${records.length}/${MIN_COMMANDS}`);

if (duplicateNames.length || aliasCollisions.length || loadErrors.length || belowTarget) process.exitCode = 1;
