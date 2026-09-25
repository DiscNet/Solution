// Menu: Utilidades - Estatísticas | Comando: ping
const os = require("os");
const { performance } = require("perf_hooks");
const config = require("../../config/config");
const { createStatusQuoted } = require("../../functions/statusCard");
const tokitoApi = require("../../functions/tokitoApi");
const { getProfilePicture, senderCandidates } = require("../../functions/profilePicture");

const NEWSLETTER = {
  newsletterJid: "120363426698503859@newsletter",
  newsletterName: config.botName || "GrimmJow-WA",
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
  if (ms < 10) return "🟢 Excelente";
  if (ms < 30) return "🟢 Ótimo";
  if (ms < 80) return "🟡 Normal";
  if (ms < 200) return "🟠 Alto";
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

function buildReport({
  processingMs,
  metrics,
  commandCount,
  prefix,
  botName,
  owner,
  requester,
  now,
}) {
  const heapPercent = metrics.heapTotal > 0
    ? (metrics.heapUsed / metrics.heapTotal) * 100
    : 0;

  const eventLoopText = metrics.eventLoop == null
    ? "indisponível"
    : `${metrics.eventLoop.toFixed(1)}%`;

  return [
    "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮",
    `├̬⌑ؔ͟ ⎾🏓⏌ 𝙿𝚒𝚗𝚐 / 𝙿𝚛𝚘𝚌𝚎𝚜𝚜𝚊𝚖𝚎𝚗𝚝𝚘: *${formatMs(processingMs)}*`,
    `├̬⌑ؔ͟ ⎾📶⏌ 𝚂𝚝𝚊𝚝𝚞𝚜: *${latencyStatus(processingMs)}*`,
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
    "> 🏓 *Ping = tempo real de processamento interno do bot.*",
  ].join("\n");
}

module.exports = {
  name: "ping",
  description: "mostra processamento real do bot e métricas do sistema",
  menuCategory: "Utilidades",
  menuSection: "Estatísticas",
  usage: "ping",

  async execute(conn, msg, args, from) {
    const commandStart = process.hrtime.bigint();
    const quoted = createStatusQuoted(msg);

    try {
      const metrics = getRuntimeMetrics();
      const commandCount = getCommandCount();
      const prefix = config.prefix || ".";
      const botName = config.botName || "GrimmJow-WA";
      const owner = config.ownerName || "LukaModzz";
      const requester = msg?.pushName || "Usuário";
      const now = new Date();
      const processingMs = elapsedMs(commandStart);

      const report = buildReport({
        processingMs,
        metrics,
        commandCount,
        prefix,
        botName,
        owner,
        requester,
        now,
      });

      const fallbackBackground = "https://raw.githubusercontent.com/dylanModz/uploadsgg/main/midias/imagens/922e987a70d.jpg";
      const requesterPicture = await getProfilePicture(
        conn,
        senderCandidates(msg, from),
        { fallback: fallbackBackground }
      ).catch(() => ({ url: fallbackBackground }));
      const avatar = requesterPicture?.url || fallbackBackground;
      const background = requesterPicture?.url || fallbackBackground;
      const cpuPercent = Math.min(
        100,
        (metrics.load1m / Math.max(metrics.cpuCores, 1)) * 100
      ).toFixed(1);

      let cardBuffer = null;
      try {
        const card = await tokitoApi.buffer("/canvas/ping2", {
          ping: (processingMs / 1000).toFixed(3) + " s",
          latency: formatMs(processingMs),
          uptime: formatDuration(metrics.processUptime),
          memory: formatBytes(metrics.usedRam) + " / " + formatBytes(metrics.totalRam),
          cpu: cpuPercent + "%",
          platform: metrics.platform,
          node: metrics.node,
          commands: commandCount == null ? "" : commandCount,
          avatar,
          fundo: background,
          color: "#1e90ff",
        }, {
          timeout: 20000,
          headers: { accept: "image/*,*/*" },
        });

        if (card.buffer?.length && /image/i.test(card.contentType)) {
          cardBuffer = card.buffer;
        }
      } catch (apiError) {
        const info = tokitoApi.errorInfo(apiError);
        console.warn("[PING TOKITO]", info.status || "-", info.message);
      }

      // Exatamente UM envio: usa o canvas quando disponível e texto como fallback.
      await conn.sendMessage(from, cardBuffer ? {
        image: cardBuffer,
        caption: report,
        contextInfo: contextInfo(),
      } : {
        text: report,
        contextInfo: contextInfo(),
      }, { quoted });
    } catch (error) {
      console.error("[PING] Erro:", error);
      // Só tenta informar erro se o envio principal falhar antes de entregar
      // qualquer relatório ao usuário.
      try {
        await conn.sendMessage(from, {
          text: `❌ *Erro ao medir o ping.*\n${String(error?.message || "Falha desconhecida").slice(0, 180)}`,
          contextInfo: contextInfo(),
        }, { quoted });
      } catch (_) {}
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
  buildReport,
};
