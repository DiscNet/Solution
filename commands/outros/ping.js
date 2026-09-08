// Menu: Utilidades - Estatísticas | Comando: ping
const os = require("os");
const { performance } = require("perf_hooks");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");

const NEWSLETTER = {
  newsletterJid: "120363426698503859@newsletter",
  newsletterName: "LukaModzz",
  serverMessageId: 116,
};

function elapsedMs(startNs) {
  return Number(process.hrtime.bigint() - startNs) / 1e6;
}

function formatMs(value) {
  const ms = Number(value) || 0;
  if (ms < 1) return `${ms.toFixed(2)} ms`;
  if (ms < 100) return `${ms.toFixed(1)} ms`;
  return `${Math.round(ms)} ms`;
}

function formatBytes(bytes) {
  let value = Math.max(0, Number(bytes) || 0);
  const units = ["B", "KB", "MB", "GB", "TB"];
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const decimals = unit >= 3 ? 2 : unit >= 2 ? 1 : 0;
  return `${value.toFixed(decimals)} ${units[unit]}`;
}

function formatDuration(totalSeconds) {
  let seconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(seconds / 86400);
  seconds %= 86400;
  const hours = Math.floor(seconds / 3600);
  seconds %= 3600;
  const minutes = Math.floor(seconds / 60);
  seconds %= 60;

  const parts = [];
  if (days) parts.push(`${days}d`);
  if (hours || days) parts.push(`${hours}h`);
  if (minutes || hours || days) parts.push(`${minutes}m`);
  parts.push(`${seconds}s`);
  return parts.join(" ");
}

function latencyStatus(ms) {
  if (ms < 120) return "🟢 Excelente";
  if (ms < 250) return "🟢 Ótimo";
  if (ms < 500) return "🟡 Normal";
  if (ms < 1000) return "🟠 Alto";
  return "🔴 Lento";
}

function getCommandCount() {
  try {
    const catalog = require("../../functions/menuCatalog");
    const diagnostics = catalog.diagnostics();
    return Array.isArray(diagnostics?.records) ? diagnostics.records.length : null;
  } catch (_) {
    return null;
  }
}

function getRuntimeMetrics() {
  const memory = process.memoryUsage();
  const totalRam = os.totalmem();
  const freeRam = os.freemem();
  const usedRam = Math.max(0, totalRam - freeRam);
  const ramPercent = totalRam > 0 ? (usedRam / totalRam) * 100 : 0;
  const cpus = os.cpus() || [];
  const cpuUsage = process.cpuUsage();
  const cpuTime = (cpuUsage.user + cpuUsage.system) / 1e6;

  let eventLoop = null;
  try {
    const elu = performance.eventLoopUtilization();
    eventLoop = Number.isFinite(elu?.utilization) ? elu.utilization * 100 : null;
  } catch (_) {}

  return {
    rss: memory.rss,
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    external: memory.external,
    usedRam,
    totalRam,
    ramPercent,
    cpuModel: cpus[0]?.model?.trim() || "Desconhecido",
    cpuCores: cpus.length || 1,
    load1m: Number(os.loadavg?.()[0]) || 0,
    cpuTime,
    eventLoop,
    processUptime: process.uptime(),
    systemUptime: os.uptime(),
    platform: `${os.platform()} ${os.arch()}`,
    node: process.version,
    pid: process.pid,
  };
}

function contextInfo() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: NEWSLETTER,
  };
}

async function removeMessage(conn, from, key) {
  if (!key?.id) return;
  try {
    await conn.sendMessage(from, { delete: key });
  } catch (_) {}
}

async function publishReport(conn, from, probe, text, quoted) {
  if (probe?.key) {
    try {
      return await conn.sendMessage(from, {
        text,
        edit: probe.key,
        contextInfo: contextInfo(),
      });
    } catch (_) {
      const sent = await conn.sendMessage(from, {
        text,
        contextInfo: contextInfo(),
      }, { quoted });
      await removeMessage(conn, from, probe.key);
      return sent;
    }
  }

  return conn.sendMessage(from, {
    text,
    contextInfo: contextInfo(),
  }, { quoted });
}

module.exports = {
  name: "ping",
  description: "mostra latência real do WhatsApp e métricas do bot",
  menuCategory: "Utilidades",
  menuSection: "Estatísticas",
  usage: "ping",

  async execute(conn, msg, args, from) {
    const commandStart = process.hrtime.bigint();
    const quoted = createStatusQuoted(msg);

    try {
      // Esta é a medição principal: tempo real que o sendMessage() do Baileys
      // leva para concluir o envio da mensagem pelo canal atual do WhatsApp.
      const sendStart = process.hrtime.bigint();
      const probe = await conn.sendMessage(from, {
        text: "🏓 *Medindo latência real...*",
      }, { quoted });
      const whatsappLatency = elapsedMs(sendStart);

      const metrics = getRuntimeMetrics();
      const processingMs = elapsedMs(commandStart);
      const commandCount = getCommandCount();
      const prefix = config.prefix || ".";
      const botName = config.botName || "GrimmJow-WA";
      const owner = config.ownerName || "LukaModzz";
      const requester = msg?.pushName || "Usuário";
      const now = new Date();

      const heapPercent = metrics.heapTotal > 0
        ? (metrics.heapUsed / metrics.heapTotal) * 100
        : 0;

      const eventLoopText = metrics.eventLoop == null
        ? "indisponível"
        : `${metrics.eventLoop.toFixed(1)}%`;

      const report = [
        "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮",
        `├̬⌑ؔ͟ ⎾🏓⏌ 𝙻𝚊𝚝ê𝚗𝚌𝚒𝚊 𝚆𝙰: *${formatMs(whatsappLatency)}*`,
        `├̬⌑ؔ͟ ⎾📶⏌ 𝚂𝚝𝚊𝚝𝚞𝚜: *${latencyStatus(whatsappLatency)}*`,
        `├̬⌑ؔ͟ ⎾⚡⏌ 𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚊𝚖𝚎𝚗𝚝𝚘: *${formatMs(processingMs)}*`,
        "├̬⌑ؔ͟ ⎾🖥️⏌ ── 𝚂𝙸𝚂𝚃𝙴𝙼𝙰 ──",
        `├̬⌑ؔ͟ ⎾⏱️⏌ 𝚄𝚙𝚝𝚒𝚖𝚎 𝚋𝚘𝚝: *${formatDuration(metrics.processUptime)}*`,
        `├̬⌑ؔ͟ ⎾🧠⏌ 𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚘 𝚁𝚂𝚂: *${formatBytes(metrics.rss)}*`,
        `├̬⌑ؔ͟ ⎾📦⏌ 𝙷𝚎𝚊𝚙: *${formatBytes(metrics.heapUsed)} / ${formatBytes(metrics.heapTotal)} (${heapPercent.toFixed(1)}%)*`,
        `├̬⌑ؔ͟ ⎾💾⏌ 𝚁𝙰𝙼 𝚊𝚖𝚋𝚒𝚎𝚗𝚝𝚎: *${formatBytes(metrics.usedRam)} / ${formatBytes(metrics.totalRam)} (${metrics.ramPercent.toFixed(1)}%)*`,
        `├̬⌑ؔ͟ ⎾⚙️⏌ 𝙲𝙿𝚄: *${metrics.cpuCores} cores • load ${metrics.load1m.toFixed(2)}*`,
        `├̬⌑ؔ͟ ⎾🔁⏌ 𝙴𝚟𝚎𝚗𝚝 𝚕𝚘𝚘𝚙: *${eventLoopText}*`,
        `├̬⌑ؔ͟ ⎾🧮⏌ 𝚃𝚎𝚖𝚙𝚘 𝙲𝙿𝚄: *${metrics.cpuTime.toFixed(2)}s*`,
        `├̬⌑ؔ͟ ⎾🐧⏌ 𝙿𝚕𝚊𝚝𝚊𝚏𝚘𝚛𝚖𝚊: *${metrics.platform}*`,
        `├̬⌑ؔ͟ ⎾🟩⏌ 𝙽𝚘𝚍𝚎: *${metrics.node}*`,
        `├̬⌑ؔ͟ ⎾🆔⏌ 𝙿𝙸𝙳: *${metrics.pid}*`,
        "├̬⌑ؔ͟ ⎾🤖⏌ ── 𝙱𝙾𝚃 ──",
        `├̬⌑ؔ͟ ⎾🪐⏌ 𝙱𝚘𝚝: *${botName}*`,
        `├̬⌑ؔ͟ ⎾👤⏌ 𝙳𝚎𝚟: *${owner}*`,
        `├̬⌑ؔ͟ ⎾⌨️⏌ 𝙿𝚛𝚎𝚏𝚒𝚡𝚘: *${prefix}*`,
        ...(commandCount == null ? [] : [`├̬⌑ؔ͟ ⎾📚⏌ 𝙲𝚘𝚖𝚊𝚗𝚍𝚘𝚜: *${commandCount}*`]),
        `├̬⌑ؔ͟ ⎾🙋⏌ 𝚂𝚘𝚕𝚒𝚌𝚒𝚝𝚊𝚍𝚘: *${requester}*`,
        `├̬⌑ؔ͟ ⎾🕒⏌ 𝙷𝚘𝚛𝚊: *${now.toLocaleTimeString("pt-BR")}*`,
        `├̬⌑ؔ͟ ⎾📅⏌ 𝙳𝚊𝚝𝚊: *${now.toLocaleDateString("pt-BR")}*`,
        "╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯",
        "",
        "> 🏓 *Latência WA = tempo real do envio pelo Baileys/WhatsApp.*",
      ].join("\n");

      await publishReport(conn, from, probe, report, quoted);

      try {
        await conn.sendMessage(from, { react: { text: "🏓", key: msg.key } });
      } catch (_) {}
    } catch (error) {
      console.error("[PING] Erro:", error);
      await conn.sendMessage(from, {
        text: `❌ *Erro ao medir o ping real.*\n${String(error?.message || "Falha desconhecida").slice(0, 180)}`,
        contextInfo: contextInfo(),
      }, { quoted });
    }
  },
};

module.exports._internals = {
  elapsedMs,
  formatMs,
  formatBytes,
  formatDuration,
  latencyStatus,
  getRuntimeMetrics,
};
