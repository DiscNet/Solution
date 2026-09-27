const aluguel = require("./aluguel");
const ui = require("./ui");
const runtimeLogger = require("./runtimeLogger");

function noticeText() {
  const when = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza", dateStyle: "short", timeStyle: "short",
  }).format(new Date());
  return ui.adminCard("Bot reiniciado", [
    ui.adminRow("✅", "Estado", ui.smallcaps("online novamente")),
    ui.adminRow("🛡️", "Atendimento", ui.smallcaps("disponível neste grupo")),
    ui.adminRow("🕒", "Horário", when),
  ]);
}

function createRestartAnnouncer(getConnection) {
  const notified = new Set();
  let finished = false;
  let running = false;
  let retryTimer = null;
  let retries = 0;

  async function announce() {
    if (finished || running) return;
    const conn = getConnection();
    if (!conn?.user?.id || typeof conn.groupFetchAllParticipating !== "function") return;
    running = true;
    try {
      const groups = Object.values(await conn.groupFetchAllParticipating() || {});
      const activeIds = [...new Set(groups.map(group => group?.id).filter(id =>
        typeof id === "string" && id.endsWith("@g.us") && aluguel.isGrupoAtivo(id)))];
      const message = noticeText();

      for (let i = 0; i < activeIds.length; i += 3) {
        await Promise.all(activeIds.slice(i, i + 3).map(async id => {
          if (notified.has(id) || !aluguel.isGrupoAtivo(id)) return;
          try {
            await conn.sendMessage(id, { text: message });
            notified.add(id);
          } catch (error) {
            runtimeLogger.error({ scope: "restart-group-notification", error, code: "ERR_RESTART_GROUP_NOTIFY" });
          }
        }));
      }
      console.log(`[RESTART NOTICE] ${activeIds.filter(id => notified.has(id)).length}/${activeIds.length} grupos ativos avisados.`);
      finished = activeIds.every(id => notified.has(id) || !aluguel.isGrupoAtivo(id));
    } catch (error) {
      runtimeLogger.error({ scope: "restart-group-list", error, code: "ERR_RESTART_GROUP_LIST" });
    } finally {
      running = false;
      if (!finished && retries < 3 && !retryTimer) {
        retries++;
        retryTimer = setTimeout(() => {
          retryTimer = null;
          void announce();
        }, 30000);
        retryTimer.unref?.();
      }
    }
  }

  return announce;
}

module.exports = { createRestartAnnouncer, noticeText };
