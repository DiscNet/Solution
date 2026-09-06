const fs = require("fs");
const path = require("path");

const ADMIN_GROUP_ONLY = new Set(["admlist", "listmembros"]);
const ADMIN_BOT_ADMIN = new Set([
  "abrir", "add-user", "ban", "del-perfil", "fechar",
  "promover", "rebaixar", "set-desc", "set-nome", "set-perfil"
]);
const RPG_GROUP_COMMANDS = new Set([
  "cacar", "ficha", "loja", "lojapets", "minerar", "pets",
  "rankgold", "ranklevel", "registro", "roubar"
]);
const RPG_OWNER_COMMANDS = new Set(["set-gold", "ver-ficha"]);

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

  if (Array.isArray(command?.alias)) raw.push(...command.alias);
  else if (typeof command?.alias === "string") raw.push(command.alias);

  return [...new Set(raw.map(normalizeCommandName).filter(Boolean))];
}

function normalizePermissions(value = {}) {
  const permissions = {};
  for (const key of ["owner", "group", "private", "admin", "botAdmin"]) {
    if (value?.[key] === true) permissions[key] = true;
    else if (value?.[key] === false) permissions[key] = false;
  }
  return permissions;
}

function inferLegacyPermissions(file, name) {
  const normalized = String(file || "").replace(/\\/g, "/");
  const filename = path.basename(normalized, ".js").toLowerCase();

  if (normalized.includes("/commands/dono/")) return { owner: true };

  if (normalized.includes("/commands/admins/")) {
    if (ADMIN_GROUP_ONLY.has(filename)) return { group: true };
    const permissions = { group: true, admin: true };
    if (ADMIN_BOT_ADMIN.has(filename)) permissions.botAdmin = true;
    return permissions;
  }

  if (normalized.includes("/commands/rpg/")) {
    if (RPG_OWNER_COMMANDS.has(filename) || RPG_OWNER_COMMANDS.has(name)) return { owner: true };
    if (RPG_GROUP_COMMANDS.has(filename) || RPG_GROUP_COMMANDS.has(name)) return { group: true };
  }

  return {};
}

function getCommandPermissions(command, file, name) {
  const inferred = inferLegacyPermissions(file, name);
  const explicit = normalizePermissions(command?.permissions);
  const merged = { ...inferred, ...explicit };
  for (const key of Object.keys(merged)) {
    if (merged[key] !== true) delete merged[key];
  }
  return merged;
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

      // Compatibilidade durante a migração: módulos antigos ainda recebem uma
      // política segura pela pasta, enquanto módulos novos podem declarar
      // `permissions` diretamente no próprio comando.
      command.permissions = getCommandPermissions(command, file, name);
      records.push({
        file,
        command,
        name,
        aliases: getCommandAliases(command),
        permissions: command.permissions
      });
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

  for (const record of records) {
    const existing = owners.get(record.name);
    if (existing && existing.record.command !== record.command) {
      collisions.push({ type: "canonical", key: record.name, kept: existing.record, ignored: record });
      continue;
    }

    registry[record.name] = record.command;
    owners.set(record.name, { type: "canonical", record });
  }

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
  normalizePermissions,
  inferLegacyPermissions,
  getCommandPermissions,
  walkJsFiles,
  loadCommandModules,
  buildCommandRegistry,
  replaceRegistry,
  formatRegistryIssue
};
