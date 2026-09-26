// functions/bemvindo.js
const fs = require("fs");
const path = require("path");

const CONFIG_PATH = path.join(__dirname, "..", "config", "bemvindo.json");

// Mensagens pré-definidas
const MENSAGEM_BOAS_VINDAS_PADRAO = `🎉 *BEM-VINDO(A) AO GRUPO!* 🎉
━━━━━━━━━━━━━━━━━━━━━━

👋 Olá {nome}, seja muito bem-vindo(a) ao *{grupo}*!

📌 *Leia as regras:*
🔹 Respeite todos os membros
🔹 Proibido spam e links
🔹 Divirta-se!

━━━━━━━━━━━━━━━━━━━━━━
📌 *Clique no botão abaixo para ver os comandos*
`;

const MENSAGEM_ADEUS_PADRAO = `👋 *ATÉ MAIS!* 👋
━━━━━━━━━━━━━━━━━━━━━━

{nome}, sentiremos sua falta no *{grupo}*!

🚪 *Portas sempre abertas para você voltar!*

━━━━━━━━━━━━━━━━━━━━━━
`;

function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
    }
  } catch (e) {
    console.error("Erro ao carregar config bemvindo:", e);
  }
  return {};
}

function saveConfig(config) {
  try {
    const dir = path.dirname(CONFIG_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
    return true;
  } catch (e) {
    console.error("Erro ao salvar config bemvindo:", e);
    return false;
  }
}

function isBemvindoAtivo(groupId) {
  const config = loadConfig();
  return config[groupId] && config[groupId].ativo === true;
}

function toggleBemvindo(groupId, ativar) {
  const config = loadConfig();
  if (!config[groupId]) {
    config[groupId] = {};
  }
  config[groupId].ativo = ativar;
  return saveConfig(config);
}

function getMensagemBoasVindas(groupId) {
  const config = loadConfig();
  if (config[groupId] && config[groupId].boasVindas) {
    return config[groupId].boasVindas;
  }
  return MENSAGEM_BOAS_VINDAS_PADRAO;
}

function getMensagemAdeus(groupId) {
  const config = loadConfig();
  if (config[groupId] && config[groupId].adeus) {
    return config[groupId].adeus;
  }
  return MENSAGEM_ADEUS_PADRAO;
}

module.exports = {
  isBemvindoAtivo,
  toggleBemvindo,
  getMensagemBoasVindas,
  getMensagemAdeus,
  MENSAGEM_BOAS_VINDAS_PADRAO,
  MENSAGEM_ADEUS_PADRAO
};