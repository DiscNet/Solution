function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function senderLabel(value) {
  const number = digits(value);
  if (!number) return "unknown";
  if (number.length <= 8) return number;
  return `${number.slice(0, 4)}...${number.slice(-4)}`;
}

function durationLabel(ms) {
  const value = Math.max(0, Number(ms) || 0);
  if (value < 1000) return `${Math.round(value)}ms`;
  return `${(value / 1000).toFixed(value < 10000 ? 2 : 1)}s`;
}

function errorCode(error, fallback = "ERR_RUNTIME") {
  const raw = error?.code || error?.name || fallback;
  return String(raw || fallback)
    .replace(/[^a-zA-Z0-9_:-]/g, "_")
    .toUpperCase()
    .slice(0, 64);
}

function command({ name, sender, durationMs, status = "ok", code = null }) {
  const suffix = code ? ` | ${code}` : "";
  console.log(`[CMD] ${name || "unknown"} | ${senderLabel(sender)} | ${durationLabel(durationMs)} | ${status}${suffix}`);
}

function error({ scope = "runtime", name = null, sender = null, error: err = null, code = null }) {
  const resolvedCode = code || errorCode(err);
  const commandPart = name ? ` ${name}` : "";
  const senderPart = sender ? ` | ${senderLabel(sender)}` : "";
  const detail = String(err?.message || "").replace(/[\r\n]+/g, " ").slice(0, 180);
  console.error(`[ERROR]${commandPart} | ${resolvedCode}${senderPart}${detail ? ` | ${detail}` : ""} | ${scope}`);
  return resolvedCode;
}

function connection(message) {
  console.log(`[CONN] ${String(message || "")}`);
}

function warn(message) {
  console.warn(`[WARN] ${String(message || "")}`);
}

module.exports = {
  digits,
  senderLabel,
  durationLabel,
  errorCode,
  command,
  error,
  connection,
  warn
};
