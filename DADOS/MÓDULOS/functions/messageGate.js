// Keep one cutoff for this runtime, including automatic reconnections.
const PROCESS_STARTED_AT_MS = Date.now() - process.uptime() * 1000;

function timestampSeconds(value) {
  try {
    if (value && typeof value === 'object') {
      if (typeof value.toNumber === 'function') value = value.toNumber();
      else if ([value.low, value.high].every(part => Number.isInteger(part) && part >= -0x80000000 && part <= 0xffffffff)) {
        value = (value.high >>> 0) * 0x100000000 + (value.low >>> 0);
      } else return null;
    }
    if (typeof value === 'bigint') value = Number(value);
    else if (typeof value === 'string' && /^\d+$/.test(value)) value = Number(value);
    return typeof value === 'number' && Number.isSafeInteger(value) && value > 0 ? value : null;
  } catch (_) { return null; }
}

function createMessageGate({ startedAtMs = PROCESS_STARTED_AT_MS } = {}) {
  if (!Number.isFinite(startedAtMs) || startedAtMs <= 0) throw new TypeError('Horário de início inválido.');
  // WhatsApp timestamps have second precision. Exclude the partially elapsed start second.
  const cutoff = Math.ceil(startedAtMs / 1000);
  return (msg, type) => {
    if (type !== 'notify' || !msg?.message || msg.key?.fromMe) return false;
    const timestamp = timestampSeconds(msg.messageTimestamp);
    return timestamp !== null && timestamp >= cutoff;
  };
}

const shouldProcessMessage = createMessageGate();

module.exports = { timestampSeconds, createMessageGate, shouldProcessMessage };
