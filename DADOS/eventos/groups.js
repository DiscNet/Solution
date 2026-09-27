const runtimeLogger = require("../MÓDULOS/functions/runtimeLogger");
const approval = require("../MÓDULOS/plugins/admin/solicitacoes");

function registerGroupEvents(conn, processGroupParticipantsUpdate) {
  conn.ev.on("group-participants.update", async update => {
    try {
      await processGroupParticipantsUpdate(update);
    } catch (error) {
      runtimeLogger.error({ scope: "group-participants.update", error, code: "ERR_GROUP_EVENT" });
    }
  });
  conn.ev.on("group.join-request", update => {
    approval.onJoinRequest(conn, update).catch(error => {
      runtimeLogger.error({ scope: "group.join-request", error, code: "ERR_GROUP_REQUEST" });
    });
  });
  // A notificação bruta cobre instalações que não emitem group.join-request.
  conn.ws?.on?.("CB:notification", node => {
    approval.onMembershipNotification(conn, node).catch(error => {
      runtimeLogger.error({ scope: "group.membership-notification", error, code: "ERR_GROUP_REQUEST" });
    });
  });
}

module.exports = { registerGroupEvents };
