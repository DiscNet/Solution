const { performance } = require("perf_hooks");
const { checkCommandPermissions } = require("./permissions");
const runtimeLogger = require("./runtimeLogger");
const modLog = require("./modLog");
const ui = require("./ui");

function senderFromMessage(msg) {
  return msg?.key?.participantAlt || msg?.key?.participant || msg?.key?.remoteJidAlt || msg?.key?.remoteJid || "";
}

async function executeCommand({ conn, msg, args = [], from, axiosInstance, requestedName, command }) {
  if (!command || typeof command.execute !== "function") return false;

  const name = String(command.name || requestedName || "unknown").toLowerCase();
  const sender = senderFromMessage(msg);
  const started = performance.now();

  try {
    const permission = await checkCommandPermissions({ conn, msg, command, from });
    if (!permission.ok) {
      runtimeLogger.command({
        name,
        sender,
        durationMs: performance.now() - started,
        status: "denied",
        code: permission.code
      });
      await ui.reply(conn, msg, ui.permissionMessage(permission.code), { from });
      return true;
    }

    await command.execute(conn, msg, args, from, axiosInstance, requestedName || name);

    try {
      modLog.record({ command, name, requestedName: requestedName || name, msg, args, from });
    } catch (error) {
      runtimeLogger.error({
        scope: "modlog",
        name,
        sender,
        error,
        code: "ERR_MODLOG_WRITE"
      });
    }

    runtimeLogger.command({
      name,
      sender,
      durationMs: performance.now() - started,
      status: "ok"
    });
    return true;
  } catch (error) {
    const code = runtimeLogger.error({
      scope: "command",
      name,
      sender,
      error,
      code: error?.code || "ERR_COMMAND_EXECUTION"
    });
    runtimeLogger.command({
      name,
      sender,
      durationMs: performance.now() - started,
      status: "error",
      code
    });

    if (!error?.userMessageSent) {
      await ui.errorReply(
        conn,
        msg,
        `❌ ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇʟ ᴇxᴇᴄᴜᴛᴀʀ ᴏ ᴄᴏᴍᴀɴᴅᴏ.\n\n• ᴄᴏ́ᴅɪɢᴏ: ${code}`,
        { from }
      ).catch(() => {});
    }
    return true;
  }
}

module.exports = {
  executeCommand,
  senderFromMessage
};
