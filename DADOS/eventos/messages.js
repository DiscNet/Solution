const runtimeLogger = require("../MÓDULOS/functions/runtimeLogger");
const contactNameCache = require("../MÓDULOS/functions/contactNameCache");
const { runWithMessage, startCommandTyping } = require("../MÓDULOS/functions/messageDefaults");
const { extractMessageText } = require("../MÓDULOS/functions/messageText");

function isCommandMessage(msg) {
  if (!msg?.message || msg.key?.fromMe) return false;
  const prefix = require("../config/config").prefix || ".";
  const text = extractMessageText(msg).trim();
  return text.startsWith(prefix) && text.length > prefix.length;
}

function registerMessagesEvent(conn, processIncomingMessage) {
  conn.ev.on("messages.upsert", async ({ messages }) => {
    for (const msg of messages || []) {
      try {
        await runWithMessage(msg, async () => {
          const stopTyping = isCommandMessage(msg)
            ? await startCommandTyping(conn, msg.key.remoteJid)
            : null;
          try {
            contactNameCache.rememberMessage(msg);
            return await processIncomingMessage(msg);
          } finally {
            await stopTyping?.();
          }
        });
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

  conn.ev.on("messaging-history.set", ({ contacts }) => {
    try {
      contactNameCache.rememberContacts(contacts);
    } catch (error) {
      runtimeLogger.error({ scope: "messaging-history.set", error, code: "ERR_CONTACT_CACHE" });
    }
  });
}

module.exports = { registerMessagesEvent, isCommandMessage };
