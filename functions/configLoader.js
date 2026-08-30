// functions/configLoader.js
const fs = require("fs");
const path = require("path");

let configCache = null;
let lastModified = null;
const configPath = path.join(__dirname, "..", "config", "config.js");

function carregarConfig() {
  try {
    // Verifica se o arquivo foi modificado
    const stats = fs.statSync(configPath);
    const modifiedTime = stats.mtimeMs;
    
    // Se não mudou e tem cache, retorna o cache
    if (configCache && lastModified === modifiedTime) {
      return configCache;
    }
    
    // Limpa o cache do require
    delete require.cache[require.resolve(configPath)];
    
    // Carrega o novo config
    const novoConfig = require(configPath);
    
    // Atualiza o cache
    configCache = novoConfig;
    lastModified = modifiedTime;
    
    console.log(`✅ Config recarregado! (${new Date().toLocaleTimeString()})`);
    return novoConfig;
  } catch (err) {
    console.error("❌ Erro ao recarregar config:", err);
    return configCache || require(configPath);
  }
}

// Força o recarregamento do config
function recarregarConfig() {
  configCache = null;
  lastModified = null;
  return carregarConfig();
}

module.exports = {
  carregarConfig,
  recarregarConfig,
  getConfig: carregarConfig
};