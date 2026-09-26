const path = require("path");
const { createJsonStore } = require("./jsonStore");
const base =
  process.env.BOT_ADMIN_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, "..", "..", "database");
const store = createJsonStore(path.join(base, "manutencao.json"), {
  comandos: [],
});
const legacy = [
  "alugar-bot",
  "alugarbot",
  "alugar",
  "comprar",
  "premium",
  "vip",
];
const alwaysEnabled = new Set(["ban", "kick", "remover"]);
function list() {
  const d = store.read(true);
  return [
    ...new Set([...legacy, ...(Array.isArray(d.comandos) ? d.comandos : [])]),
  ].filter(name => !alwaysEnabled.has(String(name).toLowerCase()));
}
function change(name, enabled) {
  const normalized = String(name || "").toLowerCase();
  const d = store.read(true);
  d.comandos = (d.comandos || []).filter((n) => String(n).toLowerCase() !== normalized);
  if (enabled && !alwaysEnabled.has(normalized)) d.comandos.push(normalized);
  store.write(d);
}
module.exports = { list, change };
