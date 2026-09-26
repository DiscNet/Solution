const path = require("path");
const { createJsonStore } = require("./jsonStore");

const VALID_TYPES = new Set(["link", "documento", "imagem", "video", "audio"]);
const file = path.join(__dirname, "..", "..", "database", "moderacao.json");
const store = createJsonStore(file, {});

function loadConfig(tipo, force = false) {
  if (!VALID_TYPES.has(tipo)) return {};
  const data = store.read(force);
  return data[tipo] && typeof data[tipo] === "object" ? data[tipo] : {};
}

function saveConfig(tipo, values) {
  if (!VALID_TYPES.has(tipo)) throw new Error("Filtro desconhecido");
  if (!values || typeof values !== "object" || Array.isArray(values)) {
    throw new TypeError("Configuração inválida para filtro");
  }
  const data = store.read(true);
  data[tipo] = { ...values };
  return store.write(data);
}

function isAntiAtivo(groupId, tipo) {
  return loadConfig(tipo)[groupId] === true;
}

module.exports = { isAntiAtivo, loadConfig, saveConfig };
