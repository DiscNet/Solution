const config = require("../../config/config");

function digits(value) {
  return String(value || "").replace(/\D/g, "");
}

function jidNumber(value) {
  const raw = String(value || "").split("@")[0].split(":")[0];
  return digits(raw);
}

function sameIdentity(a, b) {
  const aa = String(a || "");
  const bb = String(b || "");
  if (!aa || !bb) return false;
  if (aa === bb) return true;
  const da = aa.split("@")[1], db = bb.split("@")[1];
  if (da && db && da !== db) return false;
  const ad = jidNumber(aa);
  const bd = jidNumber(bb);
  return Boolean(ad && bd && ad === bd);
}

function senderCandidates(msg) {
  return [
    msg?.key?.participant,
    msg?.key?.participantAlt,
    ...(!isGroupJid(msg?.key?.remoteJid) ? [msg?.key?.remoteJid, msg?.key?.remoteJidAlt] : [])
  ].filter(Boolean);
}

function isOwner(msg) {
  const owners = [config.ownerLid, config.ownerNumber && `${digits(config.ownerNumber)}@s.whatsapp.net`].filter(Boolean);
  return senderCandidates(msg).some(sender => owners.some(owner => sameIdentity(sender, owner)));
}

function isGroupJid(jid) {
  return typeof jid === "string" && jid.endsWith("@g.us");
}

function isAdminParticipant(participant) {
  return participant?.admin === "admin" || participant?.admin === "superadmin" || participant?.admin === true;
}

function participantMatches(participant, candidates) {
  const values = [participant?.id, participant?.jid, participant?.lid, participant?.phoneNumber].filter(Boolean);
  return values.some(value => candidates.some(candidate => sameIdentity(value, candidate)));
}

function botIdentityCandidates(conn) {
  return [
    conn?.user?.id,
    conn?.user?.lid,
    config.botLid,
    config.pairingNumber && `${digits(config.pairingNumber)}@s.whatsapp.net`,
  ].filter(Boolean);
}

function ownerDeletingBotMessage({ conn, msg, command, group, owner }) {
  if (!group || !owner || command?.name !== "apagarmensagem") return false;
  const { context } = require("./adminHelpers");
  const quoted = context(msg);
  if (!quoted.stanzaId || !quoted.quotedMessage || !quoted.participant) return false;
  return botIdentityCandidates(conn)
    .some(botJid => sameIdentity(quoted.participant, botJid));
}

async function checkCommandPermissions({ conn, msg, command, from }) {
  const permissions = command?.permissions || {};
  const group = isGroupJid(from);
  const owner = isOwner(msg);

  if (permissions.owner && !owner) return { ok: false, code: "OWNER_ONLY" };
  if (permissions.group && !group) return { ok: false, code: "GROUP_ONLY" };
  if (permissions.private && group) return { ok: false, code: "PRIVATE_ONLY" };

  // O autor pode excluir uma mensagem própria sem ser administrador.
  // No caso do bot, essa exceção é concedida somente ao dono.
  if (ownerDeletingBotMessage({ conn, msg, command, group, owner })) {
    return { ok: true, owner, group, metadata: null };
  }

  if (!permissions.admin && !permissions.botAdmin) {
    return { ok: true, owner, group, metadata: null };
  }

  if (!group) return { ok: false, code: "GROUP_ONLY" };

  let metadata;
  try {
    metadata = await conn.groupMetadata(from);
  } catch (error) {
    error.code = error.code || "ERR_GROUP_METADATA";
    throw error;
  }

  const participants = Array.isArray(metadata?.participants) ? metadata.participants : [];
  const actorCandidates = senderCandidates(msg);
  const actor = participants.find(item => participantMatches(item, actorCandidates));

  // O dono pode administrar comandos administrativos sem precisar ocupar o cargo de admin.
  // Isso não ignora botAdmin: o bot ainda precisa ter permissão real para alterar o grupo.
  if (permissions.admin && !owner && !isAdminParticipant(actor)) {
    return { ok: false, code: "ADMIN_ONLY", metadata };
  }

  if (permissions.botAdmin) {
    const botCandidates = botIdentityCandidates(conn);
    const bot = participants.find(item => participantMatches(item, botCandidates));
    if (!isAdminParticipant(bot)) return { ok: false, code: "BOT_ADMIN_REQUIRED", metadata };
  }

  return { ok: true, owner, group, metadata };
}

module.exports = {
  digits,
  jidNumber,
  sameIdentity,
  senderCandidates,
  isOwner,
  isGroupJid,
  isAdminParticipant,
  checkCommandPermissions,
  participantMatches,
  botIdentityCandidates
};
