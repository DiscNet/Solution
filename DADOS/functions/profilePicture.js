const NodeCache = require("node-cache");
const { unwrapMessage } = require("./messageText");
const { findParticipant, participantValues } = require("./ownerGroupManager");

const cache = new NodeCache({ stdTTL: 1800, checkperiod: 60, useClones: false });

function unique(values = []) {
  return [...new Set(values.filter(Boolean).map((value) => String(value).trim()).filter(Boolean))];
}

function normalizeJid(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d+(?::\d+)?@(s\.whatsapp\.net|lid)$/i.test(raw)) return raw;
  const number = raw.replace(/\D/g, "");
  return number.length >= 8 && number.length <= 15 ? `${number}@s.whatsapp.net` : raw;
}

function messageContext(msg) {
  const message = unwrapMessage(msg);
  for (const value of Object.values(message || {})) {
    if (value && typeof value === "object" && value.contextInfo) return value.contextInfo;
  }
  return {};
}

function senderCandidates(msg, from = "") {
  const key = msg?.key || {};
  return unique([
    key.participantAlt,
    key.participant,
    !String(from).endsWith("@g.us") ? key.remoteJidAlt : null,
    !String(from).endsWith("@g.us") ? key.remoteJid : null,
  ]).map(normalizeJid).filter(Boolean);
}

function targetCandidates(msg, from = "", explicit = []) {
  const explicitTargets = unique(explicit.map(normalizeJid).filter(Boolean));
  if (explicitTargets.length) return explicitTargets;

  const ctx = messageContext(msg);
  const mentioned = unique(ctx?.mentionedJid || []).map(normalizeJid).filter(Boolean);
  if (mentioned.length) return mentioned;

  const quoted = ctx?.quotedMessage
    ? unique([ctx.participantAlt, ctx.participant]).map(normalizeJid).filter(Boolean)
    : [];
  if (quoted.length) return quoted;

  return senderCandidates(msg, from);
}

async function enrichWithGroup(conn, from, candidates = []) {
  let result = unique(candidates);
  if (!String(from || "").endsWith("@g.us")) return result;

  try {
    const metadata = await conn.groupMetadata(from);
    const participant = findParticipant(metadata, result);
    if (participant) {
      result = unique([
        ...result,
        ...participantValues(participant).map(normalizeJid).filter(Boolean),
      ]);
    }
  } catch (_) {}

  return result;
}

function cacheKey(jid) {
  return String(jid || "").trim();
}

/**
 * Mesmo mecanismo funcional usado pela Tokito V10:
 * socket.profilePictureUrl(jid, "image"), com tentativa de JID alternativo.
 * Não usa API externa, preview nem consulta IQ manual.
 */
async function getProfilePicture(conn, candidates = [], options = {}) {
  if (typeof conn?.profilePictureUrl !== "function") return options.fallback || null;

  const ordered = unique(candidates.map(normalizeJid).filter(Boolean));

  for (const jid of ordered) {
    const key = cacheKey(jid);
    const cached = cache.get(key);
    if (cached) return { url: cached, jid, source: "cache" };

    try {
      const url = await conn.profilePictureUrl(jid, "image");
      if (url) {
        cache.set(key, url);
        return { url, jid, source: "whatsapp" };
      }
    } catch (_) {
      // Sem foto, foto privada ou JID não aceito: tenta o próximo alvo.
    }
  }

  return options.fallback
    ? { url: options.fallback, jid: ordered[0] || null, source: "fallback" }
    : null;
}

async function getMessageProfilePicture(conn, msg, from, explicit = [], options = {}) {
  let candidates = targetCandidates(msg, from, explicit);
  candidates = await enrichWithGroup(conn, from, candidates);
  return getProfilePicture(conn, candidates, options);
}

function clearProfilePictureCache(jid = null) {
  if (!jid) {
    cache.flushAll();
    return;
  }
  cache.del(cacheKey(jid));
}

module.exports = {
  normalizeJid,
  messageContext,
  senderCandidates,
  targetCandidates,
  enrichWithGroup,
  getProfilePicture,
  getMessageProfilePicture,
  clearProfilePictureCache,
};