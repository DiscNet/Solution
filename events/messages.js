const runtimeLogger = require("../functions/runtimeLogger");

function registerMessagesEvent(conn, processIncomingMessage) {
  conn.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      try {
        await processIncomingMessage(msg);
      } catch (error) {
        runtimeLogger.error({ scope: "messages.upsert", error, code: "ERR_MESSAGE_EVENT" });
      }
    }
  });
}

module.exports = { registerMessagesEvent };
