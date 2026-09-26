const fs = require("fs");
const path = require("path");
const {
  loadCommandModules,
  buildCommandRegistry,
  replaceRegistry,
  formatRegistryIssue
} = require("./commandRegistry");

let activeWatchers = [];
let reloadTimer = null;

function reloadModule(modulePath) {
  const resolved = require.resolve(modulePath);
  if (require.cache[resolved]) delete require.cache[resolved];
  return require(modulePath);
}

function closeWatchers() {
  for (const watcher of activeWatchers) {
    try { watcher.close(); } catch (_) {}
  }
  activeWatchers = [];
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = null;
}

module.exports = function autoUpgrade(bot) {
  closeWatchers();

  const commandsPath = path.join(__dirname, "..", "plugins");
  const functionsPath = __dirname;

  function debounce(callback) {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(callback, 150);
  }

  function rebuildCommands(changedFile) {
    const { records, errors } = loadCommandModules(commandsPath, { clearCache: true });
    const { registry, collisions } = buildCommandRegistry(records);
    replaceRegistry(bot.commands, registry);

    for (const item of errors) {
      console.error(`Erro ao carregar ${path.relative(process.cwd(), item.file)}:`, item.error.message);
    }
    for (const collision of collisions) {
      console.warn(`Alias/comando em conflito: ${formatRegistryIssue(collision)}`);
    }

    console.log(`Comandos recarregados (${records.length}) após alteração em ${changedFile}.`);
  }

  const commandWatcher = fs.watch(commandsPath, { recursive: true }, (_eventType, filename) => {
    if (!filename || !filename.endsWith(".js")) return;
    debounce(() => {
      try {
        rebuildCommands(filename);
      } catch (err) {
        console.error(`Erro ao recarregar comandos após ${filename}:`, err.message);
      }
    });
  });

  const functionWatcher = fs.watch(functionsPath, { recursive: true }, (_eventType, filename) => {
    if (!filename || !filename.endsWith(".js") || filename === "autoupgrade.js") return;
    debounce(() => {
      try {
        const modulePath = path.join(functionsPath, filename);
        if (!fs.existsSync(modulePath)) return;
        reloadModule(modulePath);
        console.log(`Função recarregada: ${filename}`);
      } catch (err) {
        console.error(`Erro ao recarregar função ${filename}:`, err.message);
      }
    });
  });

  activeWatchers = [commandWatcher, functionWatcher];
  console.log("Hot reload ativado.");
  return closeWatchers;
};

module.exports.close = closeWatchers;
