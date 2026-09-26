// Menu: Dono - Diagnóstico | Comando: integridadebot
const fs = require("fs");
const path = require("path");
const { factory } = require("../../functions/adminHelpers");
const menuCatalog = require("../../functions/menuCatalog");

function mb(bytes) {
  return (Number(bytes || 0) / 1024 / 1024).toFixed(1);
}

module.exports = factory({
  name: "integridadebot",
  aliases: ["botintegridade"],
  menuCategory: "Dono",
  menuSection: "Diagnóstico",
  usage: "integridadebot",
  description: "Uso: .integridadebot",
  permissions: { owner: true },
}, async ({ conn }) => {
  const { records, errors, collisions } = menuCatalog.diagnostics();
  const memory = process.memoryUsage();
  const uptime = Math.floor(process.uptime());
  const nodeMajor = Number(String(process.versions.node || "0").split(".")[0]);
  const authPath = path.join(__dirname, "..", "..", "auth_info", "creds.json");
  const authOk = fs.existsSync(authPath);
  const registryOk = errors.length === 0 && collisions.length === 0;
  const countOk = records.length >= 1000;
  const nodeOk = nodeMajor >= 22;
  const connected = Boolean(conn?.user?.id || conn?.user?.lid);

  const healthy = authOk && registryOk && countOk && nodeOk && connected;
  return [
    `🩺 *INTEGRIDADE DO BOT*`,
    ``,
    `${healthy ? "✅" : "⚠️"} Estado geral: ${healthy ? "saudável" : "requer atenção"}`,
    `${connected ? "✅" : "❌"} WhatsApp: ${connected ? "conectado" : "sem identidade ativa"}`,
    `${authOk ? "✅" : "❌"} Sessão privada: ${authOk ? "disponível" : "ausente"}`,
    `${registryOk ? "✅" : "❌"} Registro: ${records.length} comandos · ${errors.length} erro(s) · ${collisions.length} colisão(ões)`,
    `${countOk ? "✅" : "❌"} Meta de catálogo: ${records.length}/1000+`,
    `${nodeOk ? "✅" : "❌"} Node.js: ${process.versions.node}`,
    `🧠 Memória: ${mb(memory.rss)} MB RSS · ${mb(memory.heapUsed)} MB heap`,
    `⏱️ Uptime: ${uptime}s`,
  ].join("\n");
});
