const fs = require("fs");
const path = require("path");

const RPG_DB = path.join(__dirname, "..", "database", "rpg.json");

function candidates(msg, from = "") {
  const key = msg?.key || {};
  const values = [
    key.participant,
    key.participantAlt,
    !String(from).endsWith("@g.us") ? key.remoteJid : null,
    !String(from).endsWith("@g.us") ? key.remoteJidAlt : null,
  ].filter(Boolean);
  return [...new Set(values)];
}

function readUsers() {
  try {
    const data = JSON.parse(fs.readFileSync(RPG_DB, "utf8"));
    return data?.usuarios && typeof data.usuarios === "object" ? data.usuarios : {};
  } catch (_) {
    return {};
  }
}

function resolveRegisteredKey(msg, from = "", users = null) {
  const source = users || readUsers();
  return candidates(msg, from).find((jid) => source[jid]) || null;
}

function normalizeMessageIdentity(msg, from = "") {
  if (!msg?.key) return null;
  const registered = resolveRegisteredKey(msg, from);
  if (!registered) return null;

  // Os módulos antigos do RPG usam exclusivamente msg.key.participant.
  // Mantemos participantAlt intacto e fazemos participant apontar para a
  // chave que já existe no banco, independentemente de a mensagem chegar
  // em modo LID ou PN no Baileys 7.
  msg.key.participant = registered;
  return registered;
}

module.exports = {
  RPG_DB,
  candidates,
  readUsers,
  resolveRegisteredKey,
  normalizeMessageIdentity,
};
