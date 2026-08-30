// functions/antiManager.js
const fs = require("fs");
const path = require("path");

const ANTI_CONFIGS = {
  link: path.join(__dirname, "..", "config", "antilink.json"),
  documento: path.join(__dirname, "..", "config", "antidoc.json"),
  imagem: path.join(__dirname, "..", "config", "antiimagem.json"),
  video: path.join(__dirname, "..", "config", "antivideo.json"),
  audio: path.join(__dirname, "..", "config", "antiaudio.json")
};

function loadConfig(tipo) {
  try {
    const file = ANTI_CONFIGS[tipo];
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, "utf8"));
    }
  } catch (e) {}
  return {};
}

function isAntiAtivo(groupId, tipo) {
  const data = loadConfig(tipo);
  return data[groupId] === true;
}

module.exports = { isAntiAtivo, loadConfig };