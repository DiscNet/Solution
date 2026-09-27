const state = require("./adminState");
const ui = require("./ui");
const modLog = require("./modLog");
const {
  isAdminParticipant,
  isOwner,
  participantMatches,
  senderCandidates,
  botIdentityCandidates,
} = require("./permissions");

const removals = new Set();

function isEnabled(groupId) {
  return state.groupSettings(groupId).autoban === true;
}

function actionJids(participant) {
  const ids = [...new Set([
    participant?.phoneNumber, participant?.jid, participant?.id, participant?.lid,
  ].filter(value => typeof value === "string" && value.includes("@")))];
  return [
    ...ids.filter(id => id.endsWith("@s.whatsapp.net")),
    ...ids.filter(id => id.endsWith("@lid")),
    ...ids.filter(id => !id.endsWith("@s.whatsapp.net") && !id.endsWith("@lid")),
  ];
}

function confirmed(results) {
  return !Array.isArray(results) || !results.length ||
    results.every(item => ["", "200"].includes(String(item?.status ?? "")));
}

async function removeMember(conn, { from, msg, metadata, participant, reason, command } = {}) {
  const group = metadata || await conn.groupMetadata(from);
  const members = Array.isArray(group?.participants) ? group.participants : [];
  const target = participant || members.find(item =>
    participantMatches(item, senderCandidates(msg)));
  const botIds = botIdentityCandidates(conn);

  if (!target || isAdminParticipant(target) ||
      actionJids(target).some(id => isOwner({ key: { remoteJid: id } })) ||
      participantMatches(target, botIds) ||
      (!participant && msg?.key?.fromMe)) {
    return { enabled: true, removed: false, protected: true };
  }

  const bot = members.find(item => participantMatches(item, botIds));
  if (!isAdminParticipant(bot)) {
    return { enabled: true, removed: false, error: "o bot precisa ser administrador" };
  }

  const ids = actionJids(target);
  if (!ids.length) {
    return { enabled: true, removed: false, error: "não foi possível identificar o membro" };
  }
  const lock = `${from}:${target.id || target.jid || target.phoneNumber || target.lid}`;
  if (removals.has(lock)) return { enabled: true, removed: false, pending: true };
  removals.add(lock);
  try {
    for (const jid of ids) {
      try {
        const results = await conn.groupParticipantsUpdate(from, [jid], "remove");
        if (confirmed(results)) {
          if (command) {
            try {
              modLog.recordAutomatic({ from, target: ids[0], reason, command, bot: botIds[0] });
            } catch (error) {
              console.error("Falha ao registrar remoção automática:", error);
            }
          }
          return { enabled: true, removed: true, jid: ids[0] };
        }
      } catch (_) {
        // Tenta o telefone e o LID, quando o grupo fornece ambos.
      }
    }
    return { enabled: true, removed: false, jid: ids[0], error: "não foi possível remover o membro" };
  } finally {
    removals.delete(lock);
  }
}

async function tryAutoban(conn, options) {
  if (!isEnabled(options.from)) return { enabled: false, removed: false };
  return removeMember(conn, { ...options, command: "autoban" });
}

function card(result, reason) {
  const member = result.jid ? `@${result.jid.split("@")[0]}` : ui.smallcaps("membro");
  return ui.adminCard("Autoban", [
    ui.adminRow("👤", "Membro", member),
    ui.adminRow("🛡️", "Motivo", ui.smallcaps(reason)),
    ui.adminRow(result.removed ? "✅" : "⚠️", "Resultado",
      ui.smallcaps(result.removed ? "removido automaticamente" : result.error || "ação em andamento")),
  ]);
}

module.exports = { isEnabled, tryAutoban, removeMember, card };
