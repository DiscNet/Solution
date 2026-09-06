const runtimeLogger = require("../functions/runtimeLogger");

function createReconnectController({ start, maxDelayMs = 30000 }) {
  let timer = null;
  let attempts = 0;

  function cancel() {
    if (timer) clearTimeout(timer);
    timer = null;
  }

  function reset() {
    attempts = 0;
    cancel();
  }

  function schedule(reason = "conexão encerrada") {
    if (timer) return false;
    const delay = Math.min(maxDelayMs, 5000 * (2 ** Math.min(attempts, 3)));
    attempts += 1;
    runtimeLogger.warn(`reconectando em ${Math.round(delay / 1000)}s: ${reason}`);

    timer = setTimeout(async () => {
      timer = null;
      try {
        await start();
      } catch (error) {
        runtimeLogger.error({ scope: "reconnect", error, code: "ERR_RECONNECT_START" });
        schedule("falha ao iniciar nova conexão");
      }
    }, delay);

    if (typeof timer.unref === "function") timer.unref();
    return true;
  }

  return {
    schedule,
    reset,
    cancel,
    get attempts() { return attempts; },
    get scheduled() { return Boolean(timer); }
  };
}

module.exports = { createReconnectController };
