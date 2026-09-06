const { forwardPrivateMessageToOwner } = require("../functions/privateInbox");
const runtimeLogger = require("../functions/runtimeLogger");

async function handlePrivateInbox(conn, msg) {
  try {
    return await forwardPrivateMessageToOwner(conn, msg);
  } catch (error) {
    runtimeLogger.error({ scope: "private-inbox", error, code: "ERR_PRIVATE_INBOX" });
    return false;
  }
}

module.exports = { handlePrivateInbox };
