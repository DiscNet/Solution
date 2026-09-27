const state = require("./adminState");
const ui = require("./ui");
const { isOwner, isAdminParticipant, participantMatches, botIdentityCandidates, sameIdentity } = require("./permissions");
const { removeMember } = require("./groupAutoban");

function normalizeWords(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u200b-\u200d\ufeff]/gi, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function blockedWord(text, words) {
  const haystack = ` ${normalizeWords(text)} `;
  if (haystack === "  ") return null;
  return (Array.isArray(words) ? words : []).find(word => {
    const needle = normalizeWords(word);
    return needle && haystack.includes(` ${needle} `);
  }) || null;
}

function participantIds(participant) {
  if (typeof participant === "string") return [participant];
  return [...new Set([
    participant?.phoneNumber, participant?.jid, participant?.id, participant?.lid,
    participant?.participant, participant?.participantPn,
  ].filter(id => typeof id === "string" && id.includes("@")))];
}

function findBlacklisted(groupId, candidates) {
  const ids = (Array.isArray(candidates) ? candidates : [candidates]).filter(Boolean);
  if (!ids.length) return null;
  return (state.groupSettings(groupId).blacklist || []).find(entry =>
    Array.isArray(entry?.ids) && entry.ids.some(id => ids.some(candidate => sameIdentity(id, candidate)))) || null;
}

async function rejectBlacklistedEntrants(conn, update) {
  const { id: from, action } = update || {};
  if (typeof from !== "string" || !from.endsWith("@g.us") ||
      !Array.isArray(update.participants) || !update.participants.length) return update;
  if (action !== "add" && action !== "remove") return update;
  if (!(state.groupSettings(from).blacklist || []).length) return update;

  let metadata;
  if (action === "add") {
    try { metadata = await conn.groupMetadata(from); }
    catch (error) { console.error("Não foi possível consultar o grupo para a lista negra:", error); }
  }
  const allowed = [];
  for (const entrant of update.participants) {
    const ids = participantIds(entrant);
    const member = (metadata?.participants || []).find(item => participantMatches(item, ids));
    const allIds = [...new Set([...ids, ...participantIds(member)])];
    const entry = findBlacklisted(from, allIds);
    if (!entry) { allowed.push(entrant); continue; }
    const protectedMember = isAdminParticipant(member) || isAdminParticipant(entrant) ||
      allIds.some(jid => isOwner({ key: { remoteJid: jid } })) ||
      allIds.some(jid => botIdentityCandidates(conn).some(bot => sameIdentity(jid, bot)));
    if (protectedMember) { allowed.push(entrant); continue; }
    // Um evento de saída disparado pela expulsão não deve gerar mensagem de despedida.
    if (action === "remove") continue;

    const target = member || (typeof entrant === "string" ? { id: entrant } : {
      ...entrant, id: entrant.id || entrant.participant,
      phoneNumber: entrant.phoneNumber || entrant.participantPn,
    });
    const result = await removeMember(conn, {
      from, metadata, participant: target, reason: "retorno de membro da lista negra", command: "listanegra",
    });
    if (!result.pending) {
      const card = ui.adminCard("Lista negra", [
        ui.adminRow("👤", "Membro", result.jid ? `@${result.jid.split("@")[0]}` : ui.smallcaps("identidade indisponível")),
        ui.adminRow(result.removed ? "✅" : "⚠️", "Entrada", ui.smallcaps(result.removed ? "bloqueada e membro removido" : result.error || "remoção em andamento")),
      ]);
      await conn.sendMessage(from, { text: card, ...(result.jid ? { mentions: [result.jid] } : {}) })
        .catch(error => console.error("Falha ao avisar sobre a lista negra:", error));
    }
  }
  return { ...update, participants: allowed };
}

module.exports = { normalizeWords, blockedWord, participantIds, findBlacklisted, rejectBlacklistedEntrants };
