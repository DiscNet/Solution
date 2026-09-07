const state = require("./adminState");
const h = require("./adminHelpers");
const {
  isOwner,
  isAdminParticipant,
  sameIdentity,
  senderCandidates,
} = require("./permissions");
const ui = require("./ui");
const cooldowns = new Map();
const slow = new Map();
const stats = new Map();
const errors = [];
function sweep(map, now) {
  if (map.size > 20000) for (const [k, v] of map) if (v <= now) map.delete(k);
}
function record(name, status, ms) {
  const s = stats.get(name) || { ok: 0, error: 0, denied: 0, ms: 0 };
  s[status] = (s[status] || 0) + 1;
  s.ms += ms;
  stats.set(name, s);
  if (status === "error") {
    errors.unshift({ name, at: new Date().toISOString() });
    errors.length = Math.min(errors.length, 30);
  }
}
function identities(msg, metadata) {
  const list = senderCandidates(msg).filter((j) => !j.endsWith("@g.us"));
  const p = metadata?.participants?.find((p) =>
    h.values(p).some((v) => list.some((j) => sameIdentity(v, j))),
  );
  return p ? [...new Set([...list, ...h.values(p)])] : list;
}
async function commandDenial({ conn, msg, from, command, permission }) {
  if (permission.owner || isOwner(msg)) return null;
  const g = state.globalSettings();
  const local = state.groupSettings(from);
  const name = command.name.toLowerCase();
  let metadata = permission.metadata;
  if (
    from.endsWith("@g.us") &&
    !metadata &&
    Object.keys(g.blockedUsers || {}).length
  )
    metadata = await conn.groupMetadata(from);
  const ids = identities(msg, metadata);
  if (
    ids.some((id) =>
      Object.keys(g.blockedUsers || {}).some((v) => sameIdentity(v, id)),
    )
  )
    return "Seu acesso aos comandos do bot está bloqueado.";
  if (g.mode === "pausado") return g.pauseMessage || "Bot pausado pelo dono.";
  if (g.mode === "grupos" && !from.endsWith("@g.us"))
    return "O bot está disponível apenas em grupos.";
  if (g.mode === "pv" && from.endsWith("@g.us"))
    return "O bot está disponível apenas no privado.";
  if (
    g.allowlistEnabled &&
    from.endsWith("@g.us") &&
    !(g.allowedGroups || []).includes(from)
  )
    return "Grupo não autorizado pelo dono.";
  if (require("./maintenance").list().includes(name))
    return "Comando em manutenção.";
  if (
    from.endsWith("@g.us") &&
    !command.permissions?.admin &&
    !command.permissions?.owner
  ) {
    const blocked = require("./blockcmd").loadConfig(true)[from] || {};
    const aliases = [
      name,
      ...(command.aliases || []),
      ...(Array.isArray(command.alias) ? command.alias : []),
    ];
    if (
      blocked.bloquearTodos ||
      (blocked.bloqueados || []).some((n) => aliases.includes(n))
    )
      return "Comando bloqueado neste grupo.";
  }
  if ((g.disabled || []).includes(name)) return "Comando desativado pelo dono.";
  if (!command.permissions?.admin && !command.permissions?.owner) {
    if (local.commandsAdminOnly) {
      metadata ||= await conn.groupMetadata(from);
      const admin = metadata.participants.some(
        (p) =>
          isAdminParticipant(p) &&
          h
            .values(p)
            .some((v) => senderCandidates(msg).some((s) => sameIdentity(s, v))),
      );
      if (!admin)
        return "Neste grupo, apenas administradores podem usar comandos.";
    }
    const seconds = Math.max(
      Number(g.cooldowns?.[name]) || 0,
      Number(local.cooldowns?.[name]) || 0,
      Number(g.defaultCooldown) || 0,
    );
    if (seconds) {
      if (from.endsWith("@g.us")) metadata ||= await conn.groupMetadata(from);
      const cooldownIds = identities(msg, metadata);
      const who = cooldownIds.find((j) => j.endsWith("@lid")) || cooldownIds[0];
      const k = from + "|" + who + "|" + name;
      const now = Date.now();
      const until = cooldowns.get(k) || 0;
      if (until > now)
        return `Aguarde ${Math.ceil((until - now) / 1000)}s para usar esse comando.`;
      cooldowns.set(k, now + seconds * 1000);
      sweep(cooldowns, now);
    }
  }
  return null;
}
async function moderateMessage(conn, msg, from, text) {
  if (!from.endsWith("@g.us") || isOwner(msg) || msg.key?.fromMe) return false;
  const g = state.groupSettings(from);
  const filters = g.filters || {};
  if (
    !Object.keys(g.mutes || {}).length &&
    !Object.values(filters).some(Boolean) &&
    !g.slowmode
  )
    return false;
  const metadata = await conn.groupMetadata(from);
  const ids = identities(msg, metadata);
  const p = metadata.participants.find((p) =>
    h.values(p).some((v) => ids.some((id) => sameIdentity(v, id))),
  );
  if (!p || isAdminParticipant(p)) return false;
  const bot = metadata.participants.find((p) =>
    h
      .values(p)
      .some((v) =>
        [conn.user?.id, conn.user?.lid].some((id) => sameIdentity(v, id)),
      ),
  );
  if (!isAdminParticipant(bot)) return false;
  const now = Date.now();
  let reason = "";
  const mute = Object.entries(g.mutes || {}).find(
    ([jid, until]) => until > now && ids.some((id) => sameIdentity(id, jid)),
  );
  if (mute) reason = "silenciamento temporário";
  const b = h.body(msg),
    c = h.context(msg);
  const tests = {
    sticker: !!b.stickerMessage,
    contato: !!(b.contactMessage || b.contactsArrayMessage),
    localizacao: !!(b.locationMessage || b.liveLocationMessage),
    enquete: !!(
      b.pollCreationMessage ||
      b.pollCreationMessageV2 ||
      b.pollCreationMessageV3
    ),
    encaminhado: !!c.isForwarded,
    mencao: (c.mentionedJid?.length || 0) > (filters.mencao || 0),
    longo: (text?.length || 0) > (filters.longo || 0),
  };
  for (const [name, hit] of Object.entries(tests))
    if (filters[name] && hit) reason = "filtro " + name;
  const k = from + "|" + h.identity(p);
  if (g.slowmode && text) {
    if ((slow.get(k) || 0) > now) reason = "modo lento";
    else {
      slow.set(k, now + g.slowmode * 1000);
      sweep(slow, now);
    }
  }
  if (!reason) return false;
  await conn.sendMessage(from, { delete: msg.key });
  return true;
}
module.exports = {
  commandDenial,
  moderateMessage,
  record,
  stats,
  errors,
  cooldowns,
  slow,
  identities,
};
