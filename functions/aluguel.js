// functions/aluguel.js
const fs = require("fs");
const path = require("path");

const aluguelPath = path.join(__dirname, "..", "database", "aluguel.json");

// Garante que o arquivo existe
function garantirDb() {
  const dbDir = path.join(__dirname, "..", "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(aluguelPath)) {
    fs.writeFileSync(aluguelPath, JSON.stringify({ grupos: {} }, null, 2));
  }
}

// Carrega o banco de dados
function carregarDb() {
  garantirDb();
  const data = fs.readFileSync(aluguelPath, "utf8");
  return JSON.parse(data);
}

// Salva o banco de dados
function salvarDb(data) {
  garantirDb();
  fs.writeFileSync(aluguelPath, JSON.stringify(data, null, 2));
}

// Planos disponíveis
const PLANOS = {
  diario: { dias: 1, valor: 1 },
  semanal: { dias: 7, valor: 5 },
  mensal: { dias: 30, valor: 15 },
  trimensal: { dias: 90, valor: 40 },
  permanente: { dias: Infinity, valor: 0 }
};

// Verifica se um grupo está ativo
function isGrupoAtivo(grupoId) {
  const db = carregarDb();
  const grupo = db.grupos[grupoId];
  
  if (!grupo) return false;
  if (grupo.permanente) return true;
  if (!grupo.dataExpiracao) return false;
  
  const agora = Date.now();
  return agora < grupo.dataExpiracao;
}

// Ativa aluguel para um grupo
function ativarAluguel(grupoId, plano, dataExpiracao) {
  const db = carregarDb();
  
  if (!db.grupos[grupoId]) {
    db.grupos[grupoId] = {};
  }
  
  db.grupos[grupoId].plano = plano;
  db.grupos[grupoId].dataExpiracao = dataExpiracao;
  db.grupos[grupoId].dataAtivacao = Date.now();
  db.grupos[grupoId].permanente = false;
  db.grupos[grupoId].expiracaoNotificada = false;
  
  salvarDb(db);
}

// Ativa permanente para um grupo
function ativarPermanente(grupoId) {
  const db = carregarDb();
  
  if (!db.grupos[grupoId]) {
    db.grupos[grupoId] = {};
  }
  
  db.grupos[grupoId].plano = "permanente";
  db.grupos[grupoId].dataExpiracao = null;
  db.grupos[grupoId].dataAtivacao = Date.now();
  db.grupos[grupoId].permanente = true;
  db.grupos[grupoId].expiracaoNotificada = false;
  
  salvarDb(db);
}

// Remove grupo da lista
function removerGrupo(grupoId) {
  const db = carregarDb();
  delete db.grupos[grupoId];
  salvarDb(db);
}

// Verifica se expirou e notifica uma vez
function verificarExpiracao(grupoId) {
  const db = carregarDb();
  const grupo = db.grupos[grupoId];
  
  if (!grupo) return null;
  if (grupo.permanente) return null;
  if (!grupo.dataExpiracao) return null;
  
  const agora = Date.now();
  if (agora >= grupo.dataExpiracao && !grupo.expiracaoNotificada) {
    // Marca como notificada
    grupo.expiracaoNotificada = true;
    salvarDb(db);
    return true; // Expirou e não foi notificado ainda
  }
  
  return null;
}

// Marca como notificada manualmente
function marcarNotificada(grupoId) {
  const db = carregarDb();
  if (db.grupos[grupoId]) {
    db.grupos[grupoId].expiracaoNotificada = true;
    salvarDb(db);
  }
}

// Calcula data de expiração
function calcularExpiracao(plano) {
  const planoData = PLANOS[plano];
  if (!planoData) return null;
  if (plano === "permanente") return null;
  
  const agora = Date.now();
  const dias = planoData.dias;
  return agora + (dias * 24 * 60 * 60 * 1000);
}

// Retorna informações do aluguel
function getInfoAluguel(grupoId) {
  const db = carregarDb();
  const grupo = db.grupos[grupoId];
  
  if (!grupo) return null;
  
  return {
    plano: grupo.plano,
    dataAtivacao: grupo.dataAtivacao,
    dataExpiracao: grupo.dataExpiracao,
    permanente: grupo.permanente || false,
    ativo: isGrupoAtivo(grupoId),
    expiracaoNotificada: grupo.expiracaoNotificada || false
  };
}

// Lista todos os grupos com aluguel
function listarGrupos() {
  const db = carregarDb();
  return db.grupos;
}

module.exports = {
  PLANOS,
  isGrupoAtivo,
  ativarAluguel,
  ativarPermanente,
  removerGrupo,
  verificarExpiracao,
  marcarNotificada,
  calcularExpiracao,
  getInfoAluguel,
  listarGrupos
};