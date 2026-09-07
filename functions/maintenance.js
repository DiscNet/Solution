const path = require("path");
const { createJsonStore } = require("./jsonStore");
const base =
  process.env.BOT_ADMIN_DATA_DIR ||
  process.env.RAILWAY_VOLUME_MOUNT_PATH ||
  path.join(__dirname, "..", "config");
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
function list() {
  const d = store.read(true);
  return [
    ...new Set([...legacy, ...(Array.isArray(d.comandos) ? d.comandos : [])]),
  ];
}
function change(name, enabled) {
  const d = store.read(true);
  d.comandos = (d.comandos || []).filter((n) => n !== name);
  if (enabled) d.comandos.push(name);
  store.write(d);
}
module.exports = { list, change };
