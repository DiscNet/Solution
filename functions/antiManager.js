const path = require("path");
const { createJsonStore } = require("./jsonStore");

const ANTI_CONFIGS = {
  link: path.join(__dirname, "..", "config", "antilink.json"),
  documento: path.join(__dirname, "..", "config", "antidoc.json"),
  imagem: path.join(__dirname, "..", "config", "antiimagem.json"),
  video: path.join(__dirname, "..", "config", "antivideo.json"),
  audio: path.join(__dirname, "..", "config", "antiaudio.json")
};

const stores = Object.fromEntries(
  Object.entries(ANTI_CONFIGS).map(([tipo, file]) => [tipo, createJsonStore(file, {})])
);

function loadConfig(tipo, force = false) {
  const store = stores[tipo];
  return store ? store.read(force) : {};
}

function isAntiAtivo(groupId, tipo) {
  return loadConfig(tipo)[groupId] === true;
}

module.exports = { isAntiAtivo, loadConfig };
