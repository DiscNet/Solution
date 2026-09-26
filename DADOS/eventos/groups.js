const runtimeLogger = require("../MÓDULOS/functions/runtimeLogger");

function registerGroupEvents(conn, processGroupParticipantsUpdate) {
  conn.ev.on("group-participants.update", async update => {
    try {
      await processGroupParticipantsUpdate(update);
    } catch (error) {
      runtimeLogger.error({ scope: "group-participants.update", error, code: "ERR_GROUP_EVENT" });
    }
  });
}

module.exports = { registerGroupEvents };
