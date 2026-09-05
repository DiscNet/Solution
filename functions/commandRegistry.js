const fs = require("fs");
const path = require("path");

function normalizeCommandName(value) {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  if (!normalized || /\s/.test(normalized)) return null;
  return normalized;
}

function getCommandAliases(command) {
  const raw = [];

  if (Array.isArray(command?.aliases)) raw.push(...command.aliases);
  else if (typeof command?.aliases === "string") raw.push(command.aliases);

  // Compatibilidade com módulos antigos que usam `alias` no singular.
  if (Array.isArray(command?.alias)) raw.push(...command.alias);
  else if (typeof command?.alias === "string") raw.push(command.alias);

  return [...new Set(raw.map(normalizeCommandName).filter(Boolean))];
}

function walkJsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;

  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) walkJsFiles(fullPath, out);
    else if (entry.isFile() && entry.name.endsWith(".js")) out.push(fullPath);
  }

  return out;
}

function loadCommandModules(commandsPath, options = {}) {
  const clearCache = options.clearCache !== false;
  const records = [];
  const errors = [];

  for (const file of walkJsFiles(commandsPath)) {
    try {
      if (clearCache) {
        const resolved = require.resolve(file);
        delete require.cache[resolved];
      }

      const command = require(file);
      const name = normalizeCommandName(command?.name);
      if (!name) continue;

      records.push({ file, command, name, aliases: getCommandAliases(command) });
    } catch (error) {
      errors.push({ file, error });
    }
  }

  return { records, errors };
}

function buildCommandRegistry(records) {
  const registry = Object.create(null);
  const owners = new Map();
  const collisions = [];

  // Primeiro reserva todos os nomes canônicos. Assim um alias nunca pode
  // sobrescrever o nome real de outro comando.
  for (const record of records) {
    const existing = owners.get(record.name);
    if (existing && existing.record.command !== record.command) {
      collisions.push({
        type: "canonical",
        key: record.name,
        kept: existing.record,
        ignored: record
      });
      continue;
    }

    registry[record.name] = record.command;
    owners.set(record.name, { type: "canonical", record });
  }

  // Depois registra aliases sem sobrescrever nomes ou aliases já válidos.
  for (const record of records) {
    if (registry[record.name] !== record.command) continue;

    for (const alias of record.aliases) {
      if (alias === record.name) continue;

      const existing = owners.get(alias);
      if (existing) {
        if (existing.record.command !== record.command) {
          collisions.push({
            type: existing.type === "canonical" ? "alias-vs-canonical" : "alias",
            key: alias,
            kept: existing.record,
            ignored: record
          });
        }
        continue;
      }

      registry[alias] = record.command;
      owners.set(alias, { type: "alias", record });
    }
  }

  return { registry, collisions };
}

function replaceRegistry(target, source) {
  for (const key of Object.keys(target)) delete target[key];
  Object.assign(target, source);
  return target;
}

function formatRegistryIssue(issue, root = process.cwd()) {
  const kept = path.relative(root, issue.kept.file);
  const ignored = path.relative(root, issue.ignored.file);
  return `${issue.type} "${issue.key}": ${kept} preservado; ${ignored} ignorado`;
}

module.exports = {
  normalizeCommandName,
  getCommandAliases,
  walkJsFiles,
  loadCommandModules,
  buildCommandRegistry,
  replaceRegistry,
  formatRegistryIssue
};
