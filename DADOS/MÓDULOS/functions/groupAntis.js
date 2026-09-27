const antiManager = require("./antiManager");
const { isAntispamAtivo, verificarSpam } = require("./antispam");
const autoban = require("./groupAutoban");
const ui = require("./ui");
const { isOwner, isAdminParticipant, participantMatches, senderCandidates } = require("./permissions");
const { unwrapMessage } = require("./messageText");

function containsLink(text) {
  return /(https?:\/\/[^\s]+|www\.[^\s]+|[a-zA-Z0-9-]+\.(com|br|net|org|gov|edu|info|io|app|club|xyz|site|online|store|tech|live|link|me|co|us|uk|de|fr|jp|ru|in|com\.br|org\.br|net\.br|gov\.br|edu\.br))/i.test(text || "");
}

async function ordinaryMember(conn, msg, from) {
  const metadata = await conn.groupMetadata(from);
  const member = (metadata.participants || []).find(item =>
    participantMatches(item, senderCandidates(msg)));
  return { metadata, member: member && !isAdminParticipant(member) && !isOwner(msg) && !msg.key?.fromMe ? member : null };
}

async function enforce(conn, msg, from, metadata, member, reason, title, extraRows = []) {
  const deleted = await conn.sendMessage(from, { delete: msg.key })
    .then(() => true, () => false);
  const result = await autoban.tryAutoban(conn, { from, msg, metadata, participant: member });
  if (result.enabled && !result.protected && !result.pending) {
    await conn.sendMessage(from, {
      text: autoban.card(result, reason),
      ...(result.jid ? { mentions: [result.jid] } : {}),
    });
  } else if (!result.enabled) {
    await conn.sendMessage(from, {
      text: ui.adminCard(title, [
        ui.adminRow("🚫", "Mensagem", ui.smallcaps(
          deleted ? "removida" : "não foi possível remover")),
        ...extraRows,
      ]),
    });
  }
  return true;
}

async function moderateLegacyAnti(conn, msg, from, { text, interactiveReply = false } = {}) {
  if (!from.endsWith("@g.us") || msg.key?.fromMe) return false;
  const body = unwrapMessage(msg);
  const checks = [
    ["link", Boolean(text && !interactiveReply && containsLink(text))],
    ["documento", Boolean(body.documentMessage)],
    ["imagem", Boolean(body.imageMessage)],
    ["video", Boolean(body.videoMessage)],
    ["audio", Boolean(body.audioMessage)],
  ];
  const violation = checks.find(([type, hit]) => hit && antiManager.isAntiAtivo(from, type));
  if (!violation) return false;
  const { metadata, member } = await ordinaryMember(conn, msg, from);
  if (!member) return false;
  return enforce(conn, msg, from, metadata, member,
    `anti ${violation[0]}`, `Anti ${violation[0]}`);
}

async function moderateSpam(conn, msg, from, { text, prefix = "." } = {}) {
  if (!from.endsWith("@g.us") || !text || text.startsWith(prefix) ||
      !isAntispamAtivo(from) || msg.key?.fromMe) return false;
  const { metadata, member } = await ordinaryMember(conn, msg, from);
  if (!member) return false;
  const sender = member.id || member.jid || member.lid || senderCandidates(msg)[0];
  const spam = verificarSpam(sender, from, 5, 5);
  if (!spam.isSpam) return false;
  return enforce(conn, msg, from, metadata, member, "spam de mensagens", "Anti-spam", [
    ui.adminRow("⚠️", "Avisos", `${spam.warnings}/3`),
    ui.adminRow("⏱️", "Estado", ui.smallcaps(
      spam.shouldExpel ? "limite atingido; autoban desligado" : "pausa temporária")),
  ]);
}

module.exports = { moderateLegacyAnti, moderateSpam };
