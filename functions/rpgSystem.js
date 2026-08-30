// functions/rpgSystem.js
const fs = require("fs");
const path = require("path");

const systemPath = path.join(__dirname, "..", "database", "rpgSystem.json");

// Garante que o diretório existe
function garantirDb() {
  const dbDir = path.join(__dirname, "..", "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  if (!fs.existsSync(systemPath)) {
    fs.writeFileSync(systemPath, JSON.stringify({ grupos: {} }, null, 2));
  }
}

// Carrega o banco de dados
function carregarDb() {
  garantirDb();
  const data = fs.readFileSync(systemPath, "utf8");
  return JSON.parse(data);
}

// Salva o banco de dados
function salvarDb(data) {
  garantirDb();
  fs.writeFileSync(systemPath, JSON.stringify(data, null, 2));
}

// Verifica se o RPG está ativo no grupo
function isRpgAtivo(grupoId) {
  const db = carregarDb();
  return db.grupos[grupoId] === true;
}

// Ativa o RPG no grupo
function ativarRpg(grupoId) {
  const db = carregarDb();
  db.grupos[grupoId] = true;
  salvarDb(db);
}

// Desativa o RPG no grupo
function desativarRpg(grupoId) {
  const db = carregarDb();
  db.grupos[grupoId] = false;
  salvarDb(db);
}

// Alterna o estado do RPG
function toggleRpg(grupoId) {
  const db = carregarDb();
  const atual = db.grupos[grupoId] || false;
  db.grupos[grupoId] = !atual;
  salvarDb(db);
  return db.grupos[grupoId];
}

module.exports = {
  isRpgAtivo,
  ativarRpg,
  desativarRpg,
  toggleRpg
};