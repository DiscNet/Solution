const fs = require("fs");
const path = require("path");

// Função para recarregar um módulo (limpa cache)
function reloadModule(modulePath) {
  const resolved = require.resolve(modulePath);
  if (require.cache[resolved]) delete require.cache[resolved];
  return require(modulePath);
}

module.exports = function autoUpgrade(bot) {
  const commandsPath = path.join(__dirname, "..", "commands");
  const functionsPath = path.join(__dirname);

  // Observa mudanças na pasta commands
  fs.watch(commandsPath, { recursive: true }, (eventType, filename) => {
    if (!filename.endsWith(".js")) return;

    try {
      const modulePath = path.join(commandsPath, filename);
      const command = reloadModule(modulePath);

      // Atualiza o objeto de comandos do bot
      bot.commands[command.name.toLowerCase()] = command;
      console.log(`✅ Comando recarregado: ${command.name}`);
    } catch (err) {
      console.error(`❌ Erro ao recarregar comando ${filename}:`, err);
    }
  });

  // Observa mudanças na pasta functions
  fs.watch(functionsPath, { recursive: true }, (eventType, filename) => {
    if (!filename.endsWith(".js") || filename === "autoupgrade.js") return;

    try {
      const modulePath = path.join(functionsPath, filename);
      reloadModule(modulePath);
      console.log(`🔄 Função recarregada: ${filename}`);
    } catch (err) {
      console.error(`❌ Erro ao recarregar função ${filename}:`, err);
    }
  });

  console.log("🟢 AutoUpgrade ativado: alterações em comandos e funções serão aplicadas automaticamente.");
};