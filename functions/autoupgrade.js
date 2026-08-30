const fs = require("fs");
const path = require("path");

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

  const commandsPath = path.join(__dirname, "..", "commands");
  const functionsPath = __dirname;

  function debounce(callback) {
    if (reloadTimer) clearTimeout(reloadTimer);
    reloadTimer = setTimeout(callback, 150);
  }

  const commandWatcher = fs.watch(commandsPath, { recursive: true }, (_eventType, filename) => {
    if (!filename || !filename.endsWith(".js")) return;
    debounce(() => {
      try {
        const modulePath = path.join(commandsPath, filename);
        if (!fs.existsSync(modulePath)) return;
        const command = reloadModule(modulePath);
        if (!command?.name) return;
        bot.commands[command.name.toLowerCase()] = command;
        if (Array.isArray(command.aliases)) {
          for (const alias of command.aliases) {
            if (typeof alias === "string") bot.commands[alias.toLowerCase()] = command;
          }
        }
        console.log(`Comando recarregado: ${command.name}`);
      } catch (err) {
        console.error(`Erro ao recarregar comando ${filename}:`, err.message);
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
