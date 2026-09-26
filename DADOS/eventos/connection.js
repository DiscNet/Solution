const runtimeLogger = require("../MÓDULOS/functions/runtimeLogger");

function getDisconnectCode(error) {
  return error?.output?.statusCode || error?.data?.statusCode || error?.statusCode || null;
}

function registerConnectionEvents(conn, { saveCreds, DisconnectReason, reconnect, onOpen }) {
  conn.ev.on("creds.update", saveCreds);

  conn.ev.on("connection.update", ({ connection, lastDisconnect }) => {
    if (connection === "open") {
      reconnect.reset();
      runtimeLogger.connection("conectado");
      if (typeof onOpen === "function") onOpen();
      return;
    }

    if (connection === "close") {
      const code = getDisconnectCode(lastDisconnect?.error);
      if (code === DisconnectReason.loggedOut) {
        runtimeLogger.error({ scope: "connection", error: lastDisconnect?.error, code: "ERR_SESSION_LOGGED_OUT" });
        process.exitCode = 1;
        return;
      }
      reconnect.schedule(`conexão fechada (código ${code || "desconhecido"})`);
    }
  });
}

module.exports = { getDisconnectCode, registerConnectionEvents };
