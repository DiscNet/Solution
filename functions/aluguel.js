const path = require("path");
const { createJsonStore } = require("./jsonStore");

const aluguelPath = path.join(__dirname, "..", "database", "aluguel.json");
const store = createJsonStore(aluguelPath, { grupos: {} });

function carregarDb() {
  const db = store.read();
  if (!db.grupos || typeof db.grupos !== "object") db.grupos = {};
  return db;
}

function salvarDb(data) {
  store.write(data);
}

const PLANOS = {
  diario: { dias: 1, valor: 1 },
  semanal: { dias: 7, valor: 5 },
  mensal: { dias: 30, valor: 15 },
  trimensal: { dias: 90, valor: 40 },
  permanente: { dias: Infinity, valor: 0 }
};

function grupoEstaAtivo(grupo) {
  if (!grupo) return false;
  if (grupo.permanente) return true;
  if (!grupo.dataExpiracao) return false;
  return Date.now() < grupo.dataExpiracao;
}

function isGrupoAtivo(grupoId) {
  return grupoEstaAtivo(carregarDb().grupos[grupoId]);
}

function ativarAluguel(grupoId, plano, dataExpiracao) {
  const db = carregarDb();
  const grupo = db.grupos[grupoId] || (db.grupos[grupoId] = {});
  Object.assign(grupo, {
    plano,
    dataExpiracao,
    dataAtivacao: Date.now(),
    permanente: false,
    expiracaoNotificada: false
  });
  salvarDb(db);
}

function ativarPermanente(grupoId) {
  const db = carregarDb();
  const grupo = db.grupos[grupoId] || (db.grupos[grupoId] = {});
  Object.assign(grupo, {
    plano: "permanente",
    dataExpiracao: null,
    dataAtivacao: Date.now(),
    permanente: true,
    expiracaoNotificada: false
  });
  salvarDb(db);
}

function removerGrupo(grupoId) {
  const db = carregarDb();
  if (!db.grupos[grupoId]) return false;
  delete db.grupos[grupoId];
  salvarDb(db);
  return true;
}

function verificarExpiracao(grupoId) {
  const db = carregarDb();
  const grupo = db.grupos[grupoId];
  if (!grupo || grupo.permanente || !grupo.dataExpiracao) return null;

  if (Date.now() >= grupo.dataExpiracao && !grupo.expiracaoNotificada) {
    grupo.expiracaoNotificada = true;
    salvarDb(db);
    return true;
  }
  return null;
}

function marcarNotificada(grupoId) {
  const db = carregarDb();
  if (!db.grupos[grupoId]) return false;
  db.grupos[grupoId].expiracaoNotificada = true;
  salvarDb(db);
  return true;
}

function calcularExpiracao(plano) {
  const planoData = PLANOS[plano];
  if (!planoData || plano === "permanente") return null;
  return Date.now() + (planoData.dias * 24 * 60 * 60 * 1000);
}

function getInfoAluguel(grupoId) {
  const grupo = carregarDb().grupos[grupoId];
  if (!grupo) return null;
  return {
    plano: grupo.plano,
    dataAtivacao: grupo.dataAtivacao,
    dataExpiracao: grupo.dataExpiracao,
    permanente: grupo.permanente || false,
    ativo: grupoEstaAtivo(grupo),
    expiracaoNotificada: grupo.expiracaoNotificada || false
  };
}

function listarGrupos() {
  return carregarDb().grupos;
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
