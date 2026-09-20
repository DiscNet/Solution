const names = new Map();
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

function cleanName(value) {
  const name = String(value || "")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s{2,}/g, " ")
    .trim()
    .slice(0, 80);

  if (!name) return "";
  const compact = name.replace(/[\s()+\-.]/g, "");
  if (/^\d{6,}$/.test(compact)) return "";
  if (/^\d+@(s\.whatsapp\.net|lid|g\.us)$/i.test(name)) return "";
  return name;
}

function normalizeJid(value) {
  const jid = String(value || "").trim();
  return jid.includes("@") ? jid : "";
}

function remember(jids, name) {
  const clean = cleanName(name);
  if (!clean) return "";

  const values = [...new Set(
    (Array.isArray(jids) ? jids : [jids])
      .map(normalizeJid)
      .filter(Boolean)
  )];

  const entry = { name: clean, at: Date.now() };
  for (const jid of values) names.set(jid, entry);
  return clean;
}

function rememberContact(contact) {
  if (!contact || typeof contact !== "object") return "";
  const name =
    contact.pushName ||
    contact.pushname ||
    contact.notify ||
    contact.name ||
    contact.verifiedName;
  return remember([
    contact.id,
    contact.jid,
    contact.lid,
    contact.phoneNumber,
  ], name);
}

function rememberContacts(contacts) {
  for (const contact of contacts || []) rememberContact(contact);
}

function rememberMessage(msg) {
  if (!msg || typeof msg !== "object") return "";
  const name = msg.pushName || msg.pushname || msg.notify;
  return remember([
    msg.key?.participant,
    msg.key?.participantAlt,
    !String(msg.key?.remoteJid || "").endsWith("@g.us") ? msg.key?.remoteJid : "",
    !String(msg.key?.remoteJidAlt || "").endsWith("@g.us") ? msg.key?.remoteJidAlt : "",
  ], name);
}

function get(candidates) {
  const now = Date.now();
  for (const jid of candidates || []) {
    const entry = names.get(normalizeJid(jid));
    if (!entry) continue;
    if (now - entry.at > MAX_AGE_MS) {
      names.delete(jid);
      continue;
    }
    if (entry.name) return entry.name;
  }
  return "";
}

async function waitFor(candidates, timeoutMs = 1400, intervalMs = 175) {
  const end = Date.now() + Math.max(0, timeoutMs);
  let found = get(candidates);
  while (!found && Date.now() < end) {
    await new Promise(resolve => setTimeout(resolve, intervalMs));
    found = get(candidates);
  }
  return found;
}

function clear() {
  names.clear();
}

module.exports = {
  cleanName,
  remember,
  rememberContact,
  rememberContacts,
  rememberMessage,
  get,
  waitFor,
  clear,
  _names: names,
};
