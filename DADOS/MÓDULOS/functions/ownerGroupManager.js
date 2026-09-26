const config = require("../../config/config");
const {
  isOwner,
  sameIdentity,
  isAdminParticipant,
  participantMatches,
  senderCandidates,
} = require("./permissions");

const NEWSLETTER_JID = "120363426698503859@newsletter";
const NEWSLETTER_MESSAGE_ID = 116;

function newsletterContext() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: NEWSLETTER_JID,
      newsletterName: config.botName || "GrimmJow-WA",
      serverMessageId: NEWSLETTER_MESSAGE_ID,
    },
  };
}

function normalizeGroupId(value) {
  let raw = String(value || "").trim();
  if (/^\d+(?:-\d+)?$/.test(raw)) raw += "@g.us";
  if (!/^\d+(?:-\d+)?@g\.us$/.test(raw)) return null;
  return raw;
}

function groupNumber(groupId) {
  return String(groupId || "").replace(/@g\.us$/, "");
}

function participantValues(participant) {
  return [
    participant?.id,
    participant?.jid,
    participant?.lid,
    participant?.phoneNumber,
  ].filter(Boolean);
}

function participantIdentity(participant) {
  return (
    participant?.id ||
    participant?.jid ||
    participant?.lid ||
    participant?.phoneNumber ||
    null
  );
}

function findParticipant(metadata, candidates = []) {
  const list = Array.isArray(metadata?.participants) ? metadata.participants : [];
  return list.find((p) => participantMatches(p, candidates)) || null;
}

function botCandidates(conn) {
  return [conn?.user?.id, conn?.user?.lid].filter(Boolean);
}

function ownerCandidates() {
  const number = String(config.ownerNumber || "").replace(/\D/g, "");
  return [
    config.ownerLid,
    number ? `${number}@s.whatsapp.net` : null,
  ].filter(Boolean);
}

function botParticipant(metadata, conn) {
  return findParticipant(metadata, botCandidates(conn));
}

function ownerParticipant(metadata) {
  return findParticipant(metadata, ownerCandidates());
}

function senderParticipant(metadata, msg) {
  return findParticipant(metadata, senderCandidates(msg));
}

function botIsAdmin(metadata, conn) {
  return isAdminParticipant(botParticipant(metadata, conn));
}

function ownerIsAdmin(metadata) {
  return isAdminParticipant(ownerParticipant(metadata));
}

function isProtectedParticipant(participant, conn) {
  const values = participantValues(participant);
  if (!values.length) return false;

  if (
    values.some((value) =>
      botCandidates(conn).some((candidate) => sameIdentity(value, candidate)),
    )
  ) return true;

  return values.some((value) =>
    ownerCandidates().some((candidate) => sameIdentity(value, candidate)),
  );
}

function ensureOwner(msg) {
  return isOwner(msg);
}

async function fetchGroups(conn) {
  const raw = await conn.groupFetchAllParticipating();
  return Object.values(raw || {})
    .filter((group) => normalizeGroupId(group?.id))
    .sort((a, b) => {
      const aa = String(a?.subject || "").trim();
      const bb = String(b?.subject || "").trim();
      return aa.localeCompare(bb, "pt-BR", { sensitivity: "base" }) ||
        String(a.id).localeCompare(String(b.id));
    });
}

function resolveGroup(groups, value) {
  const query = String(value || "").trim();
  if (!query) return { group: null, reason: "missing" };

  const direct = normalizeGroupId(query);
  if (direct && (query.includes("@") || query.length >= 10)) {
    const group = groups.find((item) => item.id === direct) || null;
    return { group, reason: group ? "id" : "not-found" };
  }

  if (/^\d+$/.test(query)) {
    const index = Number(query);
    if (Number.isSafeInteger(index) && index >= 1 && index <= groups.length) {
      return { group: groups[index - 1], reason: "index", index };
    }
  }

  const normalized = query.toLocaleLowerCase("pt-BR");
  const matches = groups.filter((item) =>
    String(item.subject || "")
      .toLocaleLowerCase("pt-BR")
      .includes(normalized),
  );

  if (matches.length === 1) return { group: matches[0], reason: "name" };
  if (matches.length > 1) return { group: null, reason: "ambiguous", matches };
  return { group: null, reason: "not-found" };
}

function groupStats(metadata, conn) {
  const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
  return {
    members: participants.length,
    admins: participants.filter(isAdminParticipant).length,
    botAdmin: botIsAdmin(metadata, conn),
    ownerAdmin: ownerIsAdmin(metadata),
    closed: Boolean(metadata?.announce),
    restricted: Boolean(metadata?.restrict),
  };
}

function readableError(error, action = "executar a ação") {
  const message = String(error?.message || error?.data || "").toLowerCase();
  const status = error?.output?.statusCode || error?.statusCode || error?.data;

  if (status === 403 || message.includes("403") || message.includes("not-authorized")) {
    return `❌ Não foi possível ${action}: o bot não tem permissão suficiente no grupo.`;
  }
  if (status === 404 || message.includes("404") || message.includes("not found")) {
    return "❌ Grupo não encontrado ou o bot não participa mais dele.";
  }
  if (status === 429 || message.includes("429") || message.includes("rate")) {
    return "❌ O WhatsApp limitou temporariamente essa operação. Tente novamente mais tarde.";
  }
  if (message.includes("privacy")) {
    return `❌ Não foi possível ${action} por causa das configurações de privacidade do participante.`;
  }
  if (message.includes("already")) {
    return "ℹ️ Essa alteração já está aplicada.";
  }
  return `❌ Não foi possível ${action}.`;
}

module.exports = {
  NEWSLETTER_JID,
  NEWSLETTER_MESSAGE_ID,
  newsletterContext,
  normalizeGroupId,
  groupNumber,
  participantValues,
  participantIdentity,
  findParticipant,
  botCandidates,
  ownerCandidates,
  botParticipant,
  ownerParticipant,
  senderParticipant,
  botIsAdmin,
  ownerIsAdmin,
  isProtectedParticipant,
  ensureOwner,
  fetchGroups,
  resolveGroup,
  groupStats,
  readableError,
};
