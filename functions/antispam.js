// functions/antispam.js
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config", "antispam.json");
const TEMP_DIR = path.join(__dirname, "..", "temp", "antispam");

// Criar pasta se não existir
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch {}
  return {};
}

function saveConfig(config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  } catch {}
}

function isAntispamAtivo(groupId) {
  const config = loadConfig();
  return config[groupId] === true;
}

function toggleAntispam(groupId, ativar) {
  const config = loadConfig();
  config[groupId] = ativar;
  return saveConfig(config);
}

// Função principal de verificação de spam
function verificarSpam(senderId, groupId, limite = 5, tempoSegundos = 10) {
  const userKey = `${groupId}_${senderId}`;
  const userFile = path.join(TEMP_DIR, `${userKey}.json`);
  
  let userData = { 
    timestamps: [], 
    warnings: 0,
    mutedUntil: 0,
    lastWarningTime: 0
  };
  
  if (fs.existsSync(userFile)) {
    try {
      const data = JSON.parse(fs.readFileSync(userFile, "utf8"));
      userData = { ...userData, ...data };
    } catch (e) {}
  }
  
  const agora = Date.now();
  const limiteTempo = tempoSegundos * 1000;
  
  // Verificar se o usuário está mutado
  if (userData.mutedUntil > agora) {
    return {
      isSpam: true,
      isMuted: true,
      mutedUntil: userData.mutedUntil,
      count: userData.timestamps.length,
      limit: limite,
      warnings: userData.warnings
    };
  }
  
  // Filtrar timestamps dentro do tempo limite
  userData.timestamps = userData.timestamps.filter(t => (agora - t) < limiteTempo);
  
  // Adicionar timestamp atual
  userData.timestamps.push(agora);
  
  const currentCount = userData.timestamps.length;
  const isSpam = currentCount > limite;
  
  let result = {
    isSpam: false,
    isMuted: false,
    count: currentCount,
    limit: limite,
    warnings: userData.warnings,
    shouldWarn: false,
    shouldExpel: false
  };
  
  if (isSpam) {
    // Aumentar aviso
    userData.warnings++;
    userData.lastWarningTime = agora;
    result.warnings = userData.warnings;
    result.isSpam = true;
    
    // Verificar se atingiu 3 avisos para expulsão
    if (userData.warnings >= 3) {
      result.shouldExpel = true;
      // Resetar avisos após expulsão
      userData.warnings = 0;
      userData.timestamps = [];
    } else {
      result.shouldWarn = true;
      
      // Mutar por 10 segundos
      userData.mutedUntil = agora + (10 * 1000);
      result.mutedUntil = userData.mutedUntil;
      result.isMuted = true;
      
      // Limpar timestamps durante o mute
      userData.timestamps = [];
    }
  }
  
  // Salvar dados
  fs.writeFileSync(userFile, JSON.stringify({
    timestamps: userData.timestamps,
    warnings: userData.warnings,
    mutedUntil: userData.mutedUntil,
    lastWarningTime: userData.lastWarningTime
  }, null, 2));
  
  // Limpar arquivo se não tiver dados relevantes
  if (!isSpam && userData.timestamps.length === 0 && userData.warnings === 0 && userData.mutedUntil === 0) {
    try { fs.unlinkSync(userFile); } catch(e) {}
  }
  
  return result;
}

// Limpar dados antigos a cada hora
function limparDadosAntigos() {
  if (!fs.existsSync(TEMP_DIR)) return;
  
  const files = fs.readdirSync(TEMP_DIR);
  const agora = Date.now();
  const umaHora = 60 * 60 * 1000;
  
  for (const file of files) {
    const filePath = path.join(TEMP_DIR, file);
    try {
      const stats = fs.statSync(filePath);
      if (agora - stats.mtimeMs > umaHora) {
        fs.unlinkSync(filePath);
      }
    } catch (e) {}
  }
}

setInterval(limparDadosAntigos, 60 * 60 * 1000);

module.exports = {
  isAntispamAtivo,
  toggleAntispam,
  verificarSpam
};