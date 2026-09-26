const { forwardPrivateMessageToOwner } = require("../MÓDULOS/functions/privateInbox");
const runtimeLogger = require("../MÓDULOS/functions/runtimeLogger");

async function handlePrivateInbox(conn, msg) {
  try {
    return await forwardPrivateMessageToOwner(conn, msg);
  } catch (error) {
    runtimeLogger.error({ scope: "private-inbox", error, code: "ERR_PRIVATE_INBOX" });
    return false;
  }
}

module.exports = { handlePrivateInbox };
