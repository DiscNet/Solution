const runtimeLogger = require("../functions/runtimeLogger");
const contactNameCache = require("../functions/contactNameCache");

function registerMessagesEvent(conn, processIncomingMessage) {
  conn.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      try {
        contactNameCache.rememberMessage(msg);
        await processIncomingMessage(msg);
      } catch (error) {
        runtimeLogger.error({ scope: "messages.upsert", error, code: "ERR_MESSAGE_EVENT" });
      }
    }
  });

  conn.ev.on("contacts.upsert", contacts => {
    try {
      contactNameCache.rememberContacts(contacts);
    } catch (error) {
      runtimeLogger.error({ scope: "contacts.upsert", error, code: "ERR_CONTACT_CACHE" });
    }
  });

  conn.ev.on("contacts.update", contacts => {
    try {
      contactNameCache.rememberContacts(contacts);
    } catch (error) {
      runtimeLogger.error({ scope: "contacts.update", error, code: "ERR_CONTACT_CACHE" });
    }
  });
}

module.exports = { registerMessagesEvent };
